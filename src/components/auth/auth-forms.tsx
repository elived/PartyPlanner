"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PartyPopper } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { ApiError, apiJson } from "@/lib/client";
import { credentialsSchema, registerSchema, type RegisterInput } from "@/lib/validations/auth";
import type { z } from "zod";

type Credentials = z.infer<typeof credentialsSchema>;

function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => void signIn("google", { callbackUrl })}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-slate-900">
          <PartyPopper aria-hidden className="size-6 text-brand-600" />
          <span className="text-lg font-semibold">Party Planner</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // redirect:false so a bad password re-renders this form with a message
    // instead of bouncing to Auth.js's own error page.
    const result = await signIn("credentials", { ...values, redirect: false });

    if (!result || result.error) {
      setFormError("That email and password combination did not match.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your events."
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
        </Button>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleButton callbackUrl={callbackUrl} />
          </>
        )}
      </form>
    </AuthShell>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await apiJson("/api/register", "POST", values);
      // Sign straight in so the new organiser lands on the dashboard rather
      // than having to type the password they just chose.
      await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof RegisterInput, { message });
        }
        return;
      }
      setFormError(error instanceof Error ? error.message : "Could not create your account.");
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start planning in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField label="Name" autoComplete="name" required error={errors.name?.message} {...register("name")} />
        <TextField label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 10 characters."
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleButton callbackUrl="/dashboard" />
          </>
        )}
      </form>
    </AuthShell>
  );
}
