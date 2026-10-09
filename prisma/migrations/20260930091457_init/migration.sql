-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('ATTENDING', 'NOT_ATTENDING', 'MAYBE');

-- CreateEnum
CREATE TYPE "ButtonStyle" AS ENUM ('SOLID', 'OUTLINE', 'SOFT');

-- CreateEnum
CREATE TYPE "ButtonShape" AS ENUM ('SQUARE', 'ROUNDED', 'PILL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Oslo',
    "locationName" TEXT,
    "locationAddress" TEXT,
    "locationUrl" TEXT,
    "bannerImageUrl" TEXT,
    "logoUrl" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "rsvpDeadline" TIMESTAMP(3),
    "maxGuests" INTEGER,
    "maxAttendeesPerRsvp" INTEGER NOT NULL DEFAULT 5,
    "preventDuplicateEmails" BOOLEAN NOT NULL DEFAULT true,
    "allowRsvpUpdates" BOOLEAN NOT NULL DEFAULT true,
    "collectPhone" BOOLEAN NOT NULL DEFAULT true,
    "collectDietary" BOOLEAN NOT NULL DEFAULT true,
    "collectMessage" BOOLEAN NOT NULL DEFAULT true,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnRsvp" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_themes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "secondaryColor" TEXT NOT NULL DEFAULT '#EC4899',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FAF5FF',
    "surfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#1F1235',
    "bodyFont" TEXT NOT NULL DEFAULT 'inter',
    "headingFont" TEXT NOT NULL DEFAULT 'playfair',
    "buttonStyle" "ButtonStyle" NOT NULL DEFAULT 'SOLID',
    "buttonShape" "ButtonShape" NOT NULL DEFAULT 'ROUNDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "RsvpStatus" NOT NULL,
    "attendeesCount" INTEGER NOT NULL DEFAULT 1,
    "dietaryRestrictions" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_ownerId_createdAt_idx" ON "events"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_themes_eventId_key" ON "event_themes"("eventId");

-- CreateIndex
CREATE INDEX "rsvps_eventId_email_idx" ON "rsvps"("eventId", "email");

-- CreateIndex
CREATE INDEX "rsvps_eventId_createdAt_idx" ON "rsvps"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "rsvps_eventId_status_idx" ON "rsvps"("eventId", "status");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_themes" ADD CONSTRAINT "event_themes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
