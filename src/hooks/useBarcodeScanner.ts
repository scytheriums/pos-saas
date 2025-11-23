import { useEffect, useState } from "react";

export function useBarcodeScanner(onScan: (barcode: string) => void) {
    const [barcode, setBarcode] = useState("");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focused on input
            if ((e.target as HTMLElement).tagName === "INPUT") return;

            if (e.key === "Enter") {
                if (barcode) {
                    onScan(barcode);
                    setBarcode("");
                }
            } else if (e.key.length === 1) {
                setBarcode((prev) => prev + e.key);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [barcode, onScan]);
}
