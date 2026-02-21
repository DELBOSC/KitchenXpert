/**
 * CertifiedQuotePage (F13)
 *
 * Full-featured certified quote management page with:
 * - Quote list with status badges, search, and sorting
 * - Creation form with kitchen BOM auto-fill, TVA rate selector
 * - Detail view with professional French devis layout
 * - Sign, send by email, and download PDF actions
 * - Status timeline: Draft -> Sent -> Viewed -> Signed / Expired
 * - i18n, dark mode, responsive
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

// ────────────────────────────── Types ──────────────────────────────

interface QuoteLineItem {
  ref: string;
  name: string;
  description?: string;
  qty: number;
  unitPriceHT: number;
  tvaRate: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

interface CertifiedQuote {
  id: string;
  quoteNumber: string;
  kitchenId: string;
  projectId?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  items: QuoteLineItem[];
  subtotalHT: number;
  tvaAmount: number;
  totalTTC: number;
  validityDays: number;
  validUntil: string;
  legalMentions: string;
  signatureHash?: string;
  signedAt?: string;
  signedByUserId?: string;
  pdfUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'create' | 'detail';

// ────────────────────────────── Helpers ──────────────────────────────

const formatPrice = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const formatDate = (d: string): string =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(d));

const formatShortDate = (d: string): string =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(d));

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoye',
  viewed: 'Consulte',
  signed: 'Signe',
  expired: 'Expire',
  cancelled: 'Annule',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  viewed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  signed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const TVA_RATES = [
  { value: 20, label: '20% (taux normal)' },
  { value: 10, label: '10% (taux intermediaire)' },
  { value: 5.5, label: '5,5% (taux reduit)' },
];

// ────────────────────────────── API Helpers ──────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

// ────────────────────────────── Component ──────────────────────────────

export default function CertifiedQuotePage(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();

  // State
  const [view, setView] = useState<ViewMode>('list');
  const [quotes, setQuotes] = useState<CertifiedQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<CertifiedQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');

  // Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [signing, setSigning] = useState(false);
  const [sending, setSending] = useState(false);

  // Creation form
  const [formData, setFormData] = useState({
    kitchenId: '',
    projectId: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    tvaRate: 20,
    validityDays: 30,
  });
  const [formItems, setFormItems] = useState<QuoteLineItem[]>([
    { ref: '', name: '', description: '', qty: 1, unitPriceHT: 0, tvaRate: 20, totalHT: 0, totalTVA: 0, totalTTC: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  // AbortController for fetch
  const controllerRef = useRef<AbortController | null>(null);

  // ─── Load quotes ───
  const loadQuotes = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ data: CertifiedQuote[] }>('/api/v1/certified-quotes', {
        signal: controller.signal,
      });
      setQuotes(data.data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    loadQuotes();
    return () => {
      controllerRef.current?.abort();
    };
  }, [loadQuotes]);

  // ─── Create quote ───
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const items = formItems.map((item) => ({
        ...item,
        tvaRate: item.tvaRate || formData.tvaRate,
        totalHT: item.qty * item.unitPriceHT,
        totalTVA: item.qty * item.unitPriceHT * ((item.tvaRate || formData.tvaRate) / 100),
        totalTTC: item.qty * item.unitPriceHT * (1 + (item.tvaRate || formData.tvaRate) / 100),
      }));

      const payload = {
        kitchenId: formData.kitchenId,
        projectId: formData.projectId || undefined,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail || undefined,
        clientAddress: formData.clientAddress || undefined,
        items,
        tvaRate: formData.tvaRate,
        validityDays: formData.validityDays,
      };

      await apiFetch('/api/v1/certified-quotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setView('list');
      setRetryCount((c) => c + 1);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kitchenId: '',
      projectId: '',
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      tvaRate: 20,
      validityDays: 30,
    });
    setFormItems([
      { ref: '', name: '', description: '', qty: 1, unitPriceHT: 0, tvaRate: 20, totalHT: 0, totalTVA: 0, totalTTC: 0 },
    ]);
  };

  // ─── Sign quote ───
  const handleSign = async () => {
    if (!selectedQuote) return;
    setSigning(true);
    try {
      await apiFetch(`/api/v1/certified-quotes/${selectedQuote.id}/sign`, {
        method: 'POST',
      });
      setShowSignModal(false);
      setRetryCount((c) => c + 1);
      // Reload the detail
      const data = await apiFetch<{ data: CertifiedQuote }>(
        `/api/v1/certified-quotes/${selectedQuote.id}`
      );
      setSelectedQuote(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign quote');
    } finally {
      setSigning(false);
    }
  };

  // ─── Send quote ───
  const handleSend = async () => {
    if (!selectedQuote || !sendEmail) return;
    setSending(true);
    try {
      await apiFetch(`/api/v1/certified-quotes/${selectedQuote.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ email: sendEmail }),
      });
      setShowSendModal(false);
      setSendEmail('');
      setRetryCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  // ─── Download PDF ───
  const handleDownloadPDF = async () => {
    if (!selectedQuote) return;
    try {
      const res = await fetch(`/api/v1/certified-quotes/${selectedQuote.id}/pdf`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-${selectedQuote.quoteNumber}.html`;
      document.body.appendChild(a);
      a.click();
      // Delayed revocation per project patterns
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  };

  // ─── Item management ───
  const addItem = () => {
    setFormItems((prev) => [
      ...prev,
      { ref: '', name: '', description: '', qty: 1, unitPriceHT: 0, tvaRate: formData.tvaRate, totalHT: 0, totalTVA: 0, totalTTC: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteLineItem, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        updated.totalHT = updated.qty * updated.unitPriceHT;
        updated.totalTVA = updated.totalHT * (updated.tvaRate / 100);
        updated.totalTTC = updated.totalHT + updated.totalTVA;
        return updated;
      })
    );
  };

  // ─── Filtered quotes ───
  const filteredQuotes = quotes.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Computed totals for form ───
  const formSubtotalHT = formItems.reduce((s, i) => s + i.qty * i.unitPriceHT, 0);
  const formTvaAmount = formItems.reduce(
    (s, i) => s + i.qty * i.unitPriceHT * ((i.tvaRate || formData.tvaRate) / 100),
    0
  );
  const formTotalTTC = formSubtotalHT + formTvaAmount;

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-400"
              aria-label={t('common.dismiss', 'Dismiss')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ LIST VIEW ═══════════════════ */}
      {view === 'list' && (
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('quotes.title', 'Devis certifies')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('quotes.subtitle', 'Gerez vos devis conformes a la legislation francaise')}
              </p>
            </div>
            <button
              onClick={() => setView('create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('quotes.create', 'Nouveau devis')}
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('quotes.search', 'Rechercher par numero ou client...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredQuotes.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('quotes.empty', 'Aucun devis')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('quotes.emptyHint', 'Creez votre premier devis certifie')}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && filteredQuotes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('quotes.number', 'Numero')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('quotes.date', 'Date')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('quotes.client', 'Client')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('quotes.totalTTC', 'Total TTC')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('quotes.status', 'Statut')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredQuotes.map((quote) => (
                      <tr
                        key={quote.id}
                        onClick={() => {
                          setSelectedQuote(quote);
                          setView('detail');
                        }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
                          {quote.quoteNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatShortDate(quote.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {quote.clientName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatPrice(quote.totalTTC)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status] || STATUS_COLORS.draft}`}>
                            {STATUS_LABELS[quote.status] || quote.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ CREATE VIEW ═══════════════════ */}
      {view === 'create' && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => { setView('list'); resetForm(); }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('common.back', 'Back')}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('quotes.createTitle', 'Nouveau devis certifie')}
            </h1>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Client info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('quotes.clientInfo', 'Informations client')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.kitchenId', 'ID Cuisine')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kitchenId}
                    onChange={(e) => setFormData((d) => ({ ...d, kitchenId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="uuid..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.projectId', 'ID Projet')}
                  </label>
                  <input
                    type="text"
                    value={formData.projectId}
                    onChange={(e) => setFormData((d) => ({ ...d, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="uuid... (optionnel)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.clientName', 'Nom du client')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData((d) => ({ ...d, clientName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.clientEmail', 'Email du client')}
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData((d) => ({ ...d, clientEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.clientAddress', 'Adresse du client')}
                  </label>
                  <input
                    type="text"
                    value={formData.clientAddress}
                    onChange={(e) => setFormData((d) => ({ ...d, clientAddress: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('quotes.settings', 'Parametres du devis')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.tvaRate', 'Taux de TVA par defaut')}
                  </label>
                  <select
                    value={formData.tvaRate}
                    onChange={(e) => setFormData((d) => ({ ...d, tvaRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TVA_RATES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('quotes.validity', 'Duree de validite (jours)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.validityDays}
                    onChange={(e) => setFormData((d) => ({ ...d, validityDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('quotes.items', 'Articles')}
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {t('quotes.addItem', 'Ajouter')}
                </button>
              </div>

              <div className="space-y-4">
                {formItems.map((item, index) => (
                  <div key={index} className="flex flex-wrap gap-3 items-end p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ref.</label>
                      <input
                        type="text"
                        required
                        value={item.ref}
                        onChange={(e) => updateItem(index, 'ref', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Designation</label>
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="w-16">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qte</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">P.U. HT</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        required
                        value={item.unitPriceHT}
                        onChange={(e) => updateItem(index, 'unitPriceHT', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">TVA %</label>
                      <select
                        value={item.tvaRate}
                        onChange={(e) => updateItem(index, 'tvaRate', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {TVA_RATES.map((r) => (
                          <option key={r.value} value={r.value}>{r.value}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28 text-right">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total HT</label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white py-1.5">
                        {formatPrice(item.qty * item.unitPriceHT)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={formItems.length <= 1}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-30"
                      aria-label={t('common.remove', 'Remove')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total HT</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatPrice(formSubtotalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">TVA</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatPrice(formTvaAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-900 dark:text-white">Total TTC</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatPrice(formTotalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setView('list'); resetForm(); }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {creating ? t('common.creating', 'Creation...') : t('quotes.createBtn', 'Creer le devis')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════ DETAIL VIEW ═══════════════════ */}
      {view === 'detail' && selectedQuote && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView('list'); setSelectedQuote(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('common.back', 'Back')}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                  {selectedQuote.quoteNumber}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(selectedQuote.createdAt)}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedQuote.status] || STATUS_COLORS.draft}`}>
                {STATUS_LABELS[selectedQuote.status] || selectedQuote.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedQuote.status !== 'signed' && selectedQuote.status !== 'expired' && selectedQuote.status !== 'cancelled' && (
                <button
                  onClick={() => setShowSignModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('quotes.sign', 'Signer')}
                </button>
              )}
              <button
                onClick={() => {
                  setSendEmail(selectedQuote.clientEmail || '');
                  setShowSendModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('quotes.sendEmail', 'Envoyer par email')}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('quotes.downloadPDF', 'Telecharger PDF')}
              </button>
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              {t('quotes.timeline', 'Cycle de vie')}
            </h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 dark:bg-gray-600 -translate-y-1/2 z-0" />
              {['draft', 'sent', 'viewed', 'signed'].map((step, index) => {
                const statuses = ['draft', 'sent', 'viewed', 'signed'];
                const currentIndex = statuses.indexOf(selectedQuote.status);
                const isActive = index <= currentIndex;
                const isCurrent = step === selectedQuote.status;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' :
                          isActive ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}
                    >
                      {isActive && !isCurrent ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quote content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                {t('quotes.clientInfo', 'Client')}
              </h3>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedQuote.clientName}</p>
              {selectedQuote.clientEmail && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{selectedQuote.clientEmail}</p>
              )}
              {selectedQuote.clientAddress && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{selectedQuote.clientAddress}</p>
              )}
            </div>

            {/* Validity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                {t('quotes.validity', 'Validite')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('quotes.validUntil', 'Valable jusqu\'au')}: <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedQuote.validUntil)}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {selectedQuote.validityDays} {t('quotes.days', 'jours')}
              </p>
            </div>

            {/* Totals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                {t('quotes.totals', 'Montants')}
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">HT</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(selectedQuote.subtotalHT)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">TVA</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(selectedQuote.tvaAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <span className="text-gray-900 dark:text-white">TTC</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatPrice(selectedQuote.totalTTC)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-blue-600 dark:bg-blue-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Ref.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Designation</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Qte</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">P.U. HT</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">TVA</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(selectedQuote.items as QuoteLineItem[]).map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{item.ref}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">{item.qty}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">{formatPrice(item.unitPriceHT)}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">{item.tvaRate}%</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatPrice(item.totalHT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature block */}
          {selectedQuote.signatureHash && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                {t('quotes.signedElectronically', 'Document signe electroniquement')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('quotes.signedDate', 'Date de signature')}: {selectedQuote.signedAt ? formatDate(selectedQuote.signedAt) : 'N/A'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-mono break-all">
                SHA-256: {selectedQuote.signatureHash}
              </p>
              <p className="text-xs text-green-500 dark:text-green-500 mt-2">
                {t('quotes.eidasCompliance', 'Conforme au reglement eIDAS (UE) n. 910/2014')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ SIGN MODAL ═══════════════════ */}
      {showSignModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('quotes.signTitle', 'Signer le devis')}
            </h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('quotes.signWarning',
                  'En signant ce devis, vous confirmez que toutes les informations sont exactes et vous vous engagez selon les conditions generales mentionnees. Cette action est irreversible et cree une preuve de non-repudiation conforme au reglement eIDAS.'
                )}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Devis : <strong>{selectedQuote.quoteNumber}</strong><br />
              Montant : <strong>{formatPrice(selectedQuote.totalTTC)}</strong> TTC
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {signing ? t('common.signing', 'Signature...') : t('quotes.confirmSign', 'Confirmer la signature')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ SEND MODAL ═══════════════════ */}
      {showSendModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('quotes.sendTitle', 'Envoyer le devis par email')}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('quotes.recipientEmail', 'Adresse email du destinataire')}
              </label>
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowSendModal(false); setSendEmail(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {sending ? t('common.sending', 'Envoi...') : t('quotes.confirmSend', 'Envoyer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
