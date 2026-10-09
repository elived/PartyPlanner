"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { supportedTimeZones } from "@/lib/dates";
import { ApiError, apiJson } from "@/lib/client";
import { slugify } from "@/lib/utils";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";

const ZONES = supportedTimeZones();

/** Local date-time string for "next Saturday at 18:00", as a sensible default. */
function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewEventForm({ origin }: { origin: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      startsAtLocal: defaultStart(),
      // The organiser's own zone is right far more often than a hard-coded one.
      timezone:
        ZONES.find((z) => z === Intl.DateTimeFormat().resolvedOptions().timeZone) ?? "Europe/Oslo",
      slug: null,
    },
  });

  const title = watch("title");
  const slug = watch("slug");
  const [slugTouched, setSlugTouched] = useState(false);

  // Mirror the title into the URL field until the organiser edits it themselves.
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(title) || null, { shouldValidate: false });
  }, [title, slugTouched, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const event = await apiJson<{ id: string }>("/api/events", "POST", values);
      router.push(`/dashboard/events/${event.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof CreateEventInput, { message });
        }
        return;
      }
      setFormError(error instanceof Error ? error.message : "Could not create the event.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Event title"
        placeholder="John's 30th birthday"
        required
        autoFocus
        error={errors.title?.message}
        {...register("title")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Starts"
          type="datetime-local"
          required
          error={errors.startsAtLocal?.message}
          {...register("startsAtLocal")}
        />
        <SelectField label="Time zone" error={errors.timezone?.message} {...register("timezone")}>
          {ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        label="Invitation URL"
        hint={`${origin}/event/${slug || "your-event"}`}
        error={errors.slug?.message}
        {...register("slug", {
          onChange: () => setSlugTouched(true),
        })}
      />

      <Button type="submit" loading={isSubmitting} className="self-start">
        Create event
      </Button>
    </form>
  );
}
