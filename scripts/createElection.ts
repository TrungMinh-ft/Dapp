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

  const elections = [
    {
      title: "Bau lop truong",
      candidates: [
        "Nguyen Van An",
        "Tran Thi Mai",
        "Le Hoang Nam",
        "Pham Thu Trang",
      ],
      startTime: now,
      endTime: now + 7 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau Chu tich nuoc",
      candidates: ["Nguyen Minh Quang", "Tran Quoc Bao", "Pham Huu Duc"],
      startTime: now,
      endTime: now + 8 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau Hieu truong",
      candidates: ["Nguyen Thi Lan", "Tran Van Hung", "Le Duc Anh"],
      startTime: now,
      endTime: now + 6 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau Chu tich Quoc hoi",
      candidates: [
        "Vu Ngoc Son",
        "Dang Thi Hoa",
        "Ngo Minh Tuan",
        "Bui Thu Ha",
      ],
      startTime: now,
      endTime: now + 9 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau Bo truong Bo Cong an",
      candidates: ["Hoang Van Dung", "Phan Minh Tam", "Do Quang Khai"],
      startTime: now,
      endTime: now + 5 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau cau thu xuat sac nhat",
      candidates: [
        "Nguyen Quang Hai",
        "Do Hung Dung",
        "Nguyen Cong Phuong",
        "Pham Tuan Hai",
      ],
      startTime: now,
      endTime: now + 4 * 24 * 60 * 60,
      isPublic: false,
    },
    {
      title: "Bau Chu tich cong ty",
      candidates: [
        "Nguyen Thanh Long",
        "Tran Duc Minh",
        "Le Thi Phuong Anh",
        "Pham Gia Bao",
      ],
      startTime: now,
      endTime: now + 10 * 24 * 60 * 60,
      isPublic: false,
    },
  ];

  console.log("Bat dau tao", elections.length, "election...");

  for (let i = 0; i < elections.length; i++) {
    const election = elections[i];

    console.log(`\n[${i + 1}/${elections.length}] Dang tao election...`);
    console.log(election);

    const tx = await voting.createElection(
      election.title,
      election.candidates,
      election.startTime,
      election.endTime,
      election.isPublic,
    );

    console.log("Da gui transaction:", tx.hash);

    const receipt = await tx.wait();

    console.log("Tao election thanh cong");
    console.log("Block number:", receipt?.blockNumber);
  }

  const count = await voting.getElectionCount();
  console.log("\nTong so election hien tai tren chain:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
