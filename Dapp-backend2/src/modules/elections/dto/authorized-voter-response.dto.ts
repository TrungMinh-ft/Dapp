import { ApiProperty } from "@nestjs/swagger";

export class AuthorizedVoterResponseDto {
  @ApiProperty({ example: "0x1234567890abcdef1234567890abcdef12345678" })
  wallet: string;

  @ApiProperty({ example: true })
  isAuthorized: boolean;

  @ApiProperty({
    example:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nullable: true,
  })
  lastTxHash: string | null;

  @ApiProperty({ example: "2026-03-25T08:00:00.000Z" })
  updatedAt: Date;
}
