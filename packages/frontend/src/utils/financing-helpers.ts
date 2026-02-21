/**
 * Financing Helpers
 * Utility functions for displaying per-item monthly payments
 * in the catalog and kitchen designer.
 */

/**
 * Calculate and format a monthly installment price string.
 * Uses a standard amortization formula with the best available rate
 * for the given duration (default: 36 months at 4.7% Cofidis rate).
 *
 * @param price - Product price in EUR
 * @param months - Financing duration in months (default: 36)
 * @param annualRate - Annual interest rate in percent (default: 4.7)
 * @returns Formatted string like "a partir de 42 EUR/mois"
 *
 * @example
 * ```tsx
 * <span className="text-sm text-gray-500">
 *   {formatMonthlyPrice(1500)} // => "a partir de 45 EUR/mois"
 * </span>
 * ```
 */
export function formatMonthlyPrice(
  price: number,
  months: number = 36,
  annualRate: number = 4.7,
): string {
  if (price <= 0 || months <= 0) return '';
  if (annualRate <= 0) {
    const monthly = Math.ceil(price / months);
    return `a partir de ${monthly} EUR/mois`;
  }

  const monthlyRate = annualRate / 100 / 12;
  const monthly = price * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  return `a partir de ${Math.ceil(monthly)} EUR/mois`;
}

/**
 * Calculate raw monthly payment (numeric, no formatting).
 *
 * @param amount - Loan amount in EUR
 * @param annualRate - Annual interest rate in percent
 * @param months - Duration in months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  amount: number,
  annualRate: number,
  months: number,
): number {
  if (amount <= 0 || months <= 0) return 0;
  if (annualRate <= 0) return amount / months;

  const monthlyRate = annualRate / 100 / 12;
  return amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}
