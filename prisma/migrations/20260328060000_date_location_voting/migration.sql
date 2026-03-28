-- CreateTable
CREATE TABLE "DateProposal" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateVote" (
    "id" TEXT NOT NULL,
    "dateProposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapLink" TEXT,
    "mapEmbed" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationVote" (
    "id" TEXT NOT NULL,
    "locationOptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DateVote_dateProposalId_userId_key" ON "DateVote"("dateProposalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationVote_eventId_userId_key" ON "LocationVote"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "DateProposal" ADD CONSTRAINT "DateProposal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateProposal" ADD CONSTRAINT "DateProposal_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_dateProposalId_fkey" FOREIGN KEY ("dateProposalId") REFERENCES "DateProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationOption" ADD CONSTRAINT "LocationOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationOption" ADD CONSTRAINT "LocationOption_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationVote" ADD CONSTRAINT "LocationVote_locationOptionId_fkey" FOREIGN KEY ("locationOptionId") REFERENCES "LocationOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationVote" ADD CONSTRAINT "LocationVote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationVote" ADD CONSTRAINT "LocationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
