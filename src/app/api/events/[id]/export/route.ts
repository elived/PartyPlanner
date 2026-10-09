import { getCurrentUser } from "@/auth";
import { handle, unauthorized } from "@/lib/api";
import { buildCsv, buildXlsx, exportFilename } from "@/lib/export";
import { getEventForOwner } from "@/server/services/events";
import { allRsvps } from "@/server/services/rsvps";

// SheetJS is CommonJS and uses Node buffers — this route must not run on edge.
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const event = await getEventForOwner(id, user.id);

    const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const rsvps = await allRsvps(id);
    const filename = exportFilename(event.slug, format);

    // `attachment` + an ASCII-safe filename, with filename* carrying the UTF-8
    // version for browsers that support RFC 5987 (slugs are ASCII, but the
    // header stays correct if that ever changes).
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    if (format === "csv") {
      return new Response(buildCsv({ event, rsvps }), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": disposition,
          "cache-control": "no-store",
        },
      });
    }

    const workbook = buildXlsx({ event, rsvps });
    return new Response(new Uint8Array(workbook), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": disposition,
        "cache-control": "no-store",
      },
    });
  });
}
