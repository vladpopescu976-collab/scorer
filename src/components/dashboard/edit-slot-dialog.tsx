"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBlockedSlot } from "@/lib/actions/blocked-slots";
import { localDateTimeToIso } from "@/lib/datetime";

/**
 * Schimbă ora unui interval notat de proprietar — oră luată la telefon sau
 * eveniment propriu — fără să-l șteargă și să-l pună la loc.
 */
export function EditSlotDialog({
  slotId,
  titlu,
  fieldName,
  defaultDate,
  defaultStart,
  defaultEnd,
  open,
  onOpenChange,
}: {
  slotId: string;
  titlu: string;
  fieldName: string;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError("");

    if (!date || !start || !end) {
      setError("Alege data și intervalul orar.");
      return;
    }

    const startTime = localDateTimeToIso(date, start);
    const endTime = localDateTimeToIso(date, end);
    if (!startTime || !endTime) {
      setError("Data sau ora aleasă nu este validă.");
      return;
    }

    startTransition(async () => {
      const result = await updateBlockedSlot({ id: slotId, startTime, endTime });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Ora intervalului a fost schimbată.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Schimbă ora</DialogTitle>
          <DialogDescription>
            {titlu} · {fieldName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-slot-date">Dată</Label>
            <Input
              id="edit-slot-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-slot-start">Ora start</Label>
              <Input
                id="edit-slot-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-slot-end">Ora sfârșit</Label>
              <Input
                id="edit-slot-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={isPending}>
            {isPending ? "Se salvează…" : "Salvează ora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
