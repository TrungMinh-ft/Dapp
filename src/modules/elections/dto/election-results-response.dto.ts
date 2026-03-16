import { ApiProperty } from "@nestjs/swagger";
import { ElectionResultItemDto } from "./election-result-item.dto";

export class ElectionResultsResponseDto {
  @ApiProperty({ example: 0 })
  electionId: number;

  @ApiProperty({ example: "Bầu ban cán sự lớp" })
  title: string;

  @ApiProperty({ example: 30 })
  totalVotes: number;

  @ApiProperty({ type: [ElectionResultItemDto] })
  candidates: ElectionResultItemDto[];
}
