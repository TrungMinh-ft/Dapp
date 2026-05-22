import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("Thiếu CONTRACT_ADDRESS trong file .env");
  }

  const voting = await ethers.getContractAt("PrivateVoting", contractAddress);

  const now = Math.floor(Date.now() / 1000);

  const title = "Election da ket thuc";
  const candidates = ["Lua chon A", "Lua chon B"];
  const startTime = now - 3600; // bắt đầu 1 giờ trước
  const endTime = now - 60; // kết thúc 1 phút trước
  const isPublic = true;

  console.log("Dang tao finished election...");

  const tx = await voting.createElection(
    title,
    candidates,
    startTime,
    endTime,
    isPublic,
  );

  console.log("Da gui transaction:", tx.hash);
  await tx.wait();

  const count = await voting.getElectionCount();
  console.log("Tong so election hien tai:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
