import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Thiếu CONTRACT_ADDRESS");

  const contract = await ethers.getContractAt("PrivateVoting", contractAddress);
  const count = await contract.getElectionCount();

  console.log("Election count:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
