/**
 * PDF Quote Export Utility
 *
 * Generates a styled HTML document for kitchen design quotes (devis)
 * and opens it in a new browser window with print dialog.
 *
 * Uses the browser's built-in window.print() with CSS print styles
 * instead of external PDF libraries.
 *
 * Usage:
 * ```typescript
 * import { generatePDFQuote } from '@/utils/pdf-export';
 *
 * generatePDFQuote({
 *   projectName: 'Ma Cuisine',
 *   date: '2026-02-15',
 *   currency: 'EUR',
 *   screenshotDataURL: 'data:image/png;base64,...',
 *   kitchenDimensions: { width: 400, length: 300, height: 250 },
 *   items: [
 *     { name: 'Meuble Bas', type: 'cabinet', quantity: 3, price: 450, reference: 'MB-001', dimensions: '60x60x85 cm' },
 *   ],
 *   totalPrice: 1350,
 * });
 * ```
 */

import i18next from 'i18next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFQuoteItem {
  /** Display name of the product */
  name: string;
  /** Product type / category (e.g. "Meuble haut", "Plan de travail") */
  type: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price (excl. tax) in the given currency */
  price: number;
  /** Catalog or supplier reference */
  reference: string;
  /** Human-readable dimensions string (e.g. "60x60x85 cm") */
  dimensions: string;
}

export interface KitchenDimensions {
  /** Width in centimeters */
  width: number;
  /** Length / depth in centimeters */
  length: number;
  /** Height in centimeters */
  height: number;
}

export interface PDFQuoteOptions {
  /** List of items to include in the quote */
  items: PDFQuoteItem[];
  /** Base64 data URL of the kitchen screenshot */
  screenshotDataURL?: string;
  /** Total price before tax (HT). When omitted it is computed from items. */
  totalPrice?: number;
  /** ISO 4217 currency code (default: "EUR") */
  currency?: string;
  /** Project / quote name */
  projectName?: string;
  /** Date string displayed on the quote (default: today) */
  date?: string;
  /** Overall kitchen dimensions */
  kitchenDimensions?: KitchenDimensions;
  /** TVA rate as a decimal (default: 0.20 = 20 %) */
  tvaRate?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_TVA_RATE = 0.20;

/**
 * Format a number as a currency string using the French locale.
 * Falls back gracefully when Intl is not available.
 */
function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/**
 * Escape HTML-sensitive characters to prevent XSS in the generated document.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * Return today's date formatted as DD/MM/YYYY.
 */
function todayFormatted(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a date string (ISO or other parseable format) to DD/MM/YYYY.
 * Returns the original string if parsing fails.
 */
function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return escapeHtml(dateStr);
  }
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Compute the subtotal (HT) from a list of items.
 * Items with missing or invalid prices are treated as 0.
 */
function computeSubtotal(items: PDFQuoteItem[]): number {
  return items.reduce((sum, item) => {
    const price = typeof item.price === 'number' && isFinite(item.price) ? item.price : 0;
    const qty = typeof item.quantity === 'number' && isFinite(item.quantity) ? item.quantity : 0;
    return sum + price * qty;
  }, 0);
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function buildStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #ffffff;
      padding: 30px 40px;
      line-height: 1.5;
    }

    /* ---- Header ---- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 700;
      color: #2563eb;
    }
    .header-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .header-meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .header-meta strong {
      display: block;
      font-size: 13px;
      color: #1e293b;
    }

    /* ---- Project info ---- */
    .project-info {
      display: flex;
      gap: 40px;
      margin-bottom: 24px;
    }
    .project-info-block {
      flex: 1;
    }
    .project-info-block h3 {
      font-size: 13px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .project-info-block p {
      font-size: 12px;
      color: #334155;
      margin-bottom: 2px;
    }

    /* ---- Screenshot ---- */
    .screenshot-section {
      margin-bottom: 24px;
      text-align: center;
    }
    .screenshot-section img {
      max-width: 100%;
      max-height: 320px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .screenshot-caption {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 6px;
    }

    /* ---- Table ---- */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead th {
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 10px 12px;
      text-align: left;
    }
    .items-table thead th:last-child,
    .items-table thead th:nth-child(5),
    .items-table thead th:nth-child(6) {
      text-align: right;
    }
    .items-table thead th:nth-child(4) {
      text-align: center;
    }
    .items-table tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      vertical-align: top;
    }
    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .items-table tbody td.align-right {
      text-align: right;
      white-space: nowrap;
    }
    .items-table tbody td.align-center {
      text-align: center;
    }
    .items-table .item-type {
      font-size: 10px;
      color: #64748b;
      display: block;
    }
    .items-table .empty-message {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 20px;
    }

    /* ---- Totals ---- */
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 280px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 12px;
      font-size: 12px;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 500;
      white-space: nowrap;
    }
    .totals-table .total-row td {
      border-top: 2px solid #2563eb;
      font-size: 15px;
      font-weight: 700;
      color: #2563eb;
      padding-top: 10px;
    }

