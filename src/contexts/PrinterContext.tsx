'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import EscPosEncoder from 'esc-pos-encoder';
import { toast } from 'sonner';

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
    const [device, setDevice] = useState<BluetoothDevice | null>(null);
    const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
    const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [deviceName, setDeviceName] = useState<string | null>(null);

    // Auto-reconnect logic could go here if we stored device ID, but browser security usually requires user gesture

    const connect = async () => {
        if (!navigator.bluetooth) {
            toast.error("Web Bluetooth is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        setIsConnecting(true);
        try {
            // Request device
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Standard Print Service
                ],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            setDevice(device);
            setDeviceName(device.name || 'Unknown Printer');

            // Connect to GATT server
            const server = await device.gatt?.connect();
            if (!server) throw new Error("Could not connect to GATT server");
            setServer(server);

            // Get Service
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');

            // Get Characteristic (Write)
            // UUIDs vary by printer, but 2AF1 is common for Write
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
            setCharacteristic(characteristic);

            device.addEventListener('gattserverdisconnected', handleDisconnect);
            toast.success(`Connected to ${device.name}`);

        } catch (error: any) {
            console.error("Bluetooth connection error:", error);
            toast.error(`Failed to connect: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setDevice(null);
        setServer(null);
        setCharacteristic(null);
        setDeviceName(null);
        toast.info("Printer disconnected");
    };

    const disconnect = () => {
        if (device && device.gatt?.connected) {
            device.gatt.disconnect();
        }
    };

    const printReceipt = async (order: any, settings: any) => {
        if (!characteristic) {
            toast.error("Printer not connected");
            return;
        }

        try {
            const encoder = new EscPosEncoder();

            let receipt = encoder.initialize();

            // Header
            receipt
                .align('center')
                .bold(true)
                .line(settings.name || 'Store Name')
                .bold(false);

            if (settings.address) receipt.line(settings.address);
            if (settings.phone) receipt.line(settings.phone);

            receipt
                .newline()
                .line('--------------------------------')
                .align('left')
                .line(`Order: #${order.orderId.slice(-6).toUpperCase()}`)
                .line(`Date: ${new Date().toLocaleString()}`)
                .line('--------------------------------')
                .newline();

            // Items
            order.items.forEach((item: any) => {
                const total = item.price * item.quantity;
                receipt
                    .line(`${item.name}`)
                    .line(`${item.quantity} x ${item.price.toLocaleString()} = ${total.toLocaleString()}`);
                if (item.variantName) {
                    receipt.line(`  (${item.variantName})`);
                }
            });

            receipt
                .line('--------------------------------')
                .align('right')
                .line(`Subtotal: ${order.subtotal.toLocaleString()}`)
                .line(`Tax: ${order.tax.toLocaleString()}`)
                .bold(true)
                .line(`Total: ${order.total.toLocaleString()}`)
                .bold(false)
                .newline()
                .align('center')
                .line(settings.receiptFooter || 'Thank you!')
                .newline()
                .newline()
                .cut();

            const result = receipt.encode();

            // Send data in chunks to avoid buffer overflow
            const chunkSize = 512;
            for (let i = 0; i < result.length; i += chunkSize) {
                const chunk = result.slice(i, i + chunkSize);
                await characteristic.writeValue(chunk);
            }

            toast.success("Printed successfully");

        } catch (error: any) {
            console.error("Print error:", error);
            toast.error(`Printing failed: ${error.message}`);
        }
    };

    return (
        <PrinterContext.Provider value={{
            isConnected: !!characteristic,
            isConnecting,
            deviceName,
            connect,
            disconnect,
            printReceipt
        }}>
            {children}
        </PrinterContext.Provider>
    );
}

export function usePrinter() {
    const context = useContext(PrinterContext);
    if (context === undefined) {
        throw new Error('usePrinter must be used within a PrinterProvider');
    }
    return context;
}
