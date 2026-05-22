import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.voteEvent.deleteMany();
  await prisma.authorizedVoter.deleteMany();
  await prisma.eventSyncCursor.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.election.deleteMany();
  await prisma.adminActionLog.deleteMany();

  const now = Math.floor(Date.now() / 1000);

  const elections = [
    {
      contractElectionId: 1,
      proposalCode: "BLT-2026",
      title: "Bầu lớp trưởng",
      description: "Bầu chọn lớp trưởng cho năm học mới",
      startTime: BigInt(now - 3600),
      endTime: BigInt(now + 7 * 24 * 60 * 60),
      isPublic: true,
      isClosed: false,
      privacyLevel: "PUBLIC",
      creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      totalVotes: 0,
      candidates: [
        "Nguyễn Văn An",
        "Trần Thị Mai",
        "Lê Hoàng Nam",
        "Phạm Thu Trang",
      ],
    },
    {
      contractElectionId: 2,
      proposalCode: "CTN-2026",
      title: "Bầu Chủ tịch nước",
      description: "Bầu chọn Chủ tịch nước nhiệm kỳ mới",
      startTime: BigInt(now - 7200),
      endTime: BigInt(now + 10 * 24 * 60 * 60),
      isPublic: true,
      isClosed: false,
      privacyLevel: "PUBLIC",
      creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      totalVotes: 0,
      candidates: ["Nguyễn Minh Quang", "Trần Quốc Bảo", "Phạm Hữu Đức"],
    },
    {
      contractElectionId: 3,
      proposalCode: "HT-2026",
      title: "Bầu Hiệu trưởng",
      description: "Bầu chọn Hiệu trưởng trường đại học",
      startTime: BigInt(now - 1800),
      endTime: BigInt(now + 5 * 24 * 60 * 60),
      isPublic: true,
      isClosed: false,
      privacyLevel: "ENCRYPTED",
      creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      totalVotes: 0,
      candidates: [
        "PGS.TS Nguyễn Thị Lan",
        "TS Trần Văn Hùng",
        "PGS.TS Lê Đức Anh",
      ],
    },
    {
      contractElectionId: 4,
      proposalCode: "CTQH-2026",
      title: "Bầu Chủ tịch Quốc hội",
      description: "Bầu chọn Chủ tịch Quốc hội",
      startTime: BigInt(now - 5000),
      endTime: BigInt(now + 8 * 24 * 60 * 60),
      isPublic: true,
      isClosed: false,
      privacyLevel: "PUBLIC",
      creator: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      totalVotes: 0,
      candidates: [
        "Vũ Ngọc Sơn",
        "Đặng Thị Hòa",
        "Ngô Minh Tuấn",
        "Bùi Thu Hà",
      ],
    },
    {
      contractElectionId: 5,
      proposalCode: "BCA-2026",
      title: "Bầu Bộ trưởng Bộ Công an",
      description: "Bầu chọn Bộ trưởng Bộ Công an",
      startTime: BigInt(now - 1000),
      endTime: BigInt(now + 6 * 24 * 60 * 60),
      isPublic: false,
      isClosed: false,
      privacyLevel: "ENCRYPTED",
      creator: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      totalVotes: 0,
      candidates: ["Hoàng Văn Dũng", "Phan Minh Tâm", "Đỗ Quang Khải"],
    },
    {
      contractElectionId: 6,
      proposalCode: "CTXSN-2026",
      title: "Bầu cầu thủ xuất sắc nhất",
      description: "Bầu chọn cầu thủ xuất sắc nhất mùa giải",
      startTime: BigInt(now - 2000),
      endTime: BigInt(now + 4 * 24 * 60 * 60),
      isPublic: true,
      isClosed: false,
      privacyLevel: "PUBLIC",
      creator: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      totalVotes: 0,
      candidates: [
        "Nguyễn Quang Hải",
        "Đỗ Hùng Dũng",
        "Nguyễn Công Phượng",
        "Phạm Tuấn Hải",
      ],
    },
    {
      contractElectionId: 7,
      proposalCode: "CTCTY-2026",
      title: "Bầu Chủ tịch công ty",
      description: "Bầu chọn Chủ tịch Hội đồng quản trị công ty",
      startTime: BigInt(now - 3000),
      endTime: BigInt(now + 9 * 24 * 60 * 60),
      isPublic: false,
      isClosed: false,
      privacyLevel: "ENCRYPTED",
      creator: "0x976EA74026E726554dB657fa54763AbBf14479eE",
      totalVotes: 0,
      candidates: [
        "Nguyễn Thành Long",
        "Trần Đức Minh",
        "Lê Thị Phương Anh",
        "Phạm Gia Bảo",
      ],
    },
  ];

  for (const election of elections) {
    await prisma.election.create({
      data: {
        contractElectionId: election.contractElectionId,
        proposalCode: election.proposalCode,
        title: election.title,
        description: election.description,
        startTime: election.startTime,
        endTime: election.endTime,
        isPublic: election.isPublic,
        isClosed: election.isClosed,
        privacyLevel: election.privacyLevel,
        creator: election.creator,
        totalVotes: election.totalVotes,
        candidates: {
          create: election.candidates.map((name, index) => ({
            name,
            index,
            voteCount: 0,
          })),
        },
      },
    });
  }

  await prisma.adminActionLog.createMany({
    data: [
      {
        action: "SEED_DATA_CREATED",
        details: "Đã tạo dữ liệu mẫu cho 7 cuộc bầu cử",
      },
    ],
  });

  console.log("Seed dữ liệu thành công");
}

main()
  .catch((error) => {
    console.error("Seed lỗi:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
