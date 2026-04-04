"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, Menu, ScanBarcode, Globe, RotateCcw, Clock, Save, PackageOpen, Layers, ChevronDown, X, Bluetooth, BluetoothOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaymentMethodSelector } from "@/components/pos/PaymentMethodSelector";
import { OfflineIndicator } from "@/components/pos/OfflineIndicator";
import { db } from "@/lib/db";
import Link from "next/link";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { cn } from "@/lib/utils";
import { formatCurrencyWithSettings, formatTimeWithSettings, formatDateWithSettings } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTenantSettings } from "@/contexts/SettingsContext";
import { ReceiptTemplate } from "@/components/pos/ReceiptTemplate";
import { useDebounce } from "@/hooks/use-debounce";
import { CustomerSelector } from "@/components/pos/CustomerSelector";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { authClient, type AuthUser } from "@/lib/auth-client";
import { usePrinter } from "@/contexts/PrinterContext";

// Sound effect helper
const playSound = (type: 'success' | 'error' | 'click', settings: any) => {
    if (!settings.soundEffects) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1); // A6
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
        oscillator.frequency.linearRampToValueAtTime(110, audioContext.currentTime + 0.2); // A2
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'click') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
    }
};

type CartItem = { id: string; name: string; price: number; quantity: number; variantId?: string; variantName?: string };
type HeldCart = { id: string; items: CartItem[]; timestamp: number; total: number };

