/**
 * Date Comparison Utilities
 * Provides utility functions for comparing dates.
 */

/**
 * Represents a date input that can be a Date object, timestamp, or date string.
 */
export type DateInput = Date | number | string;

/**
 * Normalizes a date input to a Date object.
 * @param date - The date input
 * @returns A Date object
 */
export function normalizeDate(date: DateInput): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Checks if the first date is before the second date.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if date1 is before date2
 */
export function isBefore(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getTime() < normalizeDate(date2).getTime();
}

/**
 * Checks if the first date is after the second date.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if date1 is after date2
 */
export function isAfter(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getTime() > normalizeDate(date2).getTime();
}

/**
 * Checks if the first date is on or before the second date.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if date1 is on or before date2
 */
export function isOnOrBefore(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getTime() <= normalizeDate(date2).getTime();
}

/**
 * Checks if the first date is on or after the second date.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if date1 is on or after date2
 */
export function isOnOrAfter(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getTime() >= normalizeDate(date2).getTime();
}

/**
 * Checks if a date is between two other dates.
 * @param date - The date to check
 * @param start - The start of the range
 * @param end - The end of the range
 * @param inclusive - Whether to include the boundary dates (default: true)
 * @returns True if date is between start and end
 */
export function isBetween(
  date: DateInput,
  start: DateInput,
  end: DateInput,
  inclusive: boolean = true
): boolean {
  const dateMs = normalizeDate(date).getTime();
  const startMs = normalizeDate(start).getTime();
  const endMs = normalizeDate(end).getTime();

  if (inclusive) {
    return dateMs >= startMs && dateMs <= endMs;
  }
  return dateMs > startMs && dateMs < endMs;
}

/**
 * Checks if two dates are equal (same timestamp).
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are equal
 */
export function isEqual(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getTime() === normalizeDate(date2).getTime();
}

/**
 * Checks if two dates are on the same day.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Checks if two dates are in the same month.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are in the same month
 */
export function isSameMonth(date1: DateInput, date2: DateInput): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
}

/**
 * Checks if two dates are in the same year.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are in the same year
 */
export function isSameYear(date1: DateInput, date2: DateInput): boolean {
  return normalizeDate(date1).getFullYear() === normalizeDate(date2).getFullYear();
}

/**
 * Checks if two dates are in the same week.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are in the same week
 */
export function isSameWeek(date1: DateInput, date2: DateInput): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);

  const startOfWeek1 = new Date(d1);
  startOfWeek1.setDate(d1.getDate() - d1.getDay());
  startOfWeek1.setHours(0, 0, 0, 0);

  const startOfWeek2 = new Date(d2);
  startOfWeek2.setDate(d2.getDate() - d2.getDay());
  startOfWeek2.setHours(0, 0, 0, 0);

  return startOfWeek1.getTime() === startOfWeek2.getTime();
}

/**
 * Checks if a date is today.
 * @param date - The date to check
 * @returns True if date is today
 */
export function isToday(date: DateInput): boolean {
  return isSameDay(date, new Date());
}

/**
 * Checks if a date is tomorrow.
 * @param date - The date to check
 * @returns True if date is tomorrow
 */
export function isTomorrow(date: DateInput): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Checks if a date is yesterday.
 * @param date - The date to check
 * @returns True if date is yesterday
 */
export function isYesterday(date: DateInput): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Checks if a date is in the past.
 * @param date - The date to check
 * @returns True if date is in the past
 */
export function isPast(date: DateInput): boolean {
  return isBefore(date, new Date());
}

/**
 * Checks if a date is in the future.
 * @param date - The date to check
 * @returns True if date is in the future
 */
export function isFuture(date: DateInput): boolean {
  return isAfter(date, new Date());
}

/**
 * Checks if a date is a weekend (Saturday or Sunday).
 * @param date - The date to check
 * @returns True if date is a weekend
 */
export function isWeekend(date: DateInput): boolean {
  const day = normalizeDate(date).getDay();
  return day === 0 || day === 6;
}

/**
 * Checks if a date is a weekday (Monday to Friday).
 * @param date - The date to check
 * @returns True if date is a weekday
 */
export function isWeekday(date: DateInput): boolean {
  return !isWeekend(date);
}

/**
 * Checks if a year is a leap year.
 * @param year - The year to check (or a date to extract the year from)
 * @returns True if the year is a leap year
 */
export function isLeapYear(year: number | DateInput): boolean {
  const y = typeof year === 'number' ? year : normalizeDate(year).getFullYear();
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Compares two dates and returns -1, 0, or 1.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareAsc(date1: DateInput, date2: DateInput): -1 | 0 | 1 {
  const d1 = normalizeDate(date1).getTime();
  const d2 = normalizeDate(date2).getTime();

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Compares two dates and returns 1, 0, or -1 (descending order).
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns 1 if date1 < date2, 0 if equal, -1 if date1 > date2
 */
export function compareDesc(date1: DateInput, date2: DateInput): -1 | 0 | 1 {
  return (compareAsc(date1, date2) * -1) as -1 | 0 | 1;
}

/**
 * Returns the minimum date from an array of dates.
 * @param dates - The array of dates
 * @returns The minimum date
 */
export function minDate(...dates: DateInput[]): Date {
  if (dates.length === 0) {
    throw new Error('At least one date is required');
  }
  return new Date(Math.min(...dates.map((d) => normalizeDate(d).getTime())));
}

/**
 * Returns the maximum date from an array of dates.
 * @param dates - The array of dates
 * @returns The maximum date
 */
export function maxDate(...dates: DateInput[]): Date {
  if (dates.length === 0) {
    throw new Error('At least one date is required');
  }
  return new Date(Math.max(...dates.map((d) => normalizeDate(d).getTime())));
}

/**
 * Returns the closest date from an array to a target date.
 * @param target - The target date
 * @param dates - The array of dates to compare
 * @returns The closest date
 */
export function closestDate(target: DateInput, dates: DateInput[]): Date {
  if (dates.length === 0) {
    throw new Error('At least one date is required');
  }

  const targetMs = normalizeDate(target).getTime();
  const firstDate = dates[0]!;
  let closest = normalizeDate(firstDate);
  let minDiff = Math.abs(closest.getTime() - targetMs);

  for (let i = 1; i < dates.length; i++) {
    const dateInput = dates[i]!;
    const date = normalizeDate(dateInput);
    const diff = Math.abs(date.getTime() - targetMs);
    if (diff < minDiff) {
      closest = date;
      minDiff = diff;
    }
  }

  return closest;
}

/**
 * Checks if a date is valid.
 * @param date - The date to check
 * @returns True if the date is valid
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}
