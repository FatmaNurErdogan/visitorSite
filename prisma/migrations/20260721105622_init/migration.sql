-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "hostEmployeeId" TEXT NOT NULL,
    "visitReason" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_accessToken_key" ON "Visit"("accessToken");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_hostEmployeeId_fkey" FOREIGN KEY ("hostEmployeeId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
