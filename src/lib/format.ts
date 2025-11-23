import { TenantSettings } from '@/contexts/SettingsContext';

/**
 * Currency symbols mapping
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
    IDR: 'Rp',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    SGD: 'S$',
    MYR: 'RM',
};

/**
 * Format a number as currency based on tenant settings
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    // Format number with thousands separator
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);

    // For IDR, put symbol after number (Indonesian convention)
    if (currency === 'IDR') {
        return `${symbol} ${formatted}`;
    }

    // For other currencies, put symbol before number
    return `${symbol}${formatted}`;
}

/**
 * Format a date according to the specified format
 */
export function formatDate(date: Date | string, format: string = 'DD/MM/YYYY'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        default:
            return `${day}/${month}/${year}`;
    }
}

/**
 * Format a time according to the specified format (12h or 24h)
 */
export function formatTime(date: Date | string, format: string = '24h'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === '12h') {
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }

    // 24h format
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Format a complete date and time
 */
export function formatDateTime(
    date: Date | string,
    dateFormat: string = 'DD/MM/YYYY',
    timeFormat: string = '24h'
): string {
    const formattedDate = formatDate(date, dateFormat);
    const formattedTime = formatTime(date, timeFormat);
    return `${formattedDate} ${formattedTime}`;
}

/**
 * Convert a date to a specific timezone (simplified version)
 * For production, consider using a library like date-fns-tz or luxon
 */
export function convertToTimezone(date: Date | string, timezone: string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;

    // For now, return the date as-is
    // In production, you'd use a proper timezone library
    // Example with Intl API:
    try {
        const formatted = d.toLocaleString('en-US', { timeZone: timezone });
        return new Date(formatted);
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, using local time`);
        return d;
    }
}

/**
 * Format currency using tenant settings
 */
export function formatCurrencyWithSettings(amount: number, settings: TenantSettings): string {
    return formatCurrency(amount, settings.currency);
}

/**
 * Format date using tenant settings
 */
export function formatDateWithSettings(date: Date | string, settings: TenantSettings): string {
    const converted = convertToTimezone(date, settings.timezone);
    return formatDate(converted, settings.dateFormat);
}

/**
 * Format time using tenant settings
 */
export function formatTimeWithSettings(date: Date | string, settings: TenantSettings): string {
    const converted = convertToTimezone(date, settings.timezone);
    return formatTime(converted, settings.timeFormat);
}

/**
 * Format date and time using tenant settings
 */
export function formatDateTimeWithSettings(date: Date | string, settings: TenantSettings): string {
    const converted = convertToTimezone(date, settings.timezone);
    return formatDateTime(converted, settings.dateFormat, settings.timeFormat);
}
