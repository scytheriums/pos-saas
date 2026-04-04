'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import EscPosEncoder from 'esc-pos-encoder';
import { toast } from 'sonner';

const PRINT_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINT_CHAR    = '00002af1-0000-1000-8000-00805f9b34fb';
const CHUNK_SIZE    = 512;
const MAX_RETRIES   = 3;

interface PrinterContextType {
    isConnected: boolean;
    isConnecting: boolean;
    deviceName: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    printReceipt: (order: any, settings: any) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export function PrinterProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected]   = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [deviceName, setDeviceName]     = useState<string | null>(null);

    // Use refs so async callbacks always see the latest values
    const deviceRef = useRef<BluetoothDevice | null>(null);

    /** Ensure GATT is up and return a fresh characteristic. Reconnects automatically. */
    const getCharacteristic = async (
        btDevice: BluetoothDevice,
        attempt = 1
    ): Promise<BluetoothRemoteGATTCharacteristic> => {
        try {
            if (!btDevice.gatt!.connected) {
                await btDevice.gatt!.connect();
            }
            const service = await btDevice.gatt!.getPrimaryService(PRINT_SERVICE);
            return await service.getCharacteristic(PRINT_CHAR);
        } catch (err: any) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 400 * attempt));
                return getCharacteristic(btDevice, attempt + 1);
            }
            throw err;
        }
    };

    const handleDisconnect = () => {
        // Keep deviceRef so we can still auto-reconnect on next print
        setIsConnected(false);
        toast.info('Printer disconnected — will auto-reconnect on next print.');
    };

    const connect = async () => {
        if (!navigator.bluetooth) {
            toast.error('Web Bluetooth not supported. Open this page in Chrome on Android.');
            return;
        }
        setIsConnecting(true);
        try {
            const btDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: [PRINT_SERVICE] }],
                optionalServices: [PRINT_SERVICE],
            });

            // Replace listener if reconnecting to a new device
            if (deviceRef.current && deviceRef.current !== btDevice) {
                deviceRef.current.removeEventListener('gattserverdisconnected', handleDisconnect);
            }
            deviceRef.current = btDevice;
            setDeviceName(btDevice.name || 'Unknown Printer');

            btDevice.addEventListener('gattserverdisconnected', handleDisconnect);

            await getCharacteristic(btDevice); // validates full stack
            setIsConnected(true);
            toast.success(`Connected to ${btDevice.name || 'printer'}`);
        } catch (err: any) {
            if (err.name !== 'NotFoundError') {
                // NotFoundError = user cancelled picker, don't show error
                toast.error(`Could not connect: ${err.message}`);
            }
            console.error('Bluetooth connect error:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        const btDevice = deviceRef.current;
        if (btDevice) {
            btDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
            if (btDevice.gatt?.connected) btDevice.gatt.disconnect();
            deviceRef.current = null;
        }
        setIsConnected(false);
        setDeviceName(null);
    };

    const printReceipt = async (order: any, settings: any) => {
        const btDevice = deviceRef.current;
        if (!btDevice) {
            toast.error('Printer not connected. Tap the Bluetooth button first.');
            return;
        }
        try {
            const char = await getCharacteristic(btDevice);
            setIsConnected(true);

            // ── Helpers for 32-char wide 58mm paper ──
            const WIDTH = 32;
            const DIVIDER = '-'.repeat(WIDTH);
            const fmt = (n: number) =>
                new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
            /** Left + right text padded to full WIDTH */
            const padRow = (left: string, right: string) => {
                const space = WIDTH - left.length - right.length;
                return left + ' '.repeat(Math.max(1, space)) + right;
            };
            /** Wrap text that is too long into multiple lines */
            const wrapLine = (text: string, maxLen = WIDTH) => {
                const lines: string[] = [];
                while (text.length > maxLen) {
                    lines.push(text.slice(0, maxLen));
                    text = text.slice(maxLen);
                }
                if (text) lines.push(text);
                return lines;
            };

            const encoder = new EscPosEncoder();
            let r = encoder.initialize();

            // ── Store header (mirrors ReceiptTemplate header block) ──
            r.align('center').bold(true).line(settings.name || 'Store Name').bold(false);
            if (settings.address) {
                wrapLine(settings.address).forEach((l: string) => r.line(l));
            }
            if (settings.phone) r.line(settings.phone);
            if (settings.receiptHeader) {
                r.newline();
                settings.receiptHeader.split('\n').forEach((l: string) => {
                    wrapLine(l).forEach((ll: string) => r.line(ll));
                });
            }
            r.line(DIVIDER);

            // ── Transaction details ──
            r.align('left');
            const dateStr = order.date
                ? new Date(order.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleString('id-ID');
            r.line(padRow('Date:', dateStr));
            r.line(padRow('Order ID:', '#' + order.orderId.slice(-6).toUpperCase()));
            if (order.cashierName) r.line(padRow('Cashier:', order.cashierName));
            r.line(DIVIDER);

            // ── Items header (mirrors ReceiptTemplate table header) ──
            r.line(padRow('Item', 'Qty    Price'));
            r.line(DIVIDER);

            // ── Items ──
            order.items.forEach((item: any) => {
                const price = fmt(item.price * item.quantity);
                const qtyPrice = `${item.quantity}  ${price}`;
                const maxName = Math.max(4, WIDTH - qtyPrice.length - 1);
                const nameLine = item.name.length > maxName
                    ? item.name.slice(0, maxName - 1) + '.'
                    : item.name;
                r.line(padRow(nameLine, qtyPrice));
                if (item.variantName) r.line('  (' + item.variantName + ')');
            });
            r.line(DIVIDER);

            // ── Totals (mirrors ReceiptTemplate totals block) ──
            r.line(padRow('Subtotal', fmt(order.subtotal)));
            if (order.tax > 0) {
                const taxLabel = settings.taxRate ? `Tax (${settings.taxRate}%)` : 'Tax';
                r.line(padRow(taxLabel, fmt(order.tax)));
            }
            if ((order.discountAmount ?? 0) > 0) {
                const discLabel = order.discountName
                    ? `Discount (${order.discountName})`.slice(0, 20)
                    : 'Discount';
                r.line(padRow(discLabel, '-' + fmt(order.discountAmount)));
            }
            r.line(DIVIDER);
            r.bold(true).line(padRow('TOTAL', fmt(order.total))).bold(false);
            r.line(DIVIDER);

            // ── Footer (mirrors ReceiptTemplate footer block) ──
            r.align('center');
            if (settings.receiptFooter) {
                settings.receiptFooter.split('\n').forEach((l: string) => {
                    wrapLine(l).forEach((ll: string) => r.line(ll));
                });
            } else {
                r.line('Thank you for your purchase!');
                r.line('Please come again.');
            }
            r.newline();
            r.line('*** ' + order.orderId.slice(-6).toUpperCase() + ' ***');
            // Feed and cut
            r.newline().newline().newline().cut();

            const result = r.encode();
            for (let i = 0; i < result.length; i += CHUNK_SIZE) {
                await char.writeValue(result.slice(i, i + CHUNK_SIZE));
            }
            toast.success('Printed successfully');
        } catch (err: any) {
            console.error('Print error:', err);
            toast.error(`Printing failed: ${err.message}`);
        }
    };

    return (
        <PrinterContext.Provider value={{ isConnected, isConnecting, deviceName, connect, disconnect, printReceipt }}>
            {children}
        </PrinterContext.Provider>
    );
}

export function usePrinter() {
    const context = useContext(PrinterContext);
    if (!context) throw new Error('usePrinter must be used within a PrinterProvider');
    return context;
}
