import { ApiProperty } from "@nestjs/swagger";

export class CandidateDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Nguyen Van A" })
  name: string;

  @ApiProperty({ example: 0 })
  index: number;

  @ApiProperty({ example: 12 })
  voteCount: number;
}
