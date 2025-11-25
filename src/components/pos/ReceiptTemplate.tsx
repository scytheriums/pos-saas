import React, { forwardRef } from 'react';
import { formatCurrencyWithSettings, formatDateTimeWithSettings } from '@/lib/format';
import { useTenantSettings } from '@/contexts/SettingsContext';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    variantName?: string;
}

interface ReceiptProps {
    storeName: string;
    storeAddress?: string;
    storePhone?: string;
    orderId: string;
    date: Date;
    cashierName: string;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    total: number;
    discountAmount?: number;
    discountName?: string;
    headerText?: string;
    footerText?: string;
    showLogo?: boolean;
    logoUrl?: string;
    isPreview?: boolean;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(
    ({ storeName, storeAddress, storePhone, orderId, date, cashierName, items, subtotal, tax, total, discountAmount, discountName, headerText, footerText, showLogo, logoUrl, isPreview }, ref) => {
        const settings = useTenantSettings();
        return (
            <div ref={ref} className={isPreview ? "w-full p-4 font-mono text-xs leading-tight text-black bg-white" : "hidden print:block print:w-full print:p-1 print:font-mono print:text-[10px] print:leading-tight text-black bg-white"}>
                <style type="text/css" media="print">
                    {`
                        @page { size: 58mm auto; margin: 0mm; }
                        body { margin: 0; padding: 0; }
                    `}
                </style>
                {/* Header */}
                <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
                    {showLogo && logoUrl && (
                        <div className="mb-2 flex justify-center">
                            <img
                                src={logoUrl}
                                alt="Business Logo"
                                className="h-12 w-auto max-w-[120px] object-contain"
                            />
                        </div>
                    )}
                    <h1 className="font-bold text-lg mb-1">{storeName}</h1>
                    {storeAddress && <p>{storeAddress}</p>}
                    {storePhone && <p>{storePhone}</p>}
                    {headerText && <p className="mt-2 whitespace-pre-wrap">{headerText}</p>}
                </div>

                {/* Transaction Details */}
                <div className="mb-2 text-[9px]">
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{formatDateTimeWithSettings(date, settings)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Order ID:</span>
                        <span>#{orderId.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cashier:</span>
                        <span>{cashierName}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="border-b border-black border-dashed mb-2 pb-2">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-black border-dashed">
                                <th className="pb-1">Item</th>
                                <th className="pb-1 text-right">Qty</th>
                                <th className="pb-1 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-1 pr-1">
                                        <div className="font-bold">{item.name}</div>
                                        {item.variantName && <div className="text-[8px] text-gray-600">{item.variantName}</div>}
                                    </td>
                                    <td className="py-1 text-right align-top">{item.quantity}</td>
                                    <td className="py-1 text-right align-top">{formatCurrencyWithSettings(item.price * item.quantity, settings)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col gap-1 border-b border-black border-dashed mb-4 pb-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrencyWithSettings(subtotal, settings)}</span>
                    </div>
                    {tax > 0 && (
                        <div className="flex justify-between">
                            <span>Tax ({settings.taxRate}%)</span>
                            <span>{formatCurrencyWithSettings(tax, settings)}</span>
                        </div>
                    )}
                    {discountAmount && discountAmount > 0 && (
                        <div className="flex justify-between text-green-700">
                            <span>Discount{discountName ? ` (${discountName})` : ''}</span>
                            <span>-{formatCurrencyWithSettings(discountAmount, settings)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-sm mt-1">
                        <span>Total</span>
                        <span>{formatCurrencyWithSettings(total, settings)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[9px]">
                    {footerText ? (
                        <p className="mb-1 whitespace-pre-wrap">{footerText}</p>
                    ) : (
                        <>
                            <p className="mb-1">Thank you for your purchase!</p>
                            <p>Please come again.</p>
                        </>
                    )}
                    <div className="mt-4 flex justify-center">
                        {/* Placeholder for Barcode/QR if needed */}
                        <div className="h-8 w-48 bg-black/10 flex items-center justify-center text-[8px]">
                            *** {orderId.slice(-6).toUpperCase()} ***
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
