UPDATE "Election"
SET
  "proposalCode" = CONCAT('OIP-', "contractElectionId"),
  "privacyLevel" = CASE
    WHEN "isPublic" = TRUE THEN 'PUBLIC'
    ELSE 'ENCRYPTED'
  END
WHERE
  "proposalCode" = ''
  OR "privacyLevel" NOT IN ('PUBLIC', 'ENCRYPTED');
