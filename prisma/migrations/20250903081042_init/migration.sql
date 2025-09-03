-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'ORGANIZER', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "public"."EventVisibility" AS ENUM ('ONSITE', 'ONLINE');

-- CreateEnum
CREATE TYPE "public"."AttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('WEBINAR', 'SEMINAR', 'WORKSHOP', 'COMPETITION', 'CONFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ParticipationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('LOGIN', 'SIGNUP', 'RESET');

-- CreateEnum
CREATE TYPE "public"."Eventstatus" AS ENUM ('CANCELLED', 'COMPLETED', 'DRAFT', 'ACTIVE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'PARTICIPANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UnverifiedUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'PARTICIPANT',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnverifiedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER,

    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParticipantProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."EventVisibility" NOT NULL,
    "venue" TEXT,
    "joinLink" TEXT,
    "contactInfo" TEXT,
    "totalSeats" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "joinQuestions" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "status" "public"."Eventstatus" NOT NULL DEFAULT 'ACTIVE',
    "TypeOfEvent" "public"."EventType" NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" "public"."AttachmentType" NOT NULL,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventParticipant" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "status" "public"."ParticipationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "answers" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OTP" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UnverifiedUser_email_key" ON "public"."UnverifiedUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UnverifiedUser_token_key" ON "public"."UnverifiedUser"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "public"."OrganizerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "public"."Company"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProfile_userId_key" ON "public"."ParticipantProfile"("userId");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_status_idx" ON "public"."EventParticipant"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_participantId_key" ON "public"."EventParticipant"("eventId", "participantId");

-- CreateIndex
CREATE INDEX "OTP_email_code_idx" ON "public"."OTP"("email", "code");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "public"."PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "public"."OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventParticipant" ADD CONSTRAINT "EventParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTP" ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
