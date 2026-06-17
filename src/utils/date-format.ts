import dayjs from 'dayjs';

/**
 * Maps PHP date format characters to their dayjs equivalents.
 * Only covers the characters relevant to date/time display; unknown
 * characters are passed through unchanged (e.g. '/', '-', '.').
 */
const PHP_TO_DAYJS: Record<string, string> = {
    // Day
    d: 'DD',   // 01–31
    D: 'ddd',  // Mon–Sun
    j: 'D',    // 1–31 (no leading zero)
    l: 'dddd', // Monday–Sunday
    // Month
    m: 'MM',   // 01–12
    M: 'MMM',  // Jan–Dec
    n: 'M',    // 1–12 (no leading zero)
    F: 'MMMM', // January–December
    // Year
    Y: 'YYYY', // 2026
    y: 'YY',   // 26
    // Hour
    g: 'h',    // 1–12 (no leading zero)
    G: 'H',    // 0–23 (no leading zero)
    h: 'hh',   // 01–12
    H: 'HH',   // 00–23
    // Minute / second
    i: 'mm',
    s: 'ss',
    // AM/PM
    A: 'A',
    a: 'a',
};

/**
 * Convert a PHP date format string (e.g. "m/d/Y") to a dayjs format string
 * (e.g. "MM/DD/YYYY").  Separator characters like '/', '-', '.' pass through
 * untouched.
 */
export function phpToDayjs(phpFormat: string): string {
    return phpFormat
        .split('')
        .map((char) => PHP_TO_DAYJS[char] ?? char)
        .join('');
}

/**
 * Format a date string using a PHP-style format specifier.
 * Falls back to the raw value when dayjs cannot parse the input.
 */
export function formatDate(dateStr: string, phpFormat: string): string {
    const d = dayjs(dateStr);
    if (!d.isValid()) return dateStr;
    return d.format(phpToDayjs(phpFormat));
}
