'use client';

import { Bluetooth, BluetoothOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrinter } from "@/contexts/PrinterContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PrinterButton() {
    const { isConnected, isConnecting, deviceName, connect, disconnect } = usePrinter();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={isConnected ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                >
                    {isConnected ? (
                        <>
                            <Bluetooth className="w-4 h-4" />
                            <span className="hidden sm:inline">{deviceName}</span>
                        </>
                    ) : (
                        <>
                            <BluetoothOff className="w-4 h-4" />
                            <span className="hidden sm:inline">Printer</span>
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Bluetooth Printer</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isConnected ? (
                    <>
                        <div className="px-2 py-2 text-sm text-muted-foreground">
                            Connected to: {deviceName}
                        </div>
                        <DropdownMenuItem onClick={disconnect} className="text-red-600">
                            <BluetoothOff className="w-4 h-4 mr-2" />
                            Disconnect
                        </DropdownMenuItem>
                    </>
                ) : (
                    <DropdownMenuItem onClick={connect} disabled={isConnecting}>
                        <Bluetooth className="w-4 h-4 mr-2" />
                        {isConnecting ? "Connecting..." : "Connect Printer"}
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <div className="px-2 py-2 text-xs text-muted-foreground">
                    {!isConnected && "Direct printing to thermal printers"}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