    /* ---- Footer ---- */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }

    /* ---- Print styles ---- */
    @media print {
      body {
        padding: 15px 20px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .screenshot-section img {
        max-height: 260px;
      }
      .no-print {
        display: none !important;
      }
    }

    @page {
      size: A4;
      margin: 15mm 12mm;
    }
  `;
}

function buildItemsTableBody(items: PDFQuoteItem[], currency: string): string {
  if (items.length === 0) {
    return `
      <tr>
        <td colspan="6" class="empty-message">${escapeHtml(i18next.t('pdfExport.noItems', 'Aucun article dans ce devis'))}</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const unitPrice =
        typeof item.price === 'number' && isFinite(item.price) ? item.price : 0;
      const qty =
        typeof item.quantity === 'number' && isFinite(item.quantity) ? item.quantity : 0;
      const lineTotal = unitPrice * qty;

      return `
        <tr>
          <td>${escapeHtml(item.reference || '-')}</td>
          <td>
            ${escapeHtml(item.name || i18next.t('pdfExport.unnamedItem', 'Article sans nom'))}
            <span class="item-type">${escapeHtml(item.type || '')}</span>
          </td>
          <td>${escapeHtml(item.dimensions || '-')}</td>
          <td class="align-center">${qty}</td>
          <td class="align-right">${formatCurrency(unitPrice, currency)}</td>
          <td class="align-right">${formatCurrency(lineTotal, currency)}</td>
        </tr>
      `;
    })
    .join('');
}

