import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS, API_BASE_URL } from '../../services/api/endpoints';
import type { RoomDimensions } from './DimensionWizard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DesignItem {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  material?: string;
  rotation?: number;
}

interface QuoteToPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  kitchenId: string;
  projectName: string;
  designData: {
    items: DesignItem[];
    dimensions: RoomDimensions;
    budget: number;
    style: string;
  };
}

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  specialties: string[];
  rating: number | null;
  distance: number | null;
  postalCode: string | null;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

type Timeline = '1-3months' | '3-6months' | '6-12months' | 'flexible';

type ModalStep = 'summary' | 'partner' | 'details' | 'confirm';

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchNearbyPartners(params: {
  lat?: number;
  lng?: number;
  postalCode?: string;
}): Promise<PartnerInfo[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.postalCode) query.set('postalCode', params.postalCode);

  const url = `${API_BASE_URL}${API_ENDPOINTS.QUOTES.NEARBY_PARTNERS}?${query.toString()}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch partners');
  const data = await res.json();
  return data.data || [];
}

async function sendQuoteRequest(body: {
  kitchenId: string;
  partnerId: string;
  message: string;
  timeline: Timeline;
  contactInfo: ContactInfo;
}): Promise<{ reference: string; partnerName: string }> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.QUOTES.SEND}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to send quote' }));
    throw new Error(err.error || 'Failed to send quote');
  }
  const data = await res.json();
  return {
    reference: data.data?.reference || '',
    partnerName: data.data?.partnerName || '',
  };
}

// ─── Package Summary ──────────────────────────────────────────────────────────

function PackageSummary({
  designData,
  projectName: _projectName,
  t,
}: {
  designData: QuoteToPartnerModalProps['designData'];
  projectName: string;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const packageItems = [
    { icon: 'cube', label: t('quote.package3d', '3D Model'), included: true },
    { icon: 'map', label: t('quote.packageFloorPlan', 'Floor Plan'), included: true },
    { icon: 'list', label: t('quote.packageBOM', 'Bill of Materials'), included: true },
    { icon: 'ruler', label: t('quote.packageTechnical', 'Technical Plan'), included: true },
    { icon: 'cart', label: t('quote.packageShopping', 'Shopping List'), included: true },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {t('quote.packageTitle', 'Design Package')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('quote.packageDescription', 'The following will be shared with the partner:')}
      </p>

      <div className="space-y-2 mb-6">
        {packageItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Brief stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
          <span className="block text-lg font-bold text-blue-600 dark:text-blue-400">
            {designData.items.length}
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400">
            {t('quote.itemCount', 'Items')}
          </span>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
          <span className="block text-lg font-bold text-purple-600 dark:text-purple-400">
            {designData.budget > 0 ? `${designData.budget.toLocaleString()}` : '-'}
          </span>
          <span className="text-xs text-purple-500 dark:text-purple-400">
            {t('quote.budgetLabel', 'Budget')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Partner Selection ────────────────────────────────────────────────────────

function PartnerSelection({
  partners,
  selectedPartnerId,
  onSelect,
  onSearchPostalCode,
  onFindNearest,
  isLoading,
  postalCode,
  onPostalCodeChange,
  t,
}: {
  partners: PartnerInfo[];
  selectedPartnerId: string | null;
  onSelect: (id: string) => void;
  onSearchPostalCode: () => void;
  onFindNearest: () => void;
  isLoading: boolean;
  postalCode: string;
  onPostalCodeChange: (v: string) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {t('quote.partnerTitle', 'Select a Partner')}
      </h3>

      {/* Search controls */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            placeholder={t('quote.postalCodePlaceholder', 'Postal code...')}
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          />
          <button
            onClick={onSearchPostalCode}
            disabled={isLoading || !postalCode.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50"
            aria-label={t('quote.searchPartner', 'Search')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <button
          onClick={onFindNearest}
          disabled={isLoading}
          className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('quote.findNearest', 'Find Nearest')}
          </span>
        </button>
      </div>

      {/* Partners list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('quote.noPartners', 'No partners found. Try searching by postal code or finding the nearest.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {partners.map((partner) => (
            <button
              key={partner.id}
              onClick={() => onSelect(partner.id)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                selectedPartnerId === partner.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {partner.name}
                  </span>
                  {partner.rating !== null && (
                    <span className="ml-2 text-xs text-yellow-500">
                      {'*'.repeat(Math.round(partner.rating))} {partner.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                {partner.distance !== null && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {partner.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              {partner.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {partner.specialties.slice(0, 3).map((spec) => (
                    <span
                      key={spec}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Details Form ─────────────────────────────────────────────────────────────

function DetailsForm({
  contactInfo,
  onContactChange,
  message,
  onMessageChange,
  timeline,
  onTimelineChange,
  budget,
  t,
}: {
  contactInfo: ContactInfo;
  onContactChange: (field: keyof ContactInfo, value: string) => void;
  message: string;
  onMessageChange: (v: string) => void;
  timeline: Timeline;
  onTimelineChange: (v: Timeline) => void;
  budget: number;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const timelineOptions: Array<{ value: Timeline; label: string }> = [
    { value: '1-3months', label: t('quote.timeline1to3', '1 to 3 months') },
    { value: '3-6months', label: t('quote.timeline3to6', '3 to 6 months') },
    { value: '6-12months', label: t('quote.timeline6to12', '6 to 12 months') },
    { value: 'flexible', label: t('quote.timelineFlexible', 'Flexible') },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
        {t('quote.detailsTitle', 'Your Details')}
      </h3>

      {/* Contact info */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t('quote.contactName', 'Name')}
        </label>
        <input
          type="text"
          value={contactInfo.name}
          onChange={(e) => onContactChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t('quote.contactEmail', 'Email')} *
        </label>
        <input
          type="email"
          value={contactInfo.email}
          onChange={(e) => onContactChange('email', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t('quote.contactPhone', 'Phone')}
        </label>
        <input
          type="tel"
          value={contactInfo.phone}
          onChange={(e) => onContactChange('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>

      {/* Timeline */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t('quote.timelineLabel', 'When do you want the kitchen installed?')}
        </label>
        <select
          value={timeline}
          onChange={(e) => onTimelineChange(e.target.value as Timeline)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        >
          {timelineOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Budget display */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('quote.budgetRange', 'Design Budget')}
        </span>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
          {budget > 0 ? `${budget.toLocaleString()} EUR` : t('quote.budgetNotSet', 'Not specified')}
        </p>
      </div>

      {/* Custom message */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t('quote.messageLabel', 'Additional notes for the partner')}
        </label>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          placeholder={t('quote.messagePlaceholder', 'Any special requirements, accessibility needs, preferred brands...')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Confirmation Screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
  partnerName,
  reference,
  t,
}: {
  partnerName: string;
  reference: string;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {t('quote.sent', 'Quote Request Sent!')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {t(
          'quote.sentDescription',
          `Your quote request has been sent to ${partnerName}. They will respond within 48h.`,
        )
          .replace('${partnerName}', partnerName)}
      </p>
      <div className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('quote.reference', 'Reference:')}
        </span>
        <span className="ml-1 text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">
          {reference}
        </span>
      </div>
    </div>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

export default function QuoteToPartnerModal({
  isOpen,
  onClose,
  kitchenId,
  projectName,
  designData,
}: QuoteToPartnerModalProps): React.ReactElement | null {
  const { t } = useTranslation();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal state
  const [step, setStep] = useState<ModalStep>('summary');
  const [partners, setPartners] = useState<PartnerInfo[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState('');
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({ name: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const [timeline, setTimeline] = useState<Timeline>('flexible');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ partnerName: string; reference: string } | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('summary');
      setSelectedPartnerId(null);
      setMessage('');
      setTimeline('flexible');
      setSendError(null);
      setConfirmation(null);
    }
  }, [isOpen]);

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === selectedPartnerId) || null,
    [partners, selectedPartnerId],
  );

  // Fetch partners by postal code
  const handleSearchPostalCode = useCallback(async () => {
    if (!postalCode.trim()) return;
    setIsLoadingPartners(true);
    try {
      const result = await fetchNearbyPartners({ postalCode: postalCode.trim() });
      setPartners(result);
    } catch {
      // silent
    } finally {
      setIsLoadingPartners(false);
    }
  }, [postalCode]);

  // Find nearest using geolocation
  const handleFindNearest = useCallback(async () => {
    setIsLoadingPartners(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const result = await fetchNearbyPartners({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setPartners(result);
    } catch {
      // Fallback: just get all partners
      try {
        const result = await fetchNearbyPartners({});
        setPartners(result);
      } catch {
        // silent
      }
    } finally {
      setIsLoadingPartners(false);
    }
  }, []);

  const handleContactChange = useCallback((field: keyof ContactInfo, value: string) => {
    setContactInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedPartnerId || !contactInfo.email) return;

    setIsSending(true);
    setSendError(null);

    try {
      const result = await sendQuoteRequest({
        kitchenId,
        partnerId: selectedPartnerId,
        message,
        timeline,
        contactInfo,
      });
      setConfirmation(result);
      setStep('confirm');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send quote request');
    } finally {
      setIsSending(false);
    }
  }, [selectedPartnerId, kitchenId, message, timeline, contactInfo]);

  // Navigation
  const canGoNext = useMemo(() => {
    switch (step) {
      case 'summary': return true;
      case 'partner': return !!selectedPartnerId;
      case 'details': return !!contactInfo.email.trim();
      case 'confirm': return false; // no next from confirmation
      default: return false;
    }
  }, [step, selectedPartnerId, contactInfo.email]);

  const handleNext = useCallback(() => {
    switch (step) {
      case 'summary': setStep('partner'); break;
      case 'partner': setStep('details'); break;
      case 'details': handleSend(); break;
      default: break;
    }
  }, [step, handleSend]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'partner': setStep('summary'); break;
      case 'details': setStep('partner'); break;
      default: break;
    }
  }, [step]);

  if (!isOpen) return null;

  const stepLabels: Record<ModalStep, string> = {
    summary: t('quote.stepSummary', 'Package'),
    partner: t('quote.stepPartner', 'Partner'),
    details: t('quote.stepDetails', 'Details'),
    confirm: t('quote.stepConfirm', 'Done'),
  };

  const steps: ModalStep[] = ['summary', 'partner', 'details', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('quote.title', 'Send Quote to Partner')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step progress */}
        {step !== 'confirm' && (
          <div className="px-6 py-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              {steps.slice(0, -1).map((s, idx) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1 ${idx <= currentStepIndex ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < currentStepIndex
                        ? 'bg-blue-500 text-white'
                        : idx === currentStepIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    }`}>
                      {idx < currentStepIndex ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${
                      idx <= currentStepIndex
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {stepLabels[s]}
                    </span>
                  </div>
                  {idx < steps.length - 2 && (
                    <div className={`flex-1 h-0.5 ${
                      idx < currentStepIndex
                        ? 'bg-blue-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'summary' && (
            <PackageSummary designData={designData} projectName={projectName} t={t} />
          )}
          {step === 'partner' && (
            <PartnerSelection
              partners={partners}
              selectedPartnerId={selectedPartnerId}
              onSelect={setSelectedPartnerId}
              onSearchPostalCode={handleSearchPostalCode}
              onFindNearest={handleFindNearest}
              isLoading={isLoadingPartners}
              postalCode={postalCode}
              onPostalCodeChange={setPostalCode}
              t={t}
            />
          )}
          {step === 'details' && (
            <DetailsForm
              contactInfo={contactInfo}
              onContactChange={handleContactChange}
              message={message}
              onMessageChange={setMessage}
              timeline={timeline}
              onTimelineChange={setTimeline}
              budget={designData.budget}
              t={t}
            />
          )}
          {step === 'confirm' && confirmation && (
            <ConfirmationScreen
              partnerName={confirmation.partnerName}
              reference={confirmation.reference}
              t={t}
            />
          )}
        </div>

        {/* Error */}
        {sendError && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex-shrink-0">
            <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {step === 'confirm' ? (
            <div className="w-full">
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={step === 'summary' ? onClose : handleBack}
                disabled={isSending}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {step === 'summary' ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
              </button>

              <button
                onClick={handleNext}
                disabled={!canGoNext || isSending}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {step === 'details'
                  ? t('quote.sendQuote', 'Send Quote Request')
                  : t('common.next', 'Next')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { QuoteToPartnerModal };
export type { QuoteToPartnerModalProps };
