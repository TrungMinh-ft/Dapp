export type Candidate = {
  id: number;
  index: number;
  name: string;
  voteCount: number;
};

export type VoteEvent = {
  id: number;
  voter: string;
  txHash: string | null;
  createdAt: string;
};

export type ElectionCard = {
  id: number;
  contractElectionId: number;
  proposalCode: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isPublic: boolean;
  isClosed: boolean;
  privacyLevel: "PUBLIC" | "ENCRYPTED";
  creator: string;
  totalVotes: number;
  leadingOption: string | null;
  leadingPercentage: number;
  displayStatus: string;
  badgeLabel: string;
  resultSummary: string | null;
  candidates: Candidate[];
  voteEvents?: VoteEvent[];
};

export type VotingStatus = {
  electionId: number;
  wallet: string;
  hasVoted: boolean;
  isAuthorized: boolean;
};

export type AuthorizedVoter = {
  wallet: string;
  isAuthorized: boolean;
  lastTxHash: string | null;
  updatedAt: string;
};

export type AdminActionLog = {
  id: number;
  action: string;
  electionId: number | null;
  details: string | null;
  createdAt: string;
};

export type AdminAuth = {
  walletAddress?: string | null;
  signMessage?: (message: string) => Promise<string>;
  legacyToken?: string;
};
