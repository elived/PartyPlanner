import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Development seed: one organiser, one published event with a full theme, and a
 * spread of RSVPs so the dashboard, filters and exports all have something real
 * to show. Idempotent — safe to run repeatedly.
 *
 * The demo password lives here rather than in the README so it is obvious this
 * data is for local development only.
 */
const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "party-planner-demo";

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Organiser",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  const startsAt = new Date();
  startsAt.setMonth(startsAt.getMonth() + 2);
  startsAt.setHours(18, 0, 0, 0);

  const rsvpDeadline = new Date(startsAt);
  rsvpDeadline.setDate(rsvpDeadline.getDate() - 14);

  const event = await prisma.event.upsert({
    where: { slug: "john-birthday-2027" },
    update: {},
    create: {
      slug: "john-birthday-2027",
      ownerId: owner.id,
      status: "PUBLISHED",
      title: "John's 30th Birthday",
      description:
        "Three decades deserve a proper party.\n\nDoors open at six, food at seven, dancing until the neighbours complain. Dress code: whatever makes you feel excellent.",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 6 * 60 * 60 * 1000),
      timezone: "Europe/Oslo",
      locationName: "Kulturhuset",
      locationAddress: "Youngs gate 6, 0181 Oslo",
      locationUrl: "https://maps.google.com/?q=Youngs+gate+6+Oslo",
      contactName: "John",
      contactEmail: DEMO_EMAIL,
      contactPhone: "+47 900 00 000",
      rsvpDeadline,
      maxGuests: 80,
      maxAttendeesPerRsvp: 4,
      bannerImageUrl:
        "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1600&q=80",
      theme: {
        create: {
          primaryColor: "#7C3AED",
          secondaryColor: "#EC4899",
          backgroundColor: "#FAF5FF",
          surfaceColor: "#FFFFFF",
          textColor: "#1F1235",
          headingFont: "playfair",
          bodyFont: "inter",
          buttonStyle: "SOLID",
          buttonShape: "PILL",
        },
      },
    },
  });

  const existing = await prisma.rsvp.count({ where: { eventId: event.id } });
  if (existing === 0) {
    await prisma.rsvp.createMany({
      data: [
        { eventId: event.id, name: "Ada Lovelace", email: "ada@example.com", phone: "+47 400 00 001", status: "ATTENDING", attendeesCount: 2, dietaryRestrictions: "Vegetarian", message: "Wouldn't miss it!" },
        { eventId: event.id, name: "Grace Hopper", email: "grace@example.com", status: "ATTENDING", attendeesCount: 1 },
        { eventId: event.id, name: "Alan Turing", email: "alan@example.com", status: "MAYBE", attendeesCount: 1, message: "Depends on a work trip — will confirm next week." },
        { eventId: event.id, name: "Katherine Johnson", email: "katherine@example.com", status: "ATTENDING", attendeesCount: 4, dietaryRestrictions: "One nut allergy (severe)" },
        { eventId: event.id, name: "Linus Pauling", email: "linus@example.com", status: "NOT_ATTENDING", attendeesCount: 0, message: "Away that weekend. Have a great one!" },
        { eventId: event.id, name: "Marie Curie", email: "marie@example.com", phone: "+47 400 00 006", status: "ATTENDING", attendeesCount: 2, dietaryRestrictions: "Gluten free" },
      ],
    });
  }

  console.info(
    [
      "",
      "Seed complete.",
      `  Sign in:    ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
      `  Invitation: /event/${event.slug}`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
