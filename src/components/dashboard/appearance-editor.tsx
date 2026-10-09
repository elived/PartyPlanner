"use client";

import { Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorField } from "@/components/dashboard/color-field";
import { ImageField } from "@/components/dashboard/image-field";
import { InvitationView } from "@/components/invitation/invitation-view";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import type { InvitationEvent } from "@/components/invitation/types";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Alert, Card, CardHeader } from "@/components/ui/misc";
import { ApiError, apiJson } from "@/lib/client";
import { FONT_OPTIONS } from "@/lib/fonts";
import { THEME_PRESETS, type ThemeValues } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { themeSchema } from "@/lib/validations/event";

export interface AppearanceState extends ThemeValues {
  logoUrl: string | null;
  bannerImageUrl: string | null;
}

/**
 * Appearance editor with a live preview.
 *
 * The preview is the real `InvitationView` driven by the same state as the
 * form — not a mock-up. That is the whole point: a preview that renders
 * different components from production is a preview that lies. Because the
 * theme reaches the DOM as CSS variables, every keystroke re-themes the preview
 * without re-fetching or re-rendering anything on the server.
 */
export function AppearanceEditor({
  eventId,
  event,
  initial,
}: {
  eventId: string;
  event: InvitationEvent;
  initial: AppearanceState;
}) {
  const router = useRouter();
  const [values, setValues] = useState<AppearanceState>(initial);
  const [saved, setSaved] = useState<AppearanceState>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [viewport, setViewport] = useState<"mobile" | "desktop">("desktop");

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set<K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  async function save() {
    // Validate locally first so an obviously malformed hex is reported without
    // a round-trip; the API re-validates regardless.
    const parsed = themeSchema.safeParse(values);
    if (!parsed.success) {
      setStatus({
        tone: "error",
        message: parsed.error.issues[0]?.message ?? "Please check the colour values.",
      });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await apiJson(`/api/events/${eventId}`, "PATCH", {
        section: "appearance",
        values: parsed.data,
      });
      setSaved(values);
      setStatus({ tone: "success", message: "Appearance saved." });
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof ApiError ? error.message : "Could not save the appearance.",
      });
    } finally {
      setSaving(false);
    }
  }

  const previewEvent: InvitationEvent = {
    ...event,
    bannerImageUrl: values.bannerImageUrl,
    logoUrl: values.logoUrl,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr] xl:items-start">
      <div className="flex flex-col gap-5">
        {status && <Alert tone={status.tone}>{status.message}</Alert>}

        <Card>
          <CardHeader title="Presets" description="A starting point you can then adjust." />
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setValues((c) => ({ ...c, ...preset.values }))}
                className="group flex flex-col gap-2 rounded-lg border border-slate-200 p-2 text-left transition-colors hover:border-brand-400"
              >
                <span aria-hidden className="flex h-8 overflow-hidden rounded">
                  <span className="flex-1" style={{ background: preset.values.primaryColor }} />
                  <span className="flex-1" style={{ background: preset.values.secondaryColor }} />
                  <span className="flex-1" style={{ background: preset.values.backgroundColor }} />
                </span>
                <span className="text-xs font-medium text-slate-700">{preset.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Colours" />
          <div className="flex flex-col gap-4 p-5">
            <ColorField
              label="Primary"
              value={values.primaryColor}
              onChange={(v) => set("primaryColor", v)}
              hint="Buttons, links and accents."
            />
            <ColorField
              label="Secondary"
              value={values.secondaryColor}
              onChange={(v) => set("secondaryColor", v)}
              hint="Used in the fallback banner gradient."
            />
            <ColorField
              label="Page background"
              value={values.backgroundColor}
              onChange={(v) => set("backgroundColor", v)}
            />
            <ColorField
              label="Card background"
              value={values.surfaceColor}
              onChange={(v) => set("surfaceColor", v)}
            />
            <ColorField
              label="Text"
              value={values.textColor}
              onChange={(v) => set("textColor", v)}
              hint="Check it stays readable against both backgrounds."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Typography" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <SelectField
              label="Headings"
              value={values.headingFont}
              onChange={(e) => set("headingFont", e.target.value)}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Body text"
              value={values.bodyFont}
              onChange={(e) => set("bodyFont", e.target.value)}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>

        <Card>
          <CardHeader title="Buttons" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <SelectField
              label="Style"
              value={values.buttonStyle}
              onChange={(e) => set("buttonStyle", e.target.value as ThemeValues["buttonStyle"])}
            >
              <option value="SOLID">Solid</option>
              <option value="OUTLINE">Outline</option>
              <option value="SOFT">Soft</option>
            </SelectField>
            <SelectField
              label="Shape"
              value={values.buttonShape}
              onChange={(e) => set("buttonShape", e.target.value as ThemeValues["buttonShape"])}
            >
              <option value="SQUARE">Square</option>
              <option value="ROUNDED">Rounded</option>
              <option value="PILL">Pill</option>
            </SelectField>
          </div>
        </Card>

        <Card>
          <CardHeader title="Images" />
          <div className="flex flex-col gap-5 p-5">
            <ImageField
              label="Banner"
              value={values.bannerImageUrl}
              onChange={(url) => set("bannerImageUrl", url)}
              hint="Wide images work best — around 1600 × 800."
            />
            <ImageField
              label="Logo"
              aspect="square"
              value={values.logoUrl}
              onChange={(url) => set("logoUrl", url)}
              hint="Shown as a circle over the banner."
            />
          </div>
        </Card>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Button
            type="button"
            loading={saving}
            disabled={!dirty}
            onClick={() => void save()}
            icon={<Save aria-hidden className="size-4" />}
          >
            Save appearance
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || saving}
            onClick={() => { setValues(saved); setStatus(null); }}
            icon={<RotateCcw aria-hidden className="size-4" />}
          >
            Discard
          </Button>
          {dirty && !saving && <span className="text-sm text-slate-500">Unsaved changes.</span>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Live preview
          </h2>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewport === mode}
                onClick={() => setViewport(mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold capitalize",
                  viewport === mode ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-[max-width]",
            viewport === "mobile" ? "mx-auto w-full max-w-[400px]" : "w-full",
          )}
        >
          <div className="max-h-[80vh] overflow-y-auto">
            <InvitationView
              event={previewEvent}
              theme={values}
              rsvpSlot={<RsvpForm event={previewEvent} theme={values} preview />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
