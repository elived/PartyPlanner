import { Skeleton } from "@/components/ui/misc";

export default function EventLoading() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-48" />
      ))}
      <span className="sr-only" role="status">
        Loading the event
      </span>
    </div>
  );
}
