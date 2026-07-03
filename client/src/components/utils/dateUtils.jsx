import { format } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Get current date in Jakarta timezone
 */
export const getCurrentDateJakarta = () => {
  return toZonedTime(new Date(), JAKARTA_TZ);
};

/**
 * Format date to string in Jakarta timezone
 * @param {Date | string} date - Date to format
 * @param {string} formatStr - Format string (default: 'yyyy-MM-dd')
 */
export const formatDateJakarta = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  let d;
  if (typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')) {
    d = new Date(date + 'Z');
  } else {
    d = new Date(date);
  }
  return formatInTimeZone(d, JAKARTA_TZ, formatStr);
};

/**
 * Format date in Jakarta timezone
 * @param {Date | string} date - Date to format
 * @param {string} formatStr - Format string
 */
export const formatInJakarta = (date, formatStr = 'dd MMM yyyy') => {
  if (!date) return '';
  // Pastikan string ISO diparse sebagai UTC (tambah Z jika belum ada)
  let d;
  if (typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')) {
    d = new Date(date + 'Z');
  } else {
    d = new Date(date);
  }
  return formatInTimeZone(d, JAKARTA_TZ, formatStr);
};

/**
 * Get today's date in Jakarta timezone as string (yyyy-MM-dd)
 */
export const getTodayJakarta = () => {
  const today = toZonedTime(new Date(), JAKARTA_TZ);
  return format(today, 'yyyy-MM-dd', { timeZone: JAKARTA_TZ });
};