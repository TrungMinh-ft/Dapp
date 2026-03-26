import { ApiProperty } from "@nestjs/swagger";
import { CandidateDto } from "./candidate.dto";

export class ElectionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 0 })
  contractElectionId: number;

  @ApiProperty({ example: "OIP-42" })
  proposalCode: string;

  @ApiProperty({ example: "Treasury Shield Upgrade" })
  title: string;

  @ApiProperty({ example: "Governance proposal for treasury protection and staged confidential execution." })
  description: string;

  @ApiProperty({ example: "1710000000" })
  startTime: string;

  @ApiProperty({ example: "1710003600" })
  endTime: string;

  @ApiProperty({ example: true })
  isPublic: boolean;

  @ApiProperty({ example: false })
  isClosed: boolean;

  @ApiProperty({ example: "ENCRYPTED" })
  privacyLevel: string;

  @ApiProperty({ example: "0x1234567890abcdef1234567890abcdef12345678" })
  creator: string;

  @ApiProperty({ example: 30 })
  totalVotes: number;

  @ApiProperty({ example: "Approve", nullable: true })
  leadingOption: string | null;

  @ApiProperty({ example: 68.5 })
  leadingPercentage: number;

  @ApiProperty({ example: "VOTING LIVE" })
  displayStatus: string;

  @ApiProperty({ example: "OASIS ENCRYPTED" })
  badgeLabel: string;

  @ApiProperty({ example: "PASSED", nullable: true })
  resultSummary: string | null;

  @ApiProperty({ type: [CandidateDto] })
  candidates: CandidateDto[];
}
