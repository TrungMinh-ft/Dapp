import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("Thiếu CONTRACT_ADDRESS trong file .env");
  }

  const voting = await ethers.getContractAt("PrivateVoting", contractAddress);

  const electionId = 0;

  console.log("Dang dong election...");
  const tx = await voting.closeElection(electionId);

  console.log("Tx hash:", tx.hash);
  await tx.wait();

  console.log("Dong election thanh cong");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
