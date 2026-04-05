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
import { type Shift } from "./ShiftModal";

interface PettyCashModalProps {
  open: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PettyCashModal({ open, shift, onClose, onSuccess }: PettyCashModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setAmount("");
    setReason("");
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason for this payout.");
      return;
    }
    if (!shift?.id) {
      setError("No active shift found.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/petty-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, reason: reason.trim(), shiftId: shift.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to record payout.");
        return;
      }
      setSuccess(true);
      onSuccess?.();
      // Auto-close after short delay
      setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Petty Cash Payout</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-green-600 font-semibold text-lg">✓ Payout recorded</p>
            <p className="text-sm text-muted-foreground">Rp {parseFloat(amount).toLocaleString("id-ID")} — {reason}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="payout-amount">Amount (Rp)</Label>
              <Input
                id="payout-amount"
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payout-reason">Reason</Label>
              <Textarea
                id="payout-reason"
                placeholder="e.g. Office supplies, Delivery fee..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        {!success && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Record Payout"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
