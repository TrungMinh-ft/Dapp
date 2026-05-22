-- CreateTable
CREATE TABLE "Election" (
    "id" SERIAL NOT NULL,
    "contractElectionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "isClosed" BOOLEAN NOT NULL,
    "creator" TEXT NOT NULL,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteEvent" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "voter" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Election_contractElectionId_key" ON "Election"("contractElectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_electionId_index_key" ON "Candidate"("electionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "VoteEvent_txHash_key" ON "VoteEvent"("txHash");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
