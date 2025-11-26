"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, Menu, ScanBarcode, Globe, RotateCcw, Clock, Save, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaymentMethodSelector } from "@/components/pos/PaymentMethodSelector";
import { OfflineIndicator } from "@/components/pos/OfflineIndicator";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { cn } from "@/lib/utils";
import { formatCurrencyWithSettings, formatTimeWithSettings, formatDateWithSettings } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTenantSettings } from "@/contexts/SettingsContext";
import { ReceiptTemplate } from "@/components/pos/ReceiptTemplate";
import { useDebounce } from "@/hooks/use-debounce";
import { CustomerSelector } from "@/components/pos/CustomerSelector";

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


type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
    variantName?: string;
    sku?: string;
    imageUrl?: string | null;
};
type HeldCart = { id: string; items: CartItem[]; timestamp: number; total: number };

export default function POSPage() {
    const { t, language, setLanguage } = useLanguage();
    const settings = useTenantSettings();
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
    const [currentUser, setCurrentUser] = useState<any>(null);

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
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch (error) {
                console.error("Failed to fetch user details", error);
            }
        }
        fetchTenant();
        fetchUser();
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
        // Helper to get variant display name
        const getVariantName = () => {
            if (!variant) return undefined;
            if (variant.optionValues && variant.optionValues.length > 0) {
                return variant.optionValues.map((ov: any) => ov.value).join(' / ');
            }
            return variant.sku || 'Variant';
        };

        const itemToAdd: CartItem = {
            id: product.id,
            name: product.name,
            price: variant ? variant.price : product.price,
            quantity: 1,
            variantId: variant?.id,
            variantName: getVariantName(),
            sku: variant?.sku,
            imageUrl: variant?.imageUrl || product.imageUrl
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
    const taxRate = (tenant?.taxRate || 11) / 100; // Convert percentage to decimal
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
            cashierName: currentUser?.name || cashierName,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                variantName: item.variantName
            })),
            subtotal: total,
            tax: tax,
            total: grandTotal,
            discountAmount: discountAmount,
            discountName: appliedDiscount?.name
        });

        if (settings.autoPrintReceipt) {
            setTimeout(() => {
                window.print();
            }, 500);
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

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            <div className="print:hidden h-full flex flex-col">
                {/* Header */}
                <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 h-16">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Menu className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Nexus POS</h1>
                        <OfflineIndicator />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeWithSettings(new Date(), settings)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}>
                            <Globe className="w-4 h-4" />
                            <span>{language.toUpperCase()}</span>
                        </div>
                        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-primary/20">
                            {tenant?.name?.substring(0, 2).toUpperCase() || "ST"}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Product Grid */}
                    <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
                        {/* Search Bar */}
                        <div className="relative shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                className="pl-12 h-12 text-lg rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder={t.pos.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                {products.length} products loaded
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1 -mr-4 pr-4 overflow-y-auto">
                            {products.length === 0 && loading ? (
                                <div className="flex items-center justify-center h-64 text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span>Loading products...</span>
                                    </div>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                                    <PackageOpen className="w-12 h-12 opacity-50" />
                                    <span>No products found</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-6">
                                    {products.map((product) => (
                                        <Card
                                            key={product.id}
                                            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-100 group overflow-hidden"
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                                {product.imageUrl ? (
                                                    <Image
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50 group-hover:scale-105 transition-transform duration-300">
                                                        <PackageOpen className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-primary shadow-sm">
                                                    {formatCurrencyWithSettings(product.price || product.variants?.[0]?.price || 0, settings)}
                                                </div>
                                            </div>
                                            <CardContent className="p-3">
                                                <h3 className="font-semibold text-gray-800 truncate" title={product.name}>{product.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                    {product.variants?.length ? `${product.variants.length} variants` : 'Single item'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {/* Sentinel for Infinite Scroll */}
                                    <div ref={observerTarget} className="col-span-full h-10 flex items-center justify-center">
                                        {loading && page > 1 && (
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Cart Panel */}
                    <div className="w-[400px] bg-white border-l shadow-xl flex flex-col shrink-0 z-10">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                                <h2 className="font-bold text-lg text-gray-800">{t.pos.currentOrder}</h2>
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                                    {cart.length}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50 border-orange-200" title="Held Carts">
                                            <Clock className="w-4 h-4" />
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
                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200" onClick={holdCart} disabled={cart.length === 0} title="Hold Cart">
                                    <Save className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setCart([])} disabled={cart.length === 0} title="Clear Cart">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 opacity-50">
                                    <ShoppingCart className="w-16 h-16" />
                                    <p className="font-medium">Cart is empty</p>
                                    <p className="text-sm text-center px-8">Scan a barcode or select products from the grid to start</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={(item.variantId || item.id)} className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-primary/20 transition-colors">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                                                {item.imageUrl ? (
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                    />
                                                ) : (
                                                    <PackageOpen className="w-6 h-6 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-medium text-gray-800 truncate pr-2">{item.name}</h4>
                                                    <button onClick={() => removeFromCart(item.variantId || item.id)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="font-bold text-primary">{formatCurrencyWithSettings(item.price * item.quantity, settings)}</div>
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                                        <button
                                                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-600"
                                                            onClick={() => updateQuantity(item.variantId || item.id, -1)}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-600"
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
                        </ScrollArea>

                        <div className="p-4 bg-white border-t space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                            {/* Customer Selector */}
                            <CustomerSelector
                                selectedCustomer={selectedCustomer}
                                onSelectCustomer={setSelectedCustomer}
                            />

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t.pos.subtotal}</span>
                                    <span className="font-medium">{formatCurrencyWithSettings(total, settings)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t.pos.tax} (11%)</span>
                                    <span className="font-medium">{formatCurrencyWithSettings(tax, settings)}</span>
                                </div>

                                {/* Discount Section */}
                                {!appliedDiscount ? (
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Discount code (optional)"
                                                value={discountCode}
                                                onChange={(e) => {
                                                    setDiscountCode(e.target.value.toUpperCase());
                                                    setDiscountError("");
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                                                className={cn("flex-1 text-xs", discountError && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={applyDiscount}
                                                disabled={!discountCode.trim() || validatingDiscount}
                                                className="text-xs"
                                            >
                                                {validatingDiscount ? "..." : "Apply"}
                                            </Button>
                                        </div>
                                        {discountError && (
                                            <span className="text-[10px] text-red-500 font-medium px-1">{discountError}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-sm bg-green-50 -mx-4 px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-700 font-medium">Discount: {appliedDiscount.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={removeDiscount}
                                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                        <span className="font-medium text-green-700">-{formatCurrencyWithSettings(discountAmount, settings)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-end pt-4 border-t border-dashed">
                                    <span className="text-lg font-medium">{t.pos.total}</span>
                                    <span className="text-3xl font-bold text-primary">{formatCurrencyWithSettings(grandTotal, settings)}</span>
                                </div>
                            </div>
                            <Button
                                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl"
                                size="lg"
                                disabled={cart.length === 0 || loading}
                                onClick={handleCheckout}
                            >
                                {loading ? "Processing..." : t.pos.checkout}
                            </Button>
                        </div>
                    </div>

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
                    storeName={tenant?.name || "Nexus POS Store"}
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
