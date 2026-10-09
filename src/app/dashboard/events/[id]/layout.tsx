import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { EventTabs } from "@/components/dashboard/event-tabs";
import { Badge } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { getAppOrigin } from "@/lib/urls";
import { absoluteUrl } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Live",
  ARCHIVED: "Archived",
};

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  // Ownership is part of the query rather than a check afterwards, so another
  // organiser's event id simply does not resolve.
  const event = await prisma.event.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, title: true, slug: true, status: true },
  });
  if (!event) notFound();

  const invitationUrl = absoluteUrl(`/event/${event.slug}`, await getAppOrigin());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft aria-hidden className="size-4" />
          All events
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-slate-900">{event.title}</h1>
              <Badge tone={event.status}>{STATUS_LABEL[event.status] ?? event.status}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{invitationUrl}</p>
          </div>

          <div className="flex items-center gap-2">
            <CopyLinkButton url={invitationUrl} />
            <Link
              href={`/event/${event.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ExternalLink aria-hidden className="size-4" />
              Open
            </Link>
          </div>
        </div>
      </div>

      <EventTabs eventId={event.id} />

      {children}
    </div>
  );
}
