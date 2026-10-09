import type { ThemeValues } from "@/lib/theme";

/**
 * The shape the invitation UI needs — deliberately narrower than the Prisma
 * `Event` model.
 *
 * The invitation is rendered in two places: the public page (server component)
 * and the appearance editor's live preview (client component). Defining the
 * contract as plain serialisable data means one set of components serves both,
 * and the preview cannot drift from what guests actually see.
 */
export interface InvitationEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationName: string | null;
  locationAddress: string | null;
  locationUrl: string | null;
  bannerImageUrl: string | null;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  rsvpDeadline: Date | null;
  maxAttendeesPerRsvp: number;
  collectPhone: boolean;
  collectDietary: boolean;
  collectMessage: boolean;
  showCountdown: boolean;
}

/** Alias so invitation components never reach into the theme module directly. */
export type InvitationTheme = ThemeValues;
