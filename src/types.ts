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
  displayStatus: string; // THÊM DÒNG NÀY
  badgeLabel: string; // THÊM DÒNG NÀY
  privacyLevel: string;
  creator: string;
  totalVotes: number;
  resultSummary: string | null;
  candidates: Candidate[];
};

export type Candidate = {
  id: number;
  electionId: number;
  name: string;
  index: number;
  voteCount: number;
};

export type VotingStatus = {
  electionId: number;
  wallet: string;
  hasVoted: boolean;
  isAuthorized: boolean;
  isRegistered: boolean;
  isPhoneVerified: boolean; // ✅ FIX: Thêm field này
  fullName?: string | null;
  citizenId?: string | null;
};

export type VoteEvent = {
  id: number;
  electionId: number;
  voter: string;
  candidateIndex: number;
  txHash: string | null;
  createdAt: string;
};

export type AuthorizedVoter = {
  id: number;
  electionId: number;
  wallet: string;
  isAuthorized: boolean;
  lastTxHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminActionLog = {
  id: number;
  action: string;
  electionId?: number | null;
  details?: string | null;
  createdAt: string;
};

export type AdminAuth = {
  walletAddress?: string | null;
  signMessage?: (message: string) => Promise<string>;
  legacyToken?: string;
};

export type VoteHistoryItem = {
  id: number;
  electionId: number;
  contractElectionId: number;
  proposalCode: string;
  title: string;
  voter: string;
  candidateIndex: number;
  txHash: string | null;
  createdAt: string;
};
