import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Thiếu CONTRACT_ADDRESS trong .env");

  // ✅ Lấy địa chỉ ví từ argument dòng lệnh
  // Dùng: npx hardhat run scripts/authorizeVoter.ts --network sapphire_testnet
  // Hoặc truyền qua env: VOTER_WALLET=0x... npx hardhat run ...
  const walletArg = process.env.VOTER_WALLET;

  // ✅ Danh sách ví cần authorize - thêm vào đây
  const walletsToAuthorize: string[] = [
    "0xf0257b9c45af0f6b3b36d23202ee205ae52129e55",
    // ví mặc định
    // Thêm ví khác vào đây:
    // "0xAbCd...",
    // "0x1234...",
  ];

  // Nếu có truyền VOTER_WALLET thì thêm vào danh sách
  if (walletArg) {
    const normalized = walletArg.toLowerCase();
    if (!walletsToAuthorize.map((w) => w.toLowerCase()).includes(normalized)) {
      walletsToAuthorize.push(walletArg);
    }
  }

  const voting = await ethers.getContractAt("PrivateVoting", contractAddress);
  const count = await voting.getElectionCount();
  const total = Number(count);

  console.log(`\n=== CẤP QUYỀN BẦU CỬ ===`);
  console.log(`Tổng số cuộc bầu cử: ${total}`);
  console.log(`Số ví cần authorize: ${walletsToAuthorize.length}`);
  console.log(`Danh sách ví:`);
  walletsToAuthorize.forEach((w) => console.log(`  - ${w}`));
  console.log(`========================\n`);

  for (const wallet of walletsToAuthorize) {
    console.log(`\n>>> Đang xử lý ví: ${wallet}`);

    for (let id = 0; id < total; id++) {
      try {
        // Kiểm tra đã authorize chưa
        const election = await voting.getElection(id);
        const isAlreadyAuthorized = await voting.isVoterAuthorized(id, wallet);

        if (isAlreadyAuthorized) {
          console.log(`  ✅ ID ${id} - Đã có quyền rồi, bỏ qua`);
          continue;
        }

        // Kiểm tra election còn mở không
        const now = Math.floor(Date.now() / 1000);
        if (election.isClosed || Number(election.endTime) <= now) {
          console.log(`  ⏭️  ID ${id} - Cuộc bầu cử đã kết thúc, bỏ qua`);
          continue;
        }

        console.log(`  Đang cấp quyền ID ${id}...`);
        const tx = await voting.authorizeVoter(id, wallet);
        await tx.wait();
        console.log(`  ✅ ID ${id} - Thành công! TxHash: ${tx.hash}`);
      } catch (e: any) {
        console.log(`  ❌ ID ${id} - Lỗi: ${e.message?.slice(0, 80)}`);
      }
    }
  }

  console.log("\n=== HOÀN TẤT CẤP QUYỀN ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
