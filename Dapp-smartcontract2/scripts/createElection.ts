import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("Thiếu CONTRACT_ADDRESS trong file .env");
  }

  const voting = await ethers.getContractAt("PrivateVoting", contractAddress);

  const now = Math.floor(Date.now() / 1000);
  // Đặt thời gian kết thúc sau 1 năm (365 ngày) để chắc chắn không hết hạn khi demo
  const duration = 365 * 24 * 60 * 60;

  const elections = [
    {
      title: "Bầu Lớp trưởng Lớp 12A1",
      candidates: [
        "Nguyễn Văn An",
        "Trần Thị Mai",
        "Lê Hoàng Nam",
        "Phạm Thu Trang",
      ],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Chủ tịch nước Nhiệm kỳ mới",
      candidates: ["Nguyễn Minh Quang", "Trần Quốc Bảo", "Phạm Hữu Đức"],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Hiệu trưởng Đại học Quốc gia",
      candidates: ["Nguyễn Thị Lan", "Trần Văn Hùng", "Lê Đức Anh"],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Chủ tịch Quốc hội",
      candidates: [
        "Vũ Ngọc Sơn",
        "Đặng Thị Hòa",
        "Ngô Minh Tuấn",
        "Bùi Thu Hà",
      ],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Bộ trưởng Bộ Công an",
      candidates: ["Hoàng Văn Dũng", "Phan Minh Tam", "Đỗ Quang Khải"],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Cầu thủ xuất sắc nhất năm",
      candidates: [
        "Nguyễn Quang Hải",
        "Đỗ Hùng Dũng",
        "Nguyễn Công Phượng",
        "Phạm Tuấn Hải",
      ],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Chủ tịch Hội đồng Quản trị",
      candidates: [
        "Nguyễn Thành Long",
        "Trần Đức Minh",
        "Lê Thị Phương Anh",
        "Phạm Gia Bảo",
      ],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Đại biểu Hội đồng Nhân dân",
      candidates: ["Trương Văn Nam", "Đỗ Thị Kim", "Lý Hoài Nam"],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Giám đốc Điều hành (CEO)",
      candidates: ["Phan Thanh Tùng", "Hoàng Kim Yến", "Ngô Bảo Châu"],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
    {
      title: "Bầu Trưởng phòng Kinh doanh",
      candidates: ["Trần Mạnh Cường", "Vũ Tuyết Mai", "Đặng Văn Lâm"],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Hoa hậu Hoàn vũ DApp",
      candidates: ["Nguyễn Thùy Tiên", "H'Hen Niê", "Đỗ Mỹ Linh"],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Trưởng ban Phụ huynh",
      candidates: ["Lê Văn Tám", "Phạm Thị Bưởi", "Nguyễn Văn Xoài"],
      startTime: now,
      endTime: now + duration,
      isPublic: true,
    },
    {
      title: "Bầu Đại sứ Thương hiệu Sapphire",
      candidates: ["Sơn Tùng M-TP", "Đen Vâu", "Suboi"],
      startTime: now,
      endTime: now + duration,
      isPublic: false,
    },
  ];

  console.log(`--- ĐANG KHỞI TẠO 13 CUỘC BẦU CỬ ---`);

  for (let i = 0; i < elections.length; i++) {
    const e = elections[i];
    try {
      console.log(`\n[${i + 1}/13] Đang tạo: ${e.title}`);
      const tx = await voting.createElection(
        e.title,
        e.candidates,
        e.startTime,
        e.endTime,
        e.isPublic,
      );
      await tx.wait();
      console.log(`✅ Thành công! Hash: ${tx.hash}`);
    } catch (err: any) {
      console.error(`❌ Lỗi tại ID ${i}:`, err.message);
    }
  }

  const count = await voting.getElectionCount();
  console.log(
    `\nTổng số cuộc bầu cử trên Blockchain hiện tại: ${count.toString()}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
