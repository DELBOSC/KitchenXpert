/**
 * Sync Schedules Configuration
 *
 * Defines cron schedules for catalog synchronization jobs.
 * Each brand has a schedule based on its scraping frequency and priority.
 *
 * Cron format: second minute hour dayOfMonth month dayOfWeek
 * BullMQ uses standard cron (5 fields): minute hour dayOfMonth month dayOfWeek
 */

import { BrandScrapingConfig, getEnabledBrands, getBrandsByPriority } from './brands.config.js';
import type { ScrapingFrequency } from '../models/brand.js';

export interface SyncSchedule {
  brandId: string;
  brandName: string;
  cronPattern: string;
  frequency: ScrapingFrequency;
  priority: number;
  enabled: boolean;
  description: string;
}

/**
 * Default cron patterns by frequency.
 * Jobs are staggered to avoid running all at the same time.
 */
const FREQUENCY_PATTERNS: Record<ScrapingFrequency, string> = {
  // Daily at 2:00 AM
  daily: '0 2 * * *',
  // Weekly on Sunday at 3:00 AM
  weekly: '0 3 * * 0',
  // Monthly on the 1st at 4:00 AM
  monthly: '0 4 1 * *',
  // Bi-weekly on 1st and 15th at 3:30 AM
  biweekly: '30 3 1,15 * *',
};

/**
 * Stagger offset in minutes based on priority.
 * Higher priority brands run first (lower offset).
 */
function getStaggerOffset(priority: number): number {
  // Priority 1 → 0 min, Priority 2 → 15 min, Priority 3 → 30 min, etc.
  return (priority - 1) * 15;
}

/**
 * Apply stagger to a cron pattern by adjusting the minute field.
 */
function staggerCron(basePattern: string, offsetMinutes: number): string {
  const parts = basePattern.split(' ');
  const baseMinute = parseInt(parts[0] || '0', 10);
  const newMinute = (baseMinute + offsetMinutes) % 60;
  // If overflow, bump the hour
  const hourOffset = Math.floor((baseMinute + offsetMinutes) / 60);
  if (hourOffset > 0) {
    const baseHour = parseInt(parts[1] || '0', 10);
    parts[1] = String(baseHour + hourOffset);
  }
  parts[0] = String(newMinute);
  return parts.join(' ');
}

/**
 * Generate sync schedule for a single brand
 */
function generateSchedule(brand: BrandScrapingConfig): SyncSchedule {
  const basePattern = FREQUENCY_PATTERNS[brand.scrapingFrequency] || FREQUENCY_PATTERNS.weekly;
  const offset = getStaggerOffset(brand.priority);
  const cronPattern = staggerCron(basePattern, offset);

  return {
    brandId: brand.id,
    brandName: brand.name,
    cronPattern,
    frequency: brand.scrapingFrequency,
    priority: brand.priority,
    enabled: brand.enabled,
    description: `${brand.name} (${brand.scrapingFrequency}) — priority ${brand.priority}`,
  };
}

/**
 * Generate sync schedules for all enabled brands, ordered by priority
 */
export function generateAllSchedules(): SyncSchedule[] {
  const brands = getBrandsByPriority().filter((b) => b.enabled);
  return brands.map(generateSchedule);
}

/**
 * Generate sync schedules for brands with a specific frequency
 */
export function getSchedulesByFrequency(frequency: ScrapingFrequency): SyncSchedule[] {
  return generateAllSchedules().filter((s) => s.frequency === frequency);
}

/**
 * Get the default frequency cron patterns (useful for display/config)
 */
export function getFrequencyPatterns(): Record<ScrapingFrequency, string> {
  return { ...FREQUENCY_PATTERNS };
}

export default generateAllSchedules;
