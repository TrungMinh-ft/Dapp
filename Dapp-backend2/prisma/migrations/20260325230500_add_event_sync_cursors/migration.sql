CREATE TABLE "EventSyncCursor" (
  "id" SERIAL NOT NULL,
  "electionId" INTEGER NOT NULL,
  "eventName" TEXT NOT NULL,
  "lastSyncedBlock" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventSyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventSyncCursor_electionId_eventName_key"
  ON "EventSyncCursor"("electionId", "eventName");

ALTER TABLE "EventSyncCursor"
  ADD CONSTRAINT "EventSyncCursor_electionId_fkey"
  FOREIGN KEY ("electionId") REFERENCES "Election"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
