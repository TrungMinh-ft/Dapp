# Frontend

Frontend cho Private Voting DApp, built với React, Vite và TypeScript.

## Mục đích
- Hiển thị danh sách election và trạng thái vote.
- Cho người dùng kết nối ví và gửi giao dịch vote.
- Cung cấp admin dashboard để tạo election, sync dữ liệu và quản lý whitelist.

## Công nghệ
- React
- React Router
- Vite
- TypeScript
- Ethers.js

## Routes chính

- `/`: trang giới thiệu
- `/gallery`: danh sách election
- `/proposal/:id`: chi tiết election và vote
- `/my-votes`: lịch sử vote theo wallet
- `/deployment`: admin dashboard

## Chạy local

```bash
npm install
npm run dev
```

Frontend mặc định chạy ở `http://localhost:5173`.

## Biến môi trường

Cấu hình trong `.env` hoặc copy từ `.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_CONTRACT_ADDRESS=0xYourPrivateVotingContractAddress
```

Ý nghĩa:
- `VITE_API_BASE_URL`: địa chỉ backend NestJS
- `VITE_CONTRACT_ADDRESS`: địa chỉ contract `PrivateVoting` đã deploy

## Admin dashboard

Trang `/deployment` hỗ trợ:
- tạo election mới
- sync từng election hoặc sync toàn bộ
- authorize/revoke whitelist
- đóng election
- xem whitelist và audit log đã sync

Admin API ưu tiên signed request bằng ví:
- frontend ký message bằng ví đang kết nối
- backend kiểm tra ví đó có nằm trong `ADMIN_WALLETS` hay không

`ADMIN_TOKEN` chỉ còn là fallback legacy nếu backend cho phép.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`
- `npm run test`

Hiện tại `npm run test` là smoke check dựa trên TypeScript typecheck.

## Lưu ý khi test

- MetaMask hoặc ví EVM phải chuyển sang Oasis Sapphire Testnet.
- Backend phải chạy và cho phép CORS từ domain frontend.
- Nếu election là private/whitelist, admin phải authorize ví voter trước khi họ vote. Nếu không, trang proposal sẽ báo ví không được phép bỏ phiếu.
- Nếu muốn nhiều người cùng test vote, tất cả phải truy cập cùng frontend và cùng `CONTRACT_ADDRESS`.
- Trang `My Votes` đọc lịch sử từ dữ liệu backend đã sync, không đọc trực tiếp từ blockchain.
- Nếu backend bật `ENABLE_AUTO_SYNC=true` và `ENABLE_CHAIN_LISTENERS=true`, lịch sử vote sẽ tự cập nhật sau khi vote thành công.
- Nếu backend không bật auto-sync/listener, cần vào `/deployment` và bấm `Sync Election` hoặc `Sync All` trước khi lịch sử vote hiện ra.
