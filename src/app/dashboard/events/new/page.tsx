import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewEventForm } from "@/components/dashboard/new-event-form";
import { Card, CardHeader } from "@/components/ui/misc";
import { getAppOrigin } from "@/lib/urls";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const origin = await getAppOrigin();

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Back to events
      </Link>

      <Card>
        <CardHeader
          title="Create an event"
          description="Just the essentials for now — everything else is editable afterwards."
        />
        <div className="p-5">
          <NewEventForm origin={origin} />
        </div>
      </Card>
    </div>
  );
}
