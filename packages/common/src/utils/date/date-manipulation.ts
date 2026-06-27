/**
 * Date Manipulation Utilities
 * Provides utility functions for manipulating dates.
 */

import { DateInput, normalizeDate } from './date-comparison';

/**
 * Adds days to a date.
 * @param date - The base date
 * @param days - The number of days to add
 * @returns A new Date with the days added
 */
export function addDays(date: DateInput, days: number): Date {
  const result = new Date(normalizeDate(date));
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtracts days from a date.
 * @param date - The base date
 * @param days - The number of days to subtract
 * @returns A new Date with the days subtracted
 */
export function subtractDays(date: DateInput, days: number): Date {
  return addDays(date, -days);
}

/**
 * Adds weeks to a date.
 * @param date - The base date
 * @param weeks - The number of weeks to add
 * @returns A new Date with the weeks added
 */
export function addWeeks(date: DateInput, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Subtracts weeks from a date.
 * @param date - The base date
 * @param weeks - The number of weeks to subtract
 * @returns A new Date with the weeks subtracted
 */
export function subtractWeeks(date: DateInput, weeks: number): Date {
  return addWeeks(date, -weeks);
}

/**
 * Adds months to a date.
 * @param date - The base date
 * @param months - The number of months to add
 * @returns A new Date with the months added
 */
export function addMonths(date: DateInput, months: number): Date {
  const result = new Date(normalizeDate(date));
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);

  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
  if (result.getDate() !== day) {
    result.setDate(0); // Go to last day of previous month
  }

  return result;
}

/**
 * Subtracts months from a date.
 * @param date - The base date
 * @param months - The number of months to subtract
 * @returns A new Date with the months subtracted
 */
export function subtractMonths(date: DateInput, months: number): Date {
  return addMonths(date, -months);
}

/**
 * Adds years to a date.
 * @param date - The base date
 * @param years - The number of years to add
 * @returns A new Date with the years added
 */
export function addYears(date: DateInput, years: number): Date {
  const result = new Date(normalizeDate(date));
  const day = result.getDate();
  result.setFullYear(result.getFullYear() + years);

  // Handle leap year edge case (Feb 29 + 1 year = Feb 28)
  if (result.getDate() !== day) {
    result.setDate(0);
  }

  return result;
}

/**
 * Subtracts years from a date.
 * @param date - The base date
 * @param years - The number of years to subtract
 * @returns A new Date with the years subtracted
 */
export function subtractYears(date: DateInput, years: number): Date {
  return addYears(date, -years);
}

/**
 * Adds hours to a date.
 * @param date - The base date
 * @param hours - The number of hours to add
 * @returns A new Date with the hours added
 */
export function addHours(date: DateInput, hours: number): Date {
  const result = new Date(normalizeDate(date));
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

/**
 * Subtracts hours from a date.
 * @param date - The base date
 * @param hours - The number of hours to subtract
 * @returns A new Date with the hours subtracted
 */
export function subtractHours(date: DateInput, hours: number): Date {
  return addHours(date, -hours);
}

/**
 * Adds minutes to a date.
 * @param date - The base date
 * @param minutes - The number of minutes to add
 * @returns A new Date with the minutes added
 */
export function addMinutes(date: DateInput, minutes: number): Date {
  const result = new Date(normalizeDate(date));
  result.setTime(result.getTime() + minutes * 60 * 1000);
  return result;
}

/**
 * Subtracts minutes from a date.
 * @param date - The base date
 * @param minutes - The number of minutes to subtract
 * @returns A new Date with the minutes subtracted
 */
export function subtractMinutes(date: DateInput, minutes: number): Date {
  return addMinutes(date, -minutes);
}

/**
 * Adds seconds to a date.
 * @param date - The base date
 * @param seconds - The number of seconds to add
 * @returns A new Date with the seconds added
 */
export function addSeconds(date: DateInput, seconds: number): Date {
  const result = new Date(normalizeDate(date));
  result.setTime(result.getTime() + seconds * 1000);
  return result;
}

/**
 * Subtracts seconds from a date.
 * @param date - The base date
 * @param seconds - The number of seconds to subtract
 * @returns A new Date with the seconds subtracted
 */
export function subtractSeconds(date: DateInput, seconds: number): Date {
  return addSeconds(date, -seconds);
}

/**
 * Gets the start of a day (00:00:00.000).
 * @param date - The date
 * @returns A new Date at the start of the day
 */
export function startOfDay(date: DateInput): Date {
  const result = new Date(normalizeDate(date));
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of a day (23:59:59.999).
 * @param date - The date
 * @returns A new Date at the end of the day
 */
export function endOfDay(date: DateInput): Date {
  const result = new Date(normalizeDate(date));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of a week (Sunday 00:00:00.000).
 * @param date - The date
 * @param weekStartsOn - The day the week starts on (0 = Sunday, 1 = Monday, etc.)
 * @returns A new Date at the start of the week
 */
export function startOfWeek(date: DateInput, weekStartsOn: number = 0): Date {
  const result = new Date(normalizeDate(date));
  const day = result.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of a week (Saturday 23:59:59.999).
 * @param date - The date
 * @param weekStartsOn - The day the week starts on (0 = Sunday, 1 = Monday, etc.)
 * @returns A new Date at the end of the week
 */
export function endOfWeek(date: DateInput, weekStartsOn: number = 0): Date {
  const result = startOfWeek(date, weekStartsOn);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of a month (1st day 00:00:00.000).
 * @param date - The date
 * @returns A new Date at the start of the month
 */
export function startOfMonth(date: DateInput): Date {
  const result = new Date(normalizeDate(date));
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of a month (last day 23:59:59.999).
 * @param date - The date
 * @returns A new Date at the end of the month
 */
export function endOfMonth(date: DateInput): Date {
  const result = new Date(normalizeDate(date));
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of a quarter (1st day of quarter 00:00:00.000).
 * @param date - The date
 * @returns A new Date at the start of the quarter
 */
export function startOfQuarter(date: DateInput): Date {
  const d = normalizeDate(date);
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
}

/**
 * Gets the end of a quarter (last day of quarter 23:59:59.999).
 * @param date - The date
 * @returns A new Date at the end of the quarter
 */
export function endOfQuarter(date: DateInput): Date {
  const d = normalizeDate(date);
  const quarter = Math.floor(d.getMonth() / 3);
  const result = new Date(d.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of a year (January 1st 00:00:00.000).
 * @param date - The date
 * @returns A new Date at the start of the year
 */
export function startOfYear(date: DateInput): Date {
  const d = normalizeDate(date);
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/**
 * Gets the end of a year (December 31st 23:59:59.999).
 * @param date - The date
 * @returns A new Date at the end of the year
 */
export function endOfYear(date: DateInput): Date {
  const d = normalizeDate(date);
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/**
 * Gets the difference between two dates in days.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The difference in days
 */
export function differenceInDays(date1: DateInput, date2: DateInput): number {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gets the difference between two dates in hours.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The difference in hours
 */
export function differenceInHours(date1: DateInput, date2: DateInput): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60));
}

/**
 * Gets the difference between two dates in minutes.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The difference in minutes
 */
export function differenceInMinutes(date1: DateInput, date2: DateInput): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Gets the difference between two dates in months.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The difference in months
 */
export function differenceInMonths(date1: DateInput, date2: DateInput): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const yearDiff = d1.getFullYear() - d2.getFullYear();
  const monthDiff = d1.getMonth() - d2.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Gets the difference between two dates in years.
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The difference in years
 */
export function differenceInYears(date1: DateInput, date2: DateInput): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getFullYear() - d2.getFullYear();
}

/**
 * Sets the time components of a date.
 * @param date - The date to modify
 * @param hours - The hours (0-23)
 * @param minutes - The minutes (0-59)
 * @param seconds - The seconds (0-59)
 * @param ms - The milliseconds (0-999)
 * @returns A new Date with the time set
 */
export function setTime(
  date: DateInput,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date {
  const result = new Date(normalizeDate(date));
  result.setHours(hours, minutes, seconds, ms);
  return result;
}

/**
 * Clamps a date to be within a range.
 * @param date - The date to clamp
 * @param min - The minimum date
 * @param max - The maximum date
 * @returns The clamped date
 */
export function clampDate(date: DateInput, min: DateInput, max: DateInput): Date {
  const d = normalizeDate(date);
  const minD = normalizeDate(min);
  const maxD = normalizeDate(max);

  if (d.getTime() < minD.getTime()) {
    return new Date(minD);
  }
  if (d.getTime() > maxD.getTime()) {
    return new Date(maxD);
  }
  return new Date(d);
}

/**
 * Gets an array of dates in a range.
 * @param start - The start date
 * @param end - The end date
 * @param step - The step in days (default: 1)
 * @returns An array of dates
 */
export function getDateRange(start: DateInput, end: DateInput, step: number = 1): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const endDate = startOfDay(end);

  while (current.getTime() <= endDate.getTime()) {
    dates.push(new Date(current));
    current = addDays(current, step);
  }

  return dates;
}

/**
 * Gets the number of days in a month.
 * @param date - A date in the month (or year and month as separate params)
 * @returns The number of days in the month
 */
export function getDaysInMonth(date: DateInput): number;
export function getDaysInMonth(year: number, month: number): number;
export function getDaysInMonth(dateOrYear: DateInput | number, month?: number): number {
  if (typeof dateOrYear === 'number' && month !== undefined) {
    return new Date(dateOrYear, month, 0).getDate();
  }
  const d = normalizeDate(dateOrYear as DateInput);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Gets the number of days in a year.
 * @param date - A date in the year (or the year number)
 * @returns The number of days in the year (365 or 366)
 */
export function getDaysInYear(date: DateInput | number): number {
  const year = typeof date === 'number' ? date : normalizeDate(date).getFullYear();
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}
