"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives that wire up accessibility by construction rather than by
 * discipline: the label is always associated, the hint and the error are always
 * referenced from `aria-describedby`, and an invalid control always carries
 * `aria-invalid`. Getting this wrong is the single most common accessibility
 * bug in admin forms, so the components make it impossible to forget.
 */

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Renders the label for screen readers only (e.g. a toolbar search box). */
  hideLabel?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  hideLabel,
  className,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-slate-700",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        // role="alert" so the message is announced when it appears after submit.
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors " +
  "placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 " +
  "border-slate-300 hover:border-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:hover:border-red-600";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id">,
    Pick<FieldShellProps, "label" | "hint" | "error" | "hideLabel" | "className"> {}

export function TextField({ label, hint, error, hideLabel, className, ...props }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} required={props.required} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL_BASE, "h-10")}
          {...props}
        />
      )}
    </Field>
  );
}

export interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">,
    Pick<FieldShellProps, "label" | "hint" | "error" | "hideLabel" | "className"> {}

export function TextAreaField({
  label,
  hint,
  error,
  hideLabel,
  className,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} required={props.required} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL_BASE, "resize-y")}
          {...props}
        />
      )}
    </Field>
  );
}

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">,
    Pick<FieldShellProps, "label" | "hint" | "error" | "hideLabel" | "className"> {}

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} required={props.required} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL_BASE, "h-10 pr-8")}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
  label: string;
  hint?: string;
}

export function CheckboxField({ label, hint, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? hintId : undefined}
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && (
          <p id={hintId} className="mt-0.5 text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
