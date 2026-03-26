# Smart Contract

Phần smart contract của Private Voting DApp, dùng Hardhat và deploy lên Oasis Sapphire.

## Thành phần chính

- `contracts/PrivateVoting.sol`: contract bỏ phiếu
- `scripts/deploy.ts`: deploy contract
- `scripts/createElection.ts`: tạo election mới
- `scripts/createFinishedElection.ts`: tạo election đã kết thúc để demo kết quả
- `scripts/closeElection.ts`: đóng election
- `scripts/voteElection.ts`: gửi giao dịch vote
- `test/PrivateVoting.ts`: test chính cho contract

## Yêu cầu

- Node.js 20 hoặc 22
- Hoặc dùng Node 20 portable đi kèm trong repo qua các script `.cmd`

## Cấu hình

Cấu hình trong `.env`:

- `PRIVATE_KEY`: private key dùng để deploy hoặc chạy script cần signer

Network Sapphire testnet được cấu hình sẵn trong `hardhat.config.ts`.

## Chạy test

Nếu máy đã có Node 20/22:

```bash
npm test
```

Nếu muốn dùng Node 20 portable trong repo:

```cmd
.\run-tests-node20.cmd
```

## Scripts

- `npm test`
- `npm run test:node20`
- `npm run clean`
- `npm run check:node`

## Luồng sử dụng cơ bản

1. Điền `PRIVATE_KEY` vào `.env`
2. Deploy contract bằng script deploy
3. Lấy địa chỉ contract và cập nhật vào backend/frontend
4. Tạo election
5. Cho voter kết nối ví và vote qua frontend

## Ghi chú

- Contract hiện hỗ trợ public election và private election theo whitelist.
- Quyền authorize/revoke whitelist và close election thuộc về creator của election đó.
