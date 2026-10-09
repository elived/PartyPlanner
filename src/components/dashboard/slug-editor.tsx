"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert, Card, CardHeader } from "@/components/ui/misc";
import { ApiError, apiJson } from "@/lib/client";
import { slugify } from "@/lib/utils";

/**
 * Deliberately *not* a <form>: it is rendered inside the details form, and
 * nesting forms is invalid HTML (the inner one is dropped by the parser). It
 * saves on its own because changing a URL breaks links that are already shared —
 * that deserves its own decision, not a side effect of saving the description.
 */
export function SlugEditor({
  eventId,
  slug,
  origin,
}: {
  eventId: string;
  slug: string;
  origin: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changed = value !== slug;

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiJson(`/api/events/${eventId}`, "PATCH", {
        section: "slug",
        values: { slug: value },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.fields?.slug ?? err.message)
          : "Could not update the URL.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Invitation URL"
        description="Changing this breaks any link you have already shared."
      />
      <div className="flex flex-col gap-3 p-5">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && !changed && <Alert tone="success">URL updated.</Alert>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="Address"
            className="flex-1"
            value={value}
            hint={`${origin}/event/${value || "…"}`}
            onChange={(e) => setValue(slugify(e.target.value))}
          />
          <Button
            type="button"
            variant="outline"
            loading={saving}
            disabled={!changed || value.length < 3}
            onClick={() => void save()}
            icon={<Link2 aria-hidden className="size-4" />}
          >
            Update URL
          </Button>
        </div>
      </div>
    </Card>
  );
}
