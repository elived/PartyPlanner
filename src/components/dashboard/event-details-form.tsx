"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { SlugEditor } from "@/components/dashboard/slug-editor";
import { Button } from "@/components/ui/button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Alert, Card, CardHeader } from "@/components/ui/misc";
import { ApiError, apiJson } from "@/lib/client";
import { supportedTimeZones } from "@/lib/dates";
import { eventDetailsSchema, type EventDetailsInput } from "@/lib/validations/event";

const ZONES = supportedTimeZones();

interface Props {
  eventId: string;
  slug: string;
  origin: string;
  ownerEmail: string;
  defaults: EventDetailsInput;
}

/**
 * The details editor. Each `<Card>` is a section rather than a separate form —
 * one submit means the cross-field rules (end after start, deadline before
 * start) can be checked together, and the organiser never saves half a change.
 */
export function EventDetailsForm({ eventId, slug, origin, ownerEmail, defaults }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EventDetailsInput>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: defaults,
  });

  const preventDuplicates = watch("preventDuplicateEmails");
  const notifyOnRsvp = watch("notifyOnRsvp");

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      await apiJson(`/api/events/${eventId}`, "PATCH", { section: "details", values });
      // Re-baseline the form to what was just persisted, so `isDirty` goes back
      // to false and the "unsaved changes" hint disappears.
      reset(values, { keepValues: true });
      setStatus({ tone: "success", message: "Saved." });
      // Refresh so the layout header (title, status badge) reflects the change.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof EventDetailsInput, { message });
        }
        setStatus({ tone: "error", message: "Please check the highlighted fields." });
        return;
      }
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not save your changes.",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status && <Alert tone={status.tone}>{status.message}</Alert>}

      <Card>
        <CardHeader title="About the event" description="What guests will read on the invitation." />
        <div className="flex flex-col gap-4 p-5">
          <TextField label="Title" required error={errors.title?.message} {...register("title")} />
          <TextAreaField
            label="Description"
            rows={5}
            hint="Line breaks are preserved on the invitation page."
            error={errors.description?.message}
            {...register("description")}
          />
          <SelectField label="Visibility" hint="Only a published event accepts RSVPs." error={errors.status?.message} {...register("status")}>
            <option value="DRAFT">Draft — only you can see it</option>
            <option value="PUBLISHED">Published — anyone with the link can RSVP</option>
            <option value="ARCHIVED">Archived — hidden, responses kept</option>
          </SelectField>
        </div>
      </Card>

      <Card>
        <CardHeader title="When" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <TextField label="Starts" type="datetime-local" required error={errors.startsAtLocal?.message} {...register("startsAtLocal")} />
          <TextField label="Ends" type="datetime-local" hint="Optional." error={errors.endsAtLocal?.message} {...register("endsAtLocal")} />
          <SelectField label="Time zone" hint="Guests always see the time in this zone." error={errors.timezone?.message} {...register("timezone")}>
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </SelectField>
          <TextField
            label="RSVP deadline"
            type="datetime-local"
            hint="After this, the form stops accepting responses."
            error={errors.rsvpDeadlineLocal?.message}
            {...register("rsvpDeadlineLocal")}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Where" />
        <div className="flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Venue name" placeholder="Grünerløkka Bar" error={errors.locationName?.message} {...register("locationName")} />
            <TextField label="Address" placeholder="Thorvald Meyers gate 33, Oslo" error={errors.locationAddress?.message} {...register("locationAddress")} />
          </div>
          <TextField
            label="Map or venue link"
            type="url"
            placeholder="https://maps.google.com/..."
            error={errors.locationUrl?.message}
            {...register("locationUrl")}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Contact" description="Shown on the invitation so guests can reach you." />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <TextField label="Name" error={errors.contactName?.message} {...register("contactName")} />
          <TextField label="Email" type="email" error={errors.contactEmail?.message} {...register("contactEmail")} />
          <TextField label="Phone" type="tel" error={errors.contactPhone?.message} {...register("contactPhone")} />
        </div>
      </Card>

      <Card>
        <CardHeader title="RSVP settings" />
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Maximum total guests"
              type="number"
              min={1}
              inputMode="numeric"
              hint="Leave empty for no limit. Counts expected attendees."
              error={errors.maxGuests?.message}
              {...register("maxGuests")}
            />
            <TextField
              label="Maximum per response"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              hint="How many people one guest may bring, including themselves."
              error={errors.maxAttendeesPerRsvp?.message}
              {...register("maxAttendeesPerRsvp")}
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-slate-700">Form fields</legend>
            <CheckboxField label="Ask for a phone number" {...register("collectPhone")} />
            <CheckboxField label="Ask about dietary restrictions" {...register("collectDietary")} />
            <CheckboxField label="Allow a message to the host" {...register("collectMessage")} />
            <CheckboxField label="Show a countdown on the invitation" {...register("showCountdown")} />
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-slate-700">Duplicate responses</legend>
            <CheckboxField
              label="One response per email address"
              hint="Recommended. Without this, the same person can submit the form repeatedly."
              {...register("preventDuplicateEmails")}
            />
            <CheckboxField
              label="Let guests change their mind"
              hint="A repeat submission from the same email updates the existing response instead of being rejected."
              disabled={!preventDuplicates}
              {...register("allowRsvpUpdates")}
            />
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" />
        <div className="flex flex-col gap-4 p-5">
          <CheckboxField
            label="Email me when someone responds"
            hint="Guests always receive a confirmation receipt regardless of this setting."
            {...register("notifyOnRsvp")}
          />
          <TextField
            label="Send notifications to"
            type="email"
            placeholder={ownerEmail}
            hint={`Leave empty to use your account email (${ownerEmail}).`}
            disabled={!notifyOnRsvp}
            error={errors.notifyEmail?.message}
            {...register("notifyEmail")}
          />
        </div>
      </Card>

      <SlugEditor eventId={eventId} slug={slug} origin={origin} />

      {/* Sticky so the save button is reachable without scrolling a long form. */}
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button type="submit" loading={isSubmitting} icon={<Save aria-hidden className="size-4" />}>
          Save changes
        </Button>
        {isDirty && !isSubmitting && (
          <span className="text-sm text-slate-500">You have unsaved changes.</span>
        )}
      </div>
    </form>
  );
}
