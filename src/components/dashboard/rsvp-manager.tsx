"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Inbox,
  Search,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Alert, Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { RSVP_STATUS_LABELS, type RsvpQuery, type RsvpStatusValue } from "@/lib/validations/rsvp";

interface RsvpRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  attendeesCount: number;
  dietaryRestrictions: string | null;
  message: string | null;
  createdAt: Date | string;
}

interface Props {
  eventId: string;
  eventTimezone: string;
  initialPage: { rsvps: RsvpRow[]; total: number; page: number; perPage: number; pageCount: number };
  query: RsvpQuery;
}

const SORTABLE = [
  { key: "name", label: "Guest" },
  { key: "attendeesCount", label: "Party size" },
  { key: "createdAt", label: "Submitted" },
] as const;

/**
 * RSVP table with search, filtering, sorting, pagination and export.
 *
 * All query state is kept in the URL and the data is re-fetched by the *server*
 * component above — `router.replace` + `useTransition` gives a responsive
 * control surface without this component owning a second copy of the data or
 * needing a client-side cache.
 */
export function RsvpManager({ eventId, eventTimezone, initialPage, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(query.q);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function apply(changes: Partial<Record<string, string | number>>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value == null) params.delete(key);
      else params.set(key, String(value));
    }
    if (resetPage) params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // Debounce the search box: one request when typing pauses, not one per key.
  useEffect(() => {
    if (search === query.q) return;
    const id = setTimeout(() => apply({ q: search }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function remove(rsvp: RsvpRow) {
    if (!window.confirm(`Delete the RSVP from ${rsvp.name}? This cannot be undone.`)) return;
    setError(null);
    setDeletingId(rsvp.id);
    try {
      await apiFetch(`/api/events/${eventId}/rsvps/${rsvp.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that RSVP.");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSort(key: (typeof SORTABLE)[number]["key"]) {
    const dir = query.sort === key && query.dir === "desc" ? "asc" : "desc";
    apply({ sort: key, dir }, false);
  }

  const { rsvps, total, page, pageCount } = initialPage;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end">
        <TextField
          label="Search RSVPs"
          hideLabel
          className="flex-1"
          type="search"
          placeholder="Search by name, email, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <SelectField
          label="Status"
          hideLabel
          className="sm:w-44"
          value={query.status}
          onChange={(e) => apply({ status: e.target.value })}
        >
          <option value="ALL">All responses</option>
          <option value="ATTENDING">Attending</option>
          <option value="MAYBE">Maybe</option>
          <option value="NOT_ATTENDING">Not attending</option>
        </SelectField>

        <div className="flex gap-2">
          <a href={`/api/events/${eventId}/export?format=xlsx`} download>
            <Button type="button" variant="outline" icon={<FileSpreadsheet aria-hidden className="size-4" />}>
              Excel
            </Button>
          </a>
          <a href={`/api/events/${eventId}/export?format=csv`} download>
            <Button type="button" variant="outline" icon={<Download aria-hidden className="size-4" />}>
              CSV
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
        <span aria-live="polite">
          {pending ? "Updating…" : `${total} ${total === 1 ? "response" : "responses"}`}
          {query.q && !pending && ` matching “${query.q}”`}
        </span>
        {pending && <Spinner label="Updating results" />}
      </div>

      {rsvps.length === 0 ? (
        <EmptyState
          icon={query.q || query.status !== "ALL" ? Search : Inbox}
          title={query.q || query.status !== "ALL" ? "No matching responses" : "No responses yet"}
          description={
            query.q || query.status !== "ALL"
              ? "Try a different search term or clear the filter."
              : "Share your invitation link and responses will appear here."
          }
        />
      ) : (
        <>
          {/* The table scrolls horizontally rather than shrinking columns to
              illegibility; it is wrapped in a labelled, focusable region so
              keyboard users can scroll it. */}
          <div
            role="region"
            aria-label="RSVP responses"
            tabIndex={0}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <caption className="sr-only">
                RSVP responses, sorted by {query.sort} {query.dir === "asc" ? "ascending" : "descending"}
              </caption>
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left">
                  {SORTABLE.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      label={label}
                      active={query.sort === key}
                      dir={query.dir}
                      onClick={() => toggleSort(key)}
                      className={key === "createdAt" ? "w-44" : undefined}
                    />
                  ))}
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-700">Response</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-700">Notes</th>
                  <th scope="col" className="w-12 px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((rsvp) => (
                  <tr key={rsvp.id} className="border-b border-slate-100 align-top last:border-0">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {rsvp.name}
                      <a
                        href={`mailto:${rsvp.email}`}
                        className="mt-0.5 block truncate text-xs font-normal text-slate-500 hover:text-brand-700 hover:underline"
                      >
                        {rsvp.email}
                      </a>
                      {rsvp.phone && (
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">{rsvp.phone}</span>
                      )}
                    </th>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{rsvp.attendeesCount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <time dateTime={new Date(rsvp.createdAt).toISOString()}>
                        {formatDateTime(new Date(rsvp.createdAt), eventTimezone)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={rsvp.status}>
                        {RSVP_STATUS_LABELS[rsvp.status as RsvpStatusValue] ?? rsvp.status}
                      </Badge>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      {rsvp.dietaryRestrictions && (
                        <p>
                          <span className="font-medium text-slate-700">Dietary: </span>
                          {rsvp.dietaryRestrictions}
                        </p>
                      )}
                      {rsvp.message && <p className="mt-1 whitespace-pre-line">{rsvp.message}</p>}
                      {!rsvp.dietaryRestrictions && !rsvp.message && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void remove(rsvp)}
                        disabled={deletingId === rsvp.id}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 aria-hidden className="size-4" />
                        <span className="sr-only">Delete the RSVP from {rsvp.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <nav
              aria-label="RSVP pages"
              className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => apply({ page: page - 1 }, false)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Page {page} of {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => apply({ page: page + 1 }, false)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </Card>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    // aria-sort on the header is what tells a screen reader the table is sorted
    // and in which direction.
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-2.5 font-semibold text-slate-700", className)}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 hover:text-brand-700"
      >
        {label}
        <Icon aria-hidden className={cn("size-3.5", active ? "text-brand-600" : "text-slate-400")} />
        <span className="sr-only">
          {active ? `sorted ${dir === "asc" ? "ascending" : "descending"}, ` : ""}
          click to sort
        </span>
      </button>
    </th>
  );
}
