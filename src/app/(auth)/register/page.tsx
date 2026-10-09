import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { env, googleAuthEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  // An invite-only instance should not advertise a sign-up page at all.
  if (!env().ALLOW_PUBLIC_REGISTRATION) notFound();

  return <RegisterForm googleEnabled={googleAuthEnabled} />;
}
