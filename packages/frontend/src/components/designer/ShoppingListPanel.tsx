import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ─── Types ────────────────────────────────────────────────────

interface ShoppingItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  brand?: string;
}

interface ShoppingListData {
  items: ShoppingItem[];
  subtotal: number;
  tax: number;
  total: number;
}

interface ShoppingListPanelProps {
  kitchenId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Category helpers ─────────────────────────────────────────

const CATEGORY_ORDER = ['Cabinets', 'Countertops', 'Appliances', 'Accessories'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Cabinets: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  Countertops: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="8" width="20" height="3" rx="1" />
      <line x1="6" y1="11" x2="6" y2="20" />
      <line x1="18" y1="11" x2="18" y2="20" />
    </svg>
  ),
  Appliances: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <circle cx="12" cy="16" r="2" />
    </svg>
  ),
  Accessories: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

// ─── Category label helper ────────────────────────────────────

function useCategoryLabels(): Record<string, string> {
  const { t } = useTranslation();
  return {
    Cabinets: t('shopping.category.cabinets', 'Cabinets'),
    Countertops: t('shopping.category.countertops', 'Countertops'),
    Appliances: t('shopping.category.appliances', 'Appliances'),
    Accessories: t('shopping.category.accessories', 'Accessories'),
  };
}

// ─── Format price helper ──────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// ─── Component ────────────────────────────────────────────────

export default function ShoppingListPanel({ kitchenId, isOpen, onClose }: ShoppingListPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const categoryLabels = useCategoryLabels();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch shopping list ───────────────────────────
  useEffect(() => {
    if (!isOpen || !kitchenId) {return;}

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const res = await api.get<ShoppingListData>(
          API_ENDPOINTS.SHOPPING_LIST.BY_KITCHEN(kitchenId),
          { signal: controller.signal }
        );
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error?.message || t('designer.shoppingList.fetchError', 'Erreur lors du chargement'));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        setError(t('designer.shoppingList.fetchError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [isOpen, kitchenId, t]);

  // ─── Close on Escape ───────────────────────────────
  useEffect(() => {
    if (!isOpen) {return;}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ─── Group items by category ───────────────────────
  const groupedItems = useCallback((): Record<string, ShoppingItem[]> => {
    if (!data?.items) {return {};}
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of data.items) {
      const cat = item.category || 'Accessories';
      if (!groups[cat]) {groups[cat] = [];}
      groups[cat].push(item);
    }
    return groups;
  }, [data]);

  // ─── Export as PDF ─────────────────────────────────
  const handleExportPDF = useCallback(() => {
    if (!data) {return;}

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(t('shopping.pdfTitle', "Liste d'achats - KitchenXpert"), pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    let yPos = 38;

    // Items grouped by category
    const groups = groupedItems();
    const orderedCategories = CATEGORY_ORDER.filter((c) => groups[c] && groups[c].length > 0);
    const otherCategories = Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c));
    const allCategories = [...orderedCategories, ...otherCategories];

    for (const category of allCategories) {
      const items = groups[category];
      if (!items || items.length === 0) {continue;}

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(category, 14, yPos);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        head: [[t('shopping.article', 'Article'), t('shopping.brand', 'Marque'), t('shopping.qty', 'Qte'), t('shopping.unitPrice', 'Prix unit.'), t('shopping.total', 'Total')]],
        body: items.map((item) => [
          item.name,
          item.brand || '-',
          String(item.quantity),
          formatPrice(item.unitPrice),
          formatPrice(item.totalPrice),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        : yPos + 30;
    }

    // Summary
    const summaryY = Math.min(yPos + 4, doc.internal.pageSize.getHeight() - 40);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, summaryY, pageWidth - 14, summaryY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(t('shopping.subtotalHT', 'Sous-total HT:'), pageWidth - 80, summaryY + 8);
    doc.text(formatPrice(data.subtotal), pageWidth - 14, summaryY + 8, { align: 'right' });

    doc.text(t('shopping.vatLabel', 'TVA (20%):'), pageWidth - 80, summaryY + 15);
    doc.text(formatPrice(data.tax), pageWidth - 14, summaryY + 15, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(t('shopping.totalTTC', 'Total TTC:'), pageWidth - 80, summaryY + 24);
    doc.text(formatPrice(data.total), pageWidth - 14, summaryY + 24, { align: 'right' });

    // Download
    const url = URL.createObjectURL(doc.output('blob'));
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-achats-${kitchenId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [data, kitchenId, groupedItems, t]);

  // ─── Print ─────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!panelRef.current) {return;}

    const printWindow = window.open('', '_blank');
    if (!printWindow) {return;}

    const content = panelRef.current.innerHTML;
    const printTitle = t('shopping.pdfTitle', "Liste d'achats - KitchenXpert");
    printWindow.document.write(`
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { font-size: 18px; margin-bottom: 16px; }
            h3 { font-size: 14px; margin: 12px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
            th { background: #f5f5f5; font-weight: 600; }
            .summary { margin-top: 20px; border-top: 2px solid #333; padding-top: 12px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .total { font-weight: bold; font-size: 16px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2>${printTitle}</h2>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [t]);

  if (!isOpen) {return null;}

  const groups = groupedItems();
  const orderedCategories = CATEGORY_ORDER.filter((c) => groups[c] && groups[c].length > 0);
  const otherCategories = Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c));
  const allCategories = [...orderedCategories, ...otherCategories];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') {onClose();} }}
        role="button"
        tabIndex={-1}
        aria-label={t('common.closeBackdrop', 'Close')}
      />

      {/* Side Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('designer.shoppingList.title', "Liste d'achats")}
        className="fixed right-0 top-0 bottom-0 w-96 max-w-full z-50 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {t('designer.shoppingList.title', 'Liste d\'achats')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close', 'Fermer')}
          >
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div ref={panelRef} className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-4">
              {allCategories.map((category) => {
                const items = groups[category];
                if (!items || items.length === 0) {return null;}

                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      {CATEGORY_ICONS[category] || CATEGORY_ICONS.Accessories}
                      {categoryLabels[category] || category}
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                        ({items.length})
                      </span>
                    </h3>

                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <div
                          key={`${item.name}-${idx}`}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                              {item.name}
                            </div>
                            {item.brand && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.brand}
                                {item.sku && ` - ${item.sku}`}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.quantity} x {formatPrice(item.unitPrice)}
                            </div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {formatPrice(item.totalPrice)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {data.items.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  {t('designer.shoppingList.empty', 'Aucun article dans cette cuisine')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary + Actions */}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-3">
            {/* Pricing summary */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('designer.shoppingList.subtotal', 'Sous-total HT')}</span>
                <span>{formatPrice(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('designer.shoppingList.tax', 'TVA (20%)')}</span>
                <span>{formatPrice(data.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-200 dark:border-gray-600">
                <span>{t('designer.shoppingList.total', 'Total TTC')}</span>
                <span>{formatPrice(data.total)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('designer.shoppingList.exportPDF', 'Export PDF')}
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t('designer.shoppingList.print', 'Imprimer')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
