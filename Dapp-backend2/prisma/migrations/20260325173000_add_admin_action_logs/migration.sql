CREATE TABLE "AdminActionLog" (
  "id" SERIAL NOT NULL,
  "action" TEXT NOT NULL,
  "electionId" INTEGER,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);
