import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const [admin] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    "PrivateVoting",
    contractAddress!,
  );

  const voter = "0xf0257b9c45af06b3b36d23202ee205ae52129e55";

  // Cấp quyền cho toàn bộ từ 1 đến 13
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  for (const id of ids) {
    try {
      console.log(`Đang cấp quyền cuộc bầu cử #${id}...`);
      const tx = await contract.authorizeVoter(id, voter);
      await tx.wait();
      console.log(`✅ Thành công ID ${id}`);
    } catch (e) {
      console.log(`❌ ID ${id} đã có quyền hoặc lỗi.`);
    }
  }
}
main().catch(console.error);
