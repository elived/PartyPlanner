"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={<LogOut aria-hidden className="size-4" />}
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sign out
    </Button>
  );
}
