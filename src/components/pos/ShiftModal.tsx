"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface Shift {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string | null;
  openingFloat: number;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  notes?: string | null;
  userId: string;
}

interface OpenShiftModalProps {
  open: boolean;
  onShiftOpened: (shift: Shift) => void;
}

export function OpenShiftModal({ open, onShiftOpened }: OpenShiftModalProps) {
  const [openingFloat, setOpeningFloat] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = async () => {
    const floatAmount = parseFloat(openingFloat) || 0;
    if (floatAmount < 0) {
      setError("Opening float cannot be negative.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingFloat: floatAmount, notes: notes || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to open shift.");
        return;
      }
      const data = await res.json();
      onShiftOpened(data.shift);
      setOpeningFloat("");
      setNotes("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[420px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Open Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="opening-float">Opening Float (Rp)</Label>
            <Input
              id="opening-float"
              type="number"
              min="0"
              placeholder="0"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Amount of cash in the drawer at the start of this shift.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="open-notes">Notes (optional)</Label>
            <Textarea
              id="open-notes"
              placeholder="Any notes for this shift..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleOpen} disabled={loading} className="w-full">
            {loading ? "Opening..." : "Open Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CloseShiftModalProps {
  open: boolean;
  shift: Shift;
  onClose: () => void;
  onShiftClosed: () => void;
}

export function CloseShiftModal({
  open,
  shift,
  onClose,
  onShiftClosed,
}: CloseShiftModalProps) {
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{
    cashSales: number;
    expectedCash: number;
  } | null>(null);

  // Fetch shift summary when modal opens
  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/shifts/${shift.id}`);
      if (res.ok) {
        const data = await res.json();
        setSummary({
          cashSales: data.shift.cashSales ?? 0,
          expectedCash: data.shift.expectedCash ?? 0,
        });
      }
    } catch {
      // summary is optional, continue without it
    }
  };

  const handleOpen = () => {
    fetchSummary();
  };

  const handleClose = async () => {
    const actual = parseFloat(actualCash);
    if (isNaN(actual) || actual < 0) {
      setError("Please enter a valid actual cash amount.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          actualCash: actual,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to close shift.");
        return;
      }
      onShiftClosed();
      setActualCash("");
      setNotes("");
      setSummary(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const actualNum = parseFloat(actualCash);
  const difference =
    summary && !isNaN(actualNum) ? actualNum - summary.expectedCash : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[440px]"
        onOpenAutoFocus={handleOpen}
      >
        <DialogHeader>
          <DialogTitle>Close Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {summary && (
            <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/40">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Float</span>
                <span>Rp {Number(shift.openingFloat).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Sales</span>
                <span>Rp {summary.cashSales.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1 mt-1">
                <span>Expected Cash</span>
                <span>Rp {summary.expectedCash.toLocaleString("id-ID")}</span>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="actual-cash">Actual Cash Count (Rp)</Label>
            <Input
              id="actual-cash"
              type="number"
              min="0"
              placeholder="0"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
            />
          </div>
          {difference !== null && (
            <div
              className={`text-sm font-medium ${
                difference === 0
                  ? "text-green-600"
                  : difference > 0
                  ? "text-blue-600"
                  : "text-destructive"
              }`}
            >
              Difference:{" "}
              {difference >= 0 ? "+" : ""}
              Rp {difference.toLocaleString("id-ID")}
              {difference > 0 && " (over)"}
              {difference < 0 && " (short)"}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="close-notes">Notes (optional)</Label>
            <Textarea
              id="close-notes"
              placeholder="Any notes for closing this shift..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={loading || !actualCash}>
            {loading ? "Closing..." : "Close Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
