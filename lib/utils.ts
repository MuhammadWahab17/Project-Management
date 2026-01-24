import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the Sunday of the current week
 */
export function getCurrentWeekSunday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysUntilSunday = dayOfWeek === 0 ? 0 : -dayOfWeek
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + daysUntilSunday)
  sunday.setHours(0, 0, 0, 0)
  return sunday
}

/**
 * Get the Saturday of the current week
 */
export function getCurrentWeekSaturday(): Date {
  const sunday = getCurrentWeekSunday()
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  saturday.setHours(23, 59, 59, 999)
  return saturday
}

/**
 * Get the week number of the year for a given date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate the week number since project start
 * Returns the week number (1-based) from project start date
 * Week 1 is the week containing the project start date
 */
export function getWeekSinceProjectStart(projectStartDate: Date, currentDate: Date = new Date()): number {
  const start = new Date(projectStartDate);
  start.setHours(0, 0, 0, 0);
  
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);
  
  // Get the Sunday of the project start week
  const startDayOfWeek = start.getDay();
  const startSunday = new Date(start);
  startSunday.setDate(start.getDate() - startDayOfWeek);
  startSunday.setHours(0, 0, 0, 0);
  
  // Get the Sunday of the current week
  const currentDayOfWeek = current.getDay();
  const currentSunday = new Date(current);
  currentSunday.setDate(current.getDate() - currentDayOfWeek);
  currentSunday.setHours(0, 0, 0, 0);
  
  // Calculate difference in weeks
  const diffTime = currentSunday.getTime() - startSunday.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  // Return 1-based week number (week 1 is the first week)
  // Ensure minimum value is 1 (if somehow we get a negative or 0, return 1)
  return Math.max(1, diffWeeks + 1);
}

/**
 * Get ISO week format (YYYY-Www) for a given date
 */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}
