import React, { forwardRef } from 'react';
import { formatDateTimeWithSettings } from '@/lib/format';
import { useTenantSettings } from '@/contexts/SettingsContext';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    variantName?: string;
    itemDiscount?: number;
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
    redeemDiscount?: number;
    pointsEarned?: number;
    paymentEntries?: { method: string; amount: number }[];
    headerText?: string;
    footerText?: string;
    showLogo?: boolean;
    logoUrl?: string;
    isPreview?: boolean;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(
    ({ storeName, storeAddress, storePhone, orderId, date, cashierName, items, subtotal, tax, total, discountAmount, discountName, redeemDiscount, pointsEarned, paymentEntries, headerText, footerText, showLogo, logoUrl, isPreview }, ref) => {
        const settings = useTenantSettings();
        const fmt = (n: number) =>
            new Intl.NumberFormat(settings.currency === 'IDR' ? 'id-ID' : 'en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(n);
        return (
            <div ref={ref} className={isPreview ? "w-[220px] p-1 font-mono text-[10px] leading-tight text-black bg-white" : "hidden print:block print:w-full print:p-1 print:font-mono print:text-[10px] print:leading-tight text-black bg-white"}>
                <style type="text/css" media="print">
                    {`
                        @page { size: 58mm auto; margin: 0mm; }
                        body { margin: 0; padding: 0; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                        img { display: block !important; visibility: visible !important; }
                    `}
                </style>
                {/* Header */}
                <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
                    {showLogo && logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt="Business Logo"
                            className="mx-auto mb-2 h-12 object-contain"
                        />
                    )}
                    <h1 className="font-bold text-sm mb-1">{storeName}</h1>
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
                                <React.Fragment key={index}>
                                    <tr>
                                        <td className="py-1 pr-1">
                                            <div className="font-bold">{item.name}</div>
                                            {item.variantName && <div className="text-[9px] font-medium">{item.variantName}</div>}
                                        </td>
                                        <td className="py-1 text-right align-top">{item.quantity}</td>
                                        <td className={`py-1 text-right align-top${(item.itemDiscount ?? 0) > 0 ? " line-through" : ""}`}>{fmt(item.price * item.quantity)}</td>
                                    </tr>
                                    {(item.itemDiscount ?? 0) > 0 && (
                                        <tr>
                                            <td className="pb-1 text-[9px] italic" colSpan={2}>└ Diskon item</td>
                                            <td className="pb-1 text-right text-[9px] italic">-{fmt(item.itemDiscount!)}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col gap-1 border-b border-black border-dashed mb-4 pb-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{fmt(subtotal)}</span>
                    </div>
                    
                    {tax > 0 && (
                        <div className="flex justify-between">
                            <span>Tax ({settings.taxRate}%)</span>
                            <span>{fmt(tax)}</span>
                        </div>
                    )}
                    {(discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between font-medium">
                            <span>Discount{discountName ? ` (${discountName})` : ''}</span>
                            <span>-{fmt(discountAmount!)}</span>
                        </div>
                    )}
                    {(redeemDiscount ?? 0) > 0 && (
                        <div className="flex justify-between font-medium">
                            <span>Points Redeemed</span>
                            <span>-{fmt(redeemDiscount!)}</span>
                        </div>
                    )}
                    {(() => {
                        const totalItemDiscount = items.reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
                        return totalItemDiscount > 0 ? (
                            <div className="flex justify-between text-[9px] italic">
                                <span>Item Discount</span>
                                <span>-{fmt(totalItemDiscount)}</span>
                            </div>
                        ) : null;
                    })()}
                    <div className="flex justify-between font-bold text-sm mt-1">
                        <span>Total</span>
                        <span>{fmt(total)}</span>
                    </div>
                    {/* Payment breakdown */}
                    {paymentEntries && paymentEntries.length > 0 && (
                        <>
                            <div className="mt-1 pt-1 border-t border-dashed border-black">
                                {paymentEntries.map((entry, i) => (
                                    <div key={i} className="flex justify-between text-[9px]">
                                        <span>{entry.method.replace('_', ' ')}</span>
                                        <span>{fmt(entry.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            {paymentEntries.reduce((s, e) => s + e.amount, 0) > total && (
                                <div className="flex justify-between text-[9px] font-bold">
                                    <span>Change</span>
                                    <span>{fmt(paymentEntries.reduce((s, e) => s + e.amount, 0) - total)}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Points Earned */}
                {(pointsEarned ?? 0) > 0 && (
                    <div className="flex justify-between text-[9px] font-bold mb-4">
                        <span>&#x2B50; Points Earned</span>
                        <span>+{pointsEarned}</span>
                    </div>
                )}

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
