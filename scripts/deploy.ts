import { ethers } from "hardhat";

async function main() {
  const Voting = await ethers.getContractFactory("PrivateVoting");
  const voting = await Voting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("PrivateVoting deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
