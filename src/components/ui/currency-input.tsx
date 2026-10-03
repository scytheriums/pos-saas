'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';

/**
 * Masked money input using Indonesian separators: "1.000.000,50".
 * Emits a plain number (or null when empty) via onValueChange.
 */

const MAX_DECIMALS = 2;

/** Keep only digits and the first decimal comma; trim leading zeros and extra decimals. */
function sanitize(raw: string, allowDecimals: boolean): string {
    let cleaned = raw.replace(allowDecimals ? /[^\d,]/g : /\D/g, '');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
        cleaned = cleaned.slice(0, commaIndex + 1) +
            cleaned.slice(commaIndex + 1).replace(/,/g, '').slice(0, MAX_DECIMALS);
    }
    const [intPart, decPart] = cleaned.split(',');
    const trimmedInt = intPart.replace(/^0+(?=\d)/, '');
    return decPart !== undefined ? `${trimmedInt || '0'},${decPart}` : trimmedInt;
}

function formatSanitized(sanitized: string): string {
    const [intPart, decPart] = sanitized.split(',');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decPart !== undefined ? `${grouped},${decPart}` : grouped;
}

function parseSanitized(sanitized: string): number | null {
    if (sanitized === '') return null;
    const n = parseFloat(sanitized.replace(',', '.'));
    return isNaN(n) ? null : n;
}

function formatNumber(value: number | null | undefined, allowDecimals: boolean): string {
    if (value === null || value === undefined || isNaN(value) || value === 0) return '';
    const fixed = allowDecimals ? String(Math.round(value * 100) / 100) : String(Math.round(value));
    return formatSanitized(sanitize(fixed.replace('.', ','), allowDecimals));
}

/** Count of meaningful characters (digits and comma) before a caret position. */
function countSignificant(text: string, caret: number): number {
    return text.slice(0, caret).replace(/[^\d,]/g, '').length;
}

/** Caret position in `text` right after `count` meaningful characters. */
function caretForCount(text: string, count: number): number {
    if (count <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < text.length; i++) {
        if (/[\d,]/.test(text[i])) seen++;
        if (seen === count) return i + 1;
    }
    return text.length;
}

interface CurrencyInputProps
    extends Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type'> {
    value: number | null | undefined;
    onValueChange: (value: number | null) => void;
    /** Allow up to 2 decimals after a comma. Defaults to true. */
    allowDecimals?: boolean;
}

export function CurrencyInput({
    value,
    onValueChange,
    allowDecimals = true,
    placeholder = '0',
    ...props
}: CurrencyInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const pendingCaret = React.useRef<number | null>(null);
    const [text, setText] = React.useState(() => formatNumber(value, allowDecimals));

    // Sync from outside (e.g. bulk set, form reset) unless it already matches what's typed
    React.useEffect(() => {
        const current = parseSanitized(sanitize(text, allowDecimals)) ?? 0;
        if ((value ?? 0) !== current) {
            setText(formatNumber(value, allowDecimals));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, allowDecimals]);

    React.useLayoutEffect(() => {
        if (pendingCaret.current !== null && inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
        }
        pendingCaret.current = null;
    }, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        const sanitized = sanitize(raw, allowDecimals);
        const formatted = formatSanitized(sanitized);

        pendingCaret.current = caretForCount(formatted, countSignificant(raw, caret));
        setText(formatted);
        onValueChange(parseSanitized(sanitized));
    };

    return (
        <Input
            {...props}
            ref={inputRef}
            type="text"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            autoComplete="off"
            placeholder={placeholder}
            value={text}
            onChange={handleChange}
        />
    );
}
