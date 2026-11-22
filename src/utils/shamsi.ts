/**
 * Accurate Pure TypeScript Persian (Jalali / Shamsi) Calendar Utility
 * Based on the astronomical algorithmic calculations for Iranian calendar.
 */

export const SHAMSI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Converts Persian/Arabic digits to English digits
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Converts Gregorian Date to Shamsi { jy, jm, jd }
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];

  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

/**
 * Converts Shamsi { jy, jm, jd } to Gregorian { gy, gm, gd }
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > sal_a[gm]) {
    gd -= sal_a[gm];
    gm++;
  }

  return { gy, gm, gd };
}

/**
 * Formats current date or provided date as Shamsi string (e.g. "۱۴۰۳/۰۸/۱۵")
 */
export function formatShamsiDate(date: Date = new Date()): string {
  const { jy, jm, jd } = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const mStr = jm < 10 ? `0${jm}` : `${jm}`;
  const dStr = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${mStr}/${dStr}`;
}

/**
 * Formats Shamsi date in full readable words (e.g. "۱۵ آبان ۱۴۰۳")
 */
export function formatShamsiLong(shamsiDateStr: string): string {
  if (!shamsiDateStr) return '';
  const clean = toEnglishDigits(shamsiDateStr).trim();
  const parts = clean.split(/[\/\-]/);
  if (parts.length < 3) return shamsiDateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  const monthName = SHAMSI_MONTH_NAMES[m - 1] || '';
  return `${toPersianDigits(d)} ${monthName} ${toPersianDigits(y)}`;
}

/**
 * Calculates event status based on Shamsi start date & duration in days
 */
export function getEventStatus(shamsiStartDate: string, durationDays: number): 'upcoming' | 'ongoing' | 'past' {
  try {
    const clean = toEnglishDigits(shamsiStartDate).trim();
    const parts = clean.split(/[\/\-]/);
    if (parts.length < 3) return 'upcoming';

    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);

    const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
    const start = new Date(gy, gm - 1, gd, 0, 0, 0);
    const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  } catch {
    return 'upcoming';
  }
}
