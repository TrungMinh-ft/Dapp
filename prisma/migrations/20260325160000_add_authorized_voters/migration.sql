CREATE TABLE "AuthorizedVoter" (
  "id" SERIAL NOT NULL,
  "electionId" INTEGER NOT NULL,
  "wallet" TEXT NOT NULL,
  "isAuthorized" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastTxHash" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthorizedVoter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorizedVoter_electionId_wallet_key" ON "AuthorizedVoter"("electionId", "wallet");

ALTER TABLE "AuthorizedVoter"
ADD CONSTRAINT "AuthorizedVoter_electionId_fkey"
FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
