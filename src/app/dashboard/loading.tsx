import { Skeleton } from "@/components/ui/misc";

/**
 * Streamed while the dashboard's server component waits on the database. The
 * shapes mirror the real layout so the page settles instead of jumping.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your events
      </span>
    </div>
  );
}
