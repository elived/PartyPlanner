"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { InvitationEvent } from "@/components/invitation/types";
import { buttonClasses, type ThemeValues } from "@/lib/theme";
import { ApiError, apiJson } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  RSVP_STATUSES,
  RSVP_STATUS_LABELS,
  rsvpSubmissionSchema,
  type RsvpStatusValue,
  type RsvpSubmission,
} from "@/lib/validations/rsvp";

/**
 * The guest-facing RSVP form.
 *
 * It is themed rather than styled: colours, radii and fonts all come from the
 * --pp-* variables set by the invitation wrapper, so it inherits whatever the
 * organiser chose. The controls are ordinary inputs with real labels and real
 * validation messages — the one place in this app where an accessibility slip
 * would hit people who never opted into using it.
 */

const STATUS_HELP: Record<RsvpStatusValue, string> = {
  ATTENDING: "Count me in",
  MAYBE: "Not sure yet",
  NOT_ATTENDING: "Sorry, can't make it",
};

interface Props {
  event: InvitationEvent;
  theme: ThemeValues;
  /** Renders a non-submitting copy for the appearance preview. */
  preview?: boolean;
  deadlinePassed?: boolean;
  fullyBooked?: boolean;
}

export function RsvpForm({ event, theme, preview = false, deadlinePassed = false, fullyBooked = false }: Props) {
  const [done, setDone] = useState<{ status: RsvpStatusValue; updated: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RsvpSubmission>({
    resolver: zodResolver(rsvpSubmissionSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: null,
      status: "ATTENDING",
      attendeesCount: 1,
      dietaryRestrictions: null,
      message: null,
      website: "",
    },
  });

  const status = watch("status");
  const showAttendees = status !== "NOT_ATTENDING";

  const onSubmit = handleSubmit(async (values) => {
    if (preview) return;
    setFormError(null);
    try {
      const result = await apiJson<{ outcome: "created" | "updated" }>(
        `/api/public/events/${event.slug}/rsvp`,
        "POST",
        values,
      );
      setDone({ status: values.status, updated: result.outcome === "updated" });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof RsvpSubmission, { message });
        }
      }
      setFormError(
        error instanceof Error ? error.message : "Could not send your response. Please try again.",
      );
    }
  });

  if (done) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span
            className="grid size-12 place-items-center rounded-full"
            style={{ background: "rgb(var(--pp-primary-rgb) / 0.14)", color: "var(--pp-primary)" }}
          >
            {done.status === "ATTENDING" ? (
              <PartyPopper aria-hidden className="size-6" />
            ) : (
              <CheckCircle2 aria-hidden className="size-6" />
            )}
          </span>
          <div role="status">
            <h2 className="pp-heading text-xl font-semibold">
              {done.updated ? "Your response was updated" : "Thank you!"}
            </h2>
            <p className="mt-1.5 text-sm opacity-80">
              {done.status === "ATTENDING"
                ? "We can't wait to see you. A confirmation is on its way to your inbox."
                : done.status === "MAYBE"
                  ? "Thanks for letting us know. Submit the form again once you're sure."
                  : "Thanks for letting us know — you'll be missed."}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  if (deadlinePassed || fullyBooked) {
    return (
      <Panel>
        <h2 className="pp-heading text-xl font-semibold">RSVP closed</h2>
        <p className="mt-2 text-sm opacity-80">
          {deadlinePassed
            ? "The deadline for responses has passed."
            : "Every place for this event has been taken."}
          {event.contactEmail && (
            <>
              {" "}
              Get in touch with{" "}
              <a href={`mailto:${event.contactEmail}`} className="underline underline-offset-2">
                {event.contactName ?? event.contactEmail}
              </a>{" "}
              if you need to talk it through.
            </>
          )}
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="pp-heading text-xl font-semibold">Will you be there?</h2>
      <p className="mt-1 text-sm opacity-70">
        {event.rsvpDeadline ? "Let us know before the deadline." : "We'd love to know."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-[var(--pp-radius)] bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}

        <fieldset>
          <legend className="text-sm font-medium">Your response</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {RSVP_STATUSES.map((value) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-0.5 rounded-[var(--pp-radius)] border-2 px-3 py-2.5 text-center transition-colors",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                  status === value
                    ? "border-[var(--pp-primary)] bg-[rgb(var(--pp-primary-rgb)/0.1)]"
                    : "border-[rgb(var(--pp-text-rgb)/0.15)] hover:border-[rgb(var(--pp-text-rgb)/0.3)]",
                )}
              >
                <input type="radio" value={value} className="sr-only" {...register("status")} />
                <span className="text-sm font-semibold">{RSVP_STATUS_LABELS[value]}</span>
                <span className="text-xs opacity-70">{STATUS_HELP[value]}</span>
              </label>
            ))}
          </div>
          {errors.status && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
              {errors.status.message}
            </p>
          )}
        </fieldset>

        <ThemedField label="Full name" required error={errors.name?.message}>
          {(props) => <input type="text" autoComplete="name" {...props} {...register("name")} />}
        </ThemedField>

        <ThemedField
          label="Email"
          required
          error={errors.email?.message}
          hint="We'll send your confirmation here."
        >
          {(props) => <input type="email" autoComplete="email" {...props} {...register("email")} />}
        </ThemedField>

        {event.collectPhone && (
          <ThemedField label="Phone" error={errors.phone?.message} hint="Optional.">
            {(props) => <input type="tel" autoComplete="tel" {...props} {...register("phone")} />}
          </ThemedField>
        )}

        {showAttendees && (
          <ThemedField
            label="How many of you are coming?"
            required
            error={errors.attendeesCount?.message}
            hint={`Including yourself. Up to ${event.maxAttendeesPerRsvp}.`}
          >
            {(props) => (
              <input
                type="number"
                min={1}
                max={event.maxAttendeesPerRsvp}
                inputMode="numeric"
                {...props}
                {...register("attendeesCount")}
              />
            )}
          </ThemedField>
        )}

        {event.collectDietary && showAttendees && (
          <ThemedField
            label="Dietary restrictions"
            error={errors.dietaryRestrictions?.message}
            hint="Allergies, vegetarian, vegan — anything we should know."
          >
            {(props) => <textarea rows={2} {...props} {...register("dietaryRestrictions")} />}
          </ThemedField>
        )}

        {event.collectMessage && (
          <ThemedField label="Message to the host" error={errors.message?.message} hint="Optional.">
            {(props) => <textarea rows={3} {...props} {...register("message")} />}
          </ThemedField>
        )}

        {/* Honeypot: hidden from people and from assistive tech, irresistible to bots. */}
        <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="pp-website">Leave this field empty</label>
          <input id="pp-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || preview}
          aria-busy={isSubmitting || undefined}
          className={cn(
            "mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--pp-radius)] px-6 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
            buttonClasses(theme.buttonStyle),
          )}
        >
          {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {preview ? "Send RSVP (preview)" : "Send my RSVP"}
        </button>
      </form>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      id="rsvp"
      className="rounded-2xl p-5 shadow-sm sm:p-6"
      style={{ background: "var(--pp-surface)" }}
    >
      {children}
    </section>
  );
}

/**
 * A themed field wrapper. It is separate from the admin `Field` component
 * because the two have opposite requirements: the admin palette is fixed, this
 * one must inherit whatever the organiser chose.
 */
function ThemedField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
    className: string;
    required?: boolean;
  }) => React.ReactNode;
}) {
  const id = `rsvp-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-red-600">*</span>}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required,
        className: cn(
          "w-full rounded-[var(--pp-radius)] border bg-[var(--pp-surface)] px-3 py-2.5 text-[15px]",
          "border-[rgb(var(--pp-text-rgb)/0.2)] placeholder:opacity-50",
          "focus:border-[var(--pp-primary)] aria-[invalid=true]:border-red-500",
        ),
      })}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs opacity-65">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