function buildHTML(options: PDFQuoteOptions): string {
  const {
    items = [],
    screenshotDataURL,
    currency = DEFAULT_CURRENCY,
    projectName,
    date,
    kitchenDimensions,
    tvaRate = DEFAULT_TVA_RATE,
  } = options;

  const safeItems: PDFQuoteItem[] = Array.isArray(items) ? items : [];
  const displayDate = date ? formatDate(date) : todayFormatted();
  const subtotalHT =
    typeof options.totalPrice === 'number' && isFinite(options.totalPrice)
      ? options.totalPrice
      : computeSubtotal(safeItems);
  const tvaAmount = subtotalHT * tvaRate;
  const totalTTC = subtotalHT + tvaAmount;
  const tvaPercent = Math.round(tvaRate * 100);

  // Build optional sections
  const screenshotSection = screenshotDataURL
    ? `
      <div class="screenshot-section">
        <img src="${escapeHtml(screenshotDataURL)}" alt="${escapeHtml(i18next.t('pdfExport.screenshotAlt', 'Apercu de la cuisine'))}" />
        <div class="screenshot-caption">${escapeHtml(i18next.t('pdfExport.screenshotCaption', 'Apercu 3D du projet'))}</div>
      </div>
    `
    : '';

  const dimensionsBlock = kitchenDimensions
    ? `
      <div class="project-info-block">
        <h3>${escapeHtml(i18next.t('pdfExport.kitchenDimensions', 'Dimensions de la cuisine'))}</h3>
        <p>${escapeHtml(i18next.t('pdfExport.width', 'Largeur'))} : ${kitchenDimensions.width} cm</p>
        <p>${escapeHtml(i18next.t('pdfExport.length', 'Longueur'))} : ${kitchenDimensions.length} cm</p>
        <p>${escapeHtml(i18next.t('pdfExport.height', 'Hauteur'))} : ${kitchenDimensions.height} cm</p>
      </div>
    `
    : '';

  const projectBlock = projectName
    ? `
      <div class="project-info-block">
        <h3>${escapeHtml(i18next.t('pdfExport.project', 'Projet'))}</h3>
        <p>${escapeHtml(projectName)}</p>
      </div>
    `
    : '';

  const projectInfoSection =
    projectBlock || dimensionsBlock
      ? `<div class="project-info">${projectBlock}${dimensionsBlock}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KitchenXpert - ${escapeHtml(i18next.t('pdfExport.quoteTitle', 'Devis de Cuisine'))}${projectName ? ` - ${escapeHtml(projectName)}` : ''}</title>
  <style>${buildStyles()}</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-title">KitchenXpert - ${escapeHtml(i18next.t('pdfExport.quoteTitle', 'Devis de Cuisine'))}</div>
      <div class="header-subtitle">${escapeHtml(i18next.t('pdfExport.subtitle', 'Votre cuisine sur mesure'))}</div>
    </div>
    <div class="header-meta">
      <strong>${escapeHtml(i18next.t('pdfExport.date', 'Date'))} : ${displayDate}</strong>
      ${safeItems.length > 0 ? `<span>${safeItems.length} ${escapeHtml(i18next.t('pdfExport.items', 'article(s)'))}</span>` : ''}
    </div>
  </div>

  <!-- Project info & dimensions -->
  ${projectInfoSection}

  <!-- Screenshot -->
  ${screenshotSection}

  <!-- Items table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>${escapeHtml(i18next.t('pdfExport.table.ref', 'Ref.'))}</th>
        <th>${escapeHtml(i18next.t('pdfExport.table.product', 'Produit'))}</th>
        <th>${escapeHtml(i18next.t('pdfExport.table.dimensions', 'Dimensions'))}</th>
        <th>${escapeHtml(i18next.t('pdfExport.table.qty', 'Qty'))}</th>
        <th>${escapeHtml(i18next.t('pdfExport.table.unitPrice', 'Prix unitaire'))}</th>
        <th>${escapeHtml(i18next.t('pdfExport.table.total', 'Total'))}</th>
      </tr>
    </thead>
    <tbody>
      ${buildItemsTableBody(safeItems, currency)}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <table class="totals-table">
      <tr>
        <td>${escapeHtml(i18next.t('pdfExport.subtotalHT', 'Sous-total HT'))}</td>
        <td>${formatCurrency(subtotalHT, currency)}</td>
      </tr>
      <tr>
        <td>${escapeHtml(i18next.t('pdfExport.tva', 'TVA'))} (${tvaPercent}%)</td>
        <td>${formatCurrency(tvaAmount, currency)}</td>
      </tr>
      <tr class="total-row">
        <td>${escapeHtml(i18next.t('pdfExport.totalTTC', 'Total TTC'))}</td>
        <td>${formatCurrency(totalTTC, currency)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${escapeHtml(i18next.t('pdfExport.generatedBy', 'Genere par KitchenXpert'))}</span>
    <span>${displayDate}</span>
  </div>

  <!-- Auto-print script -->
  <script>
    window.addEventListener('load', function () {
      // Small delay to let images and styles render before triggering print
      setTimeout(function () {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a styled PDF quote for a kitchen design.
 *
 * Opens a new browser window containing a fully styled HTML document
 * and automatically triggers the browser's print dialog, which allows
 * the user to save as PDF or print directly.
 *
 * @param options - Configuration for the quote document.
 * @throws {Error} If the browser blocks the popup window.
 *
 * @example
 * ```typescript
 * generatePDFQuote({
 *   projectName: 'Cuisine Dupont',
 *   date: '2026-02-15',
 *   currency: 'EUR',
 *   screenshotDataURL: canvas.toDataURL('image/png'),
 *   kitchenDimensions: { width: 400, length: 300, height: 250 },
 *   items: [
 *     {
 *       name: 'Meuble Bas 60cm',
 *       type: 'Meuble bas',
 *       quantity: 3,
 *       price: 450,
 *       reference: 'MB-060',
 *       dimensions: '60x60x85 cm',
 *     },
 *   ],
 *   totalPrice: 1350,
 * });
 * ```
 */
export function generatePDFQuote(options: PDFQuoteOptions): void {
  // Validate that we have a usable options object
  if (!options || typeof options !== 'object') {
    throw new Error('generatePDFQuote: options argument is required and must be an object.');
  }

  // Validate screenshotDataURL format to prevent injection
  if (options.screenshotDataURL && !options.screenshotDataURL.startsWith('data:')) {
    throw new Error('Invalid screenshot data URL format');
  }

  const htmlContent = buildHTML(options);

  // Open a new window and write the HTML content
  const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');

  if (!printWindow) {
    throw new Error(
      i18next.t('pdfExport.popupBlocked', 'generatePDFQuote: impossible d\'ouvrir la fenetre d\'impression. Veuillez autoriser les popups pour ce site.')
    );
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
