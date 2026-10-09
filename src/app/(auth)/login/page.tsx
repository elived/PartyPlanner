import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { Spinner } from "@/components/ui/misc";
import { googleAuthEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  // useSearchParams (for callbackUrl) opts the subtree into client rendering,
  // so it needs a Suspense boundary to keep the rest of the route static.
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Spinner /></div>}>
      <LoginForm googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
