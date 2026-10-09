"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { apiFetch } from "@/lib/client";

/**
 * Deleting an event also deletes every RSVP (the FK cascades). That is not
 * recoverable, so the organiser has to type the event title — a confirm()
 * dialog is dismissed reflexively, typing the name is not.
 */
export function DangerZone({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim() === eventTitle.trim();

  async function remove() {
    setError(null);
    setDeleting(true);
    try {
      await apiFetch(`/api/events/${eventId}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the event.");
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/50">
      <div className="border-b border-red-200 px-5 py-4">
        <h2 className="text-base font-semibold text-red-900">Delete this event</h2>
        <p className="mt-0.5 text-sm text-red-800">
          The invitation page and every RSVP are permanently removed. Export your
          guest list first if you need it.
        </p>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {error && <Alert tone="error">{error}</Alert>}

        {open ? (
          <>
            <TextField
              label={`Type “${eventTitle}” to confirm`}
              value={confirmation}
              autoComplete="off"
              onChange={(e) => setConfirmation(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                disabled={!matches}
                loading={deleting}
                onClick={() => void remove()}
                icon={<Trash2 aria-hidden className="size-4" />}
              >
                Delete permanently
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setConfirmation(""); }}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="self-start border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setOpen(true)}
            icon={<Trash2 aria-hidden className="size-4" />}
          >
            Delete event
          </Button>
        )}
      </div>
    </section>
  );
}