export default function POSPage() {
    const { t, language, setLanguage } = useLanguage();
    const settings = useTenantSettings();
    const { isConnected: btConnected, isConnecting: btConnecting, deviceName: btDeviceName, connect: btConnect, disconnect: btDisconnect, printReceipt } = usePrinter();
    const { data: session } = authClient.useSession();
    const isOwner = (session?.user as AuthUser | undefined)?.role === 'owner';
    const [cart, setCart] = useState<CartItem[]>([]);
    const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPaymentSelector, setShowPaymentSelector] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [discountCode, setDiscountCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [validatingDiscount, setValidatingDiscount] = useState(false);
    const [discountError, setDiscountError] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; email?: string } | null>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    const debouncedSearch = useDebounce(searchQuery, 500);

    useEffect(() => {
        async function fetchTenant() {
            try {
                const res = await fetch('/api/tenant/me');
                if (res.ok) {
                    const data = await res.json();
                    setTenant(data);
                }
            } catch (error) {
                console.error("Failed to fetch tenant details", error);
            }
        }
        fetchTenant();
    }, []);

    // Receipt state
    const [lastOrder, setLastOrder] = useState<any>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    // Mark as mounted on client side
    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset pagination when search query changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
    }, [debouncedSearch]);

    // Fetch products from API
    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (debouncedSearch) params.append('search', debouncedSearch);
                params.append('page', page.toString());
                params.append('limit', '20');

                const res = await fetch(`/api/products?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    const newProducts = data.products || [];

                    if (page === 1) {
                        setProducts(newProducts);
                    } else {
                        setProducts(prev => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const uniqueNewProducts = newProducts.filter((p: any) => !existingIds.has(p.id));
                            return [...prev, ...uniqueNewProducts];
                        });
                    }

                    setHasMore(newProducts.length === 20);
                }
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [page, debouncedSearch]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading]);

    // Load held carts from local storage on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pos-held-carts');
            if (saved) {
                try {
                    setHeldCarts(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load held carts", e);
                }
            }
        }
    }, []);

    // Save held carts to local storage whenever they change (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined' && mounted) {
            localStorage.setItem('pos-held-carts', JSON.stringify(heldCarts));
        }
    }, [heldCarts, mounted]);

    const addToCart = (product: any, variant?: any) => {
        const itemToAdd = {
            id: product.id,
            name: product.name,
            price: variant ? variant.price : product.price,
            quantity: 1,
            variantId: variant?.id,
            variantName: variant?.optionValues?.length
                ? variant.optionValues.map((ov: any) => ov.value).join(' / ')
                : undefined,
        };

        setCart((prev) => {
            const existing = prev.find((item) => (item.variantId || item.id) === (itemToAdd.variantId || itemToAdd.id));
            if (existing) {
                return prev.map((item) =>
                    (item.variantId || item.id) === (itemToAdd.variantId || itemToAdd.id)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, itemToAdd];
        });
        playSound('click', settings);
    };

    const handleProductClick = (product: any) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setVariantModalOpen(true);
        } else {
            addToCart(product);
        }
    };

    const handleVariantAddToCart = (variant: any) => {
        if (selectedProduct) {
            addToCart(selectedProduct, variant);
            setVariantModalOpen(false);
            setSelectedProduct(null);
        }
    };

    // Barcode Scanner Logic
    useBarcodeScanner((code) => {
        console.log("Scanned:", code);
        // Check variants first as they are the sellable units
        for (const p of products) {
            if (p.variants) {
                const variant = p.variants.find((v: any) => v.barcode === code);
                if (variant) {
                    addToCart(p, variant);
                    return;
                }
            }
        }
        alert(`Product not found: ${code}`);
        playSound('error', settings);
    });

    const removeFromCart = (cartItemId: string) => {
        setCart((prev) => prev.filter((item) => (item.variantId || item.id) !== cartItemId));
        playSound('click', settings);
    };

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if ((item.variantId || item.id) === cartItemId) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : item;
                }
                return item;
            })
        );
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxRate = (tenant?.taxRate ?? 0) / 100;
    const tax = total * taxRate;
    const grandTotal = total + tax - discountAmount;

    const applyDiscount = async () => {
        if (!discountCode.trim()) return;

        setValidatingDiscount(true);
        setDiscountError("");
        try {
            const res = await fetch('/api/discounts/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: discountCode, subtotal: total }),
            });

            if (res.ok) {
                const data = await res.json();
                setAppliedDiscount(data.discount);
                setDiscountAmount(data.discountAmount);
                playSound('success', settings);
                // alert(`Discount applied: ${data.discount.name}`); // Removed alert for better UX
            } else {
                const error = await res.json();
                setDiscountError(error.error || 'Invalid discount code');
                setAppliedDiscount(null);
                setDiscountAmount(0);
                playSound('error', settings);
            }
        } catch (error) {
            console.error('Failed to validate discount', error);
            setDiscountError('Failed to validate discount code');
        } finally {
            setValidatingDiscount(false);
        }
    };

    const removeDiscount = () => {
        setAppliedDiscount(null);
        setDiscountAmount(0);
        setDiscountCode("");
        setDiscountError("");
    };

    const holdCart = () => {
        if (cart.length === 0) return;
        const newHeldCart: HeldCart = {
            id: Date.now().toString(),
            items: [...cart],
            timestamp: Date.now(),
            total: grandTotal
        };
        setHeldCarts(prev => [newHeldCart, ...prev]);
        setCart([]);
    };

    const restoreCart = (heldCartId: string) => {
        const cartToRestore = heldCarts.find(c => c.id === heldCartId);
        if (cartToRestore) {
            if (cart.length > 0) {
                const currentHeld: HeldCart = {
                    id: Date.now().toString(),
                    items: [...cart],
                    timestamp: Date.now(),
                    total: grandTotal
                };
                setHeldCarts(prev => [currentHeld, ...prev.filter(c => c.id !== heldCartId)]);
            } else {
                setHeldCarts(prev => prev.filter(c => c.id !== heldCartId));
            }
            setCart(cartToRestore.items);
        }
    };

    const deleteHeldCart = (id: string) => {
        setHeldCarts(prev => prev.filter(c => c.id !== id));
    };

    const processSuccessfulOrder = (orderId: string, cashierName: string, isOffline = false) => {
        setLastOrder({
            orderId: orderId,
            date: new Date(),
            cashierName: cashierName,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                variantName: item.variantName,
            })),
            subtotal: total,
            tax: tax,
            total: grandTotal,
            discountAmount: discountAmount,
            discountName: appliedDiscount?.name
        });

        if (settings.autoPrintReceipt) {
            const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            if (btConnected) {
                // Direct Bluetooth thermal print (mobile & desktop)
                const orderForPrint = {
                    orderId: orderId,
                    date: new Date(),
                    cashierName: cashierName,
                    items: cart.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        variantName: item.variantName,
                    })),
                    subtotal: total,
                    tax: tax,
                    total: grandTotal,
                    discountAmount: discountAmount,
                    discountName: appliedDiscount?.name,
                };
                printReceipt(orderForPrint, {
                    name: tenant?.name || 'Awan POS Store',
                    address: tenant?.address,
                    phone: tenant?.phone,
                    receiptHeader: tenant?.receiptHeader,
                    receiptFooter: tenant?.receiptFooter,
                    taxRate: tenant?.taxRate,
                });
            } else if (!isMobile) {
                // Desktop only: fallback to browser print dialog
                setTimeout(() => {
                    window.print();
                }, 500);
            }
            // Mobile without Bluetooth: skip silent — printer not connected
        }
        playSound('success', settings);

        alert(isOffline ? 'Order saved offline! It will sync when online.' : `Order ${orderId} completed successfully!`);

        // Reset cart and discount state
        setCart([]);
        setDiscountCode("");
        setAppliedDiscount(null);
        setDiscountAmount(0);
        setSelectedCustomer(null);
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setShowPaymentSelector(true);
    };

    const processCheckout = async (paymentMethod: string, cashTendered?: number, customerNameInput?: string) => {
        setLoading(true);
        setShowPaymentSelector(false);

        const orderData = {
            items: cart.map(item => ({
                productId: item.id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price
            })),
            total: grandTotal,
            tenantId: "default-tenant",
            paymentMethod,
            cashTendered,
            change: cashTendered ? cashTendered - grandTotal : undefined,
            customerId: selectedCustomer?.id, // Use selected customer ID
            discountId: appliedDiscount?.id,
            discountAmount: discountAmount
        };

        try {
            if (navigator.onLine) {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData),
                });

                if (!res.ok) throw new Error("Checkout failed");
                const data = await res.json();
                processSuccessfulOrder(data.order.id, "Current Cashier"); // Replace with actual cashier name
            } else {
                // Offline fallback
                const offlineId = await db.orders.add({
                    items: orderData.items,
                    total: orderData.total,
                    timestamp: Date.now(),
                    synced: false,
                    tenantId: orderData.tenantId,
                    paymentMethod,
                    cashTendered,
                    change: orderData.change,
                    customerId: orderData.customerId,
                    discountId: orderData.discountId,
                    discountAmount: orderData.discountAmount
                });
                processSuccessfulOrder(`OFF-${offlineId}`, "Offline Cashier", true);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Checkout failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    // Reusable cart panel content (used in both desktop sidebar and mobile overlay)
    const cartTaxLabel = taxRate > 0
        ? `${t.pos.tax} (${Math.round(taxRate * 100)}%)`
        : t.pos.tax;

    const CartPanelContent = (
        <>
            {/* Cart Header */}
            <div className="p-2 md:p-3 lg:p-4 border-b flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <h2 className="font-bold text-sm md:text-base lg:text-lg text-gray-800">{t.pos.currentOrder}</h2>
                    {cart.length > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {cart.length}
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    {/* Held Carts */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50 border-orange-200" title="Held Carts">
                                <Layers className="w-3.5 h-3.5" />
                                {heldCarts.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{heldCarts.length}</span>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Held Carts</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[300px] pr-4">
                                {heldCarts.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">No held carts</div>
                                ) : (
                                    <div className="space-y-3">
                                        {heldCarts.map((held) => (
                                            <div key={held.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div>
                                                    <div className="font-medium">{formatTimeWithSettings(held.timestamp, settings)}</div>
                                                    <div className="text-sm text-gray-500">{held.items.length} items • {formatCurrencyWithSettings(held.total, settings)}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => restoreCart(held.id)}>
                                                        <RotateCcw className="w-4 h-4 mr-1" />
                                                        Restore
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteHeldCart(held.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200" onClick={holdCart} disabled={cart.length === 0} title="Hold Cart">
                        <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setCart([])} disabled={cart.length === 0} title="Clear Cart">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-2 md:p-3 lg:p-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 md:h-48 text-gray-400 gap-2 opacity-50">
                        <ShoppingCart className="w-10 h-10 md:w-14 md:h-14" />
                        <p className="font-medium text-sm">Cart is empty</p>
                        <p className="text-[10px] md:text-xs text-center px-6">Scan a barcode or tap a product to start</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {cart.map((item) => (
                            <div key={(item.variantId || item.id)} className="flex gap-2 p-2 md:p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-primary/20 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <div className="min-w-0 pr-1.5 flex-1">
                                            <h4 className="font-medium text-gray-800 truncate text-xs md:text-sm">{item.name}</h4>
                                            {item.variantName && (
                                                <p className="text-[10px] md:text-xs text-gray-500 truncate">{item.variantName}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.variantId || item.id)}
                                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="font-bold text-primary text-xs md:text-sm">{formatCurrencyWithSettings(item.price * item.quantity, settings)}</div>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded overflow-hidden">
                                            <button
                                                className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 active:bg-gray-300"
                                                onClick={() => updateQuantity(item.variantId || item.id, -1)}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-xs font-bold w-5 md:w-6 text-center select-none">{item.quantity}</span>
                                            <button
                                                className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 active:bg-gray-300"
                                                onClick={() => updateQuantity(item.variantId || item.id, 1)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Footer */}
            <div className="p-2 md:p-3 lg:p-4 bg-white border-t space-y-2 md:space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <CustomerSelector
                    selectedCustomer={selectedCustomer}
                    onSelectCustomer={setSelectedCustomer}
                />

                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.pos.subtotal}</span>
                        <span className="font-medium">{formatCurrencyWithSettings(total, settings)}</span>
                    </div>
                    {tax > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cartTaxLabel}</span>
                            <span className="font-medium">{formatCurrencyWithSettings(tax, settings)}</span>
                        </div>
                    )}

                    {/* Discount Section */}
                    {!appliedDiscount ? (
                        <div className="flex flex-col gap-1 w-full pt-1">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Discount code (optional)"
                                    value={discountCode}
                                    onChange={(e) => {
                                        setDiscountCode(e.target.value.toUpperCase());
                                        setDiscountError("");
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                                    className={cn("flex-1 h-9 text-xs", discountError && "border-red-500 focus-visible:ring-red-500")}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={applyDiscount}
                                    disabled={!discountCode.trim() || validatingDiscount}
                                    className="text-xs h-9 px-3"
                                >
                                    {validatingDiscount ? "..." : "Apply"}
                                </Button>
                            </div>
                            {discountError && (
                                <span className="text-[10px] text-red-500 font-medium px-1">{discountError}</span>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center text-sm rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-green-700 font-medium text-xs">🏷 {appliedDiscount.name}</span>
                                <button
                                    onClick={removeDiscount}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <span className="font-semibold text-green-700">-{formatCurrencyWithSettings(discountAmount, settings)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-dashed">
                        <span className="text-sm md:text-base font-semibold text-gray-700">{t.pos.total}</span>
                        <span className="text-lg md:text-2xl font-bold text-primary">{formatCurrencyWithSettings(grandTotal, settings)}</span>
                    </div>
                </div>

                <Button
                    className="w-full h-10 md:h-12 text-sm md:text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl"
                    size="lg"
                    disabled={cart.length === 0 || loading}
                    onClick={handleCheckout}
                >
                    {loading ? "Processing..." : t.pos.checkout}
                </Button>
            </div>
        </>
    );

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            {isOwner && (
                <div className="print:hidden h-full shrink-0 hidden xl:block">
                    <Sidebar />
                </div>
            )}
            <div className="print:hidden h-full flex flex-col flex-1 overflow-hidden min-w-0">
                {/* ── Header ── */}
                <header className="bg-white border-b px-2 md:px-4 lg:px-6 py-2 md:py-3 flex items-center justify-between shrink-0 h-12 md:h-14 lg:h-16">
                    <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
                        <Link href="/dashboard/analytics" className="p-1 md:p-1.5 bg-primary/10 rounded-lg shrink-0 xl:hidden">
                            <Menu className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </Link>
                        <h1 className="text-sm md:text-base lg:text-xl font-bold text-gray-800 truncate">{tenant?.name || 'Awan POS'}</h1>
                        <OfflineIndicator />
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Clock: hidden on small screens */}
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-[11px] font-medium text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeWithSettings(new Date(), settings)}</span>
                        </div>
                        {/* Bluetooth Printer Indicator / Connect */}
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors",
                                btConnected
                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                    : btConnecting
                                        ? "bg-yellow-50 text-yellow-700"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            )}
                            onClick={() => btConnected ? btDisconnect() : btConnect()}
                            disabled={btConnecting}
                            title={btConnected ? `Connected: ${btDeviceName} (click to disconnect)` : btConnecting ? 'Connecting...' : 'Connect Bluetooth Printer'}
                        >
                            {btConnecting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : btConnected ? (
                                <Bluetooth className="w-3.5 h-3.5" />
                            ) : (
                                <BluetoothOff className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                                {btConnecting ? 'Connecting' : btConnected ? btDeviceName : 'Printer'}
                            </span>
                            {btConnected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </button>
                        {/* Language toggle */}
                        <button
                            className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors"
                            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language.toUpperCase()}</span>
                        </button>
                        {/* Avatar */}
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-md shrink-0">
                            {tenant?.name?.substring(0, 2).toUpperCase() || 'ST'}
                        </div>
                    </div>
                </header>

                {/* ── Main ── */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* Left: Product Grid */}
                    <div className="flex-1 flex flex-col p-2 md:p-3 lg:p-5 gap-2 md:gap-3 lg:gap-4 overflow-hidden min-w-0">
                        {/* Search */}
                        <div className="relative shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                className="pl-9 md:pl-10 h-9 md:h-10 lg:h-12 text-sm rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder={t.pos.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Product count badge */}
                        {!loading && products.length > 0 && (
                            <p className="text-xs text-gray-400 -mt-1 pl-1 shrink-0">{products.length} products</p>
                        )}

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto">
                            {products.length === 0 && loading ? (
                                <div className="flex items-center justify-center h-48 text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="text-sm">Loading products...</span>
                                    </div>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                                    <PackageOpen className="w-10 h-10 opacity-40" />
                                    <span className="text-sm">No products found</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5 md:gap-2 lg:gap-3 pb-20 lg:pb-4">
                                    {products.map((product) => {
                                        const imgUrl = product.imageUrl || product.variants?.[0]?.imageUrl;
                                        return (
                                            <Card
                                                key={product.id}
                                                className="cursor-pointer hover:shadow-md active:scale-[0.97] transition-all duration-150 border-gray-100 group overflow-hidden select-none"
                                                onClick={() => handleProductClick(product)}
                                            >
                                                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                                    {imgUrl ? (
                                                        <img
                                                            src={imgUrl}
                                                            alt={product.name}
                                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                                            <PackageOpen className="w-10 h-10" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/50 to-transparent px-2 py-1.5">
                                                        <span className="text-xs font-bold text-white drop-shadow">
                                                            {formatCurrencyWithSettings(product.price || product.variants?.[0]?.price || 0, settings)}
                                                        </span>
                                                    </div>
                                                    {product.variants?.length > 0 && (
                                                        <div className="absolute top-1.5 left-1.5 bg-primary/80 text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                                            {product.variants.length}v
                                                        </div>
                                                    )}
                                                </div>
                                                <CardContent className="p-1.5 md:p-2 lg:p-3">
                                                    <h3 className="font-semibold text-gray-800 truncate text-[11px] md:text-xs lg:text-sm" title={product.name}>{product.name}</h3>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    {/* Infinite scroll sentinel */}
                                    <div ref={observerTarget} className="col-span-full h-8 flex items-center justify-center">
                                        {loading && page > 1 && (
                                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Desktop Cart Panel (lg+) ── */}
                    <div className="hidden lg:flex w-[380px] bg-white border-l shadow-xl flex-col shrink-0 z-10">
                        {CartPanelContent}
                    </div>

                    {/* ── Mobile Cart FAB (< lg) ── */}
                    {!showMobileCart && (
                        <button
                            className="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2.5 rounded-full shadow-2xl shadow-primary/30 font-semibold text-xs active:scale-95 transition-transform"
                            onClick={() => setShowMobileCart(true)}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {cart.length > 0 && (
                                <span className="bg-white text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                                    {cart.length}
                                </span>
                            )}
                            <span>{formatCurrencyWithSettings(grandTotal, settings)}</span>
                        </button>
                    )}

                    {/* ── Mobile Cart Overlay (< lg) ── */}
                    {showMobileCart && (
                        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                                onClick={() => setShowMobileCart(false)}
                            />
                            {/* Drawer */}
                            <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85dvh] min-h-[50dvh]">
                                {/* Drag handle + close */}
                                <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                                    <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                                    <button
                                        className="ml-auto p-1 rounded-full text-gray-500 hover:bg-gray-100"
                                        onClick={() => setShowMobileCart(false)}
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0">
                                    {CartPanelContent}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedProduct && (
                        <VariantSelector
                            open={variantModalOpen}
                            onClose={() => setVariantModalOpen(false)}
                            product={selectedProduct as any}
                            onAddToCart={handleVariantAddToCart}
                        />
                    )}

                    <PaymentMethodSelector
                        open={showPaymentSelector}
                        onClose={() => setShowPaymentSelector(false)}
                        total={grandTotal}
                        onConfirm={processCheckout}
                        selectedCustomer={selectedCustomer}
                    />
                </div>
            </div>

            {/* Hidden Receipt Template */}
            {lastOrder && (
                <ReceiptTemplate
                    ref={receiptRef}
                    storeName={tenant?.name || "Awan POS Store"}
                    storeAddress={tenant?.address || "123 Tech Street, Jakarta"}
                    storePhone={tenant?.phone || "+62 812 3456 7890"}
                    headerText={tenant?.receiptHeader}
                    footerText={tenant?.receiptFooter}
                    showLogo={tenant?.showLogo !== false}
                    logoUrl={tenant?.logoUrl}
                    {...lastOrder}
                />
            )}
        </div>
    );
}
