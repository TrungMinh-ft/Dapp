# Backend

Backend cho Private Voting DApp, built với NestJS, Prisma và PostgreSQL.

## Mục đích
- Đồng bộ dữ liệu election từ smart contract trên Oasis Sapphire.
- Lưu vote events, whitelist và metadata off-chain để frontend đọc nhanh.
- Cung cấp REST API cho danh sách election, chi tiết election, vote status và admin operations.

## Công nghệ
- NestJS
- Prisma
- PostgreSQL
- Ethers.js

## Chạy local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Backend mặc định chạy ở `http://localhost:3001`.

## Biến môi trường

Cấu hình trong `.env`:

- `PORT`: cổng backend
- `DATABASE_URL`: chuỗi kết nối PostgreSQL
- `OASIS_RPC_URL`: RPC endpoint của Oasis Sapphire
- `CONTRACT_ADDRESS`: địa chỉ contract `PrivateVoting`
- `CORS_ORIGINS`: danh sách origin được phép gọi API, phân tách bằng dấu phẩy
- `SYNC_INTERVAL_MS`: chu kỳ auto-sync
- `SYNC_ON_STARTUP`: sync khi khởi động
- `ENABLE_AUTO_SYNC`: bật auto-sync nền
- `ENABLE_CHAIN_LISTENERS`: bật listener on-chain
- `ADMIN_WALLETS`: danh sách ví admin allowlist, phân tách bằng dấu phẩy
- `ADMIN_TOKEN`: token legacy cho môi trường dev
- `ALLOW_LEGACY_ADMIN_TOKEN`: cho phép dùng `ADMIN_TOKEN`
- `ADMIN_AUTH_MAX_SKEW_SECONDS`: độ lệch thời gian tối đa cho signed admin request
- `ADMIN_RATE_LIMIT_WINDOW_MS`: cửa sổ rate limit admin auth
- `ADMIN_RATE_LIMIT_MAX_ATTEMPTS`: số lần auth sai tối đa trong một cửa sổ

## Admin auth

Backend hiện hỗ trợ 2 cách xác thực admin:

1. Khuyến nghị: signed request bằng ví admin
2. Legacy/dev only: `x-admin-token` khi `ALLOW_LEGACY_ADMIN_TOKEN=true`

Signed request dùng các header:
- `x-admin-address`
- `x-admin-timestamp`
- `x-admin-nonce`
- `x-admin-signature`

Khuyến nghị production:
- Điền `ADMIN_WALLETS`
- Đặt `ALLOW_LEGACY_ADMIN_TOKEN=false`
- Giới hạn `CORS_ORIGINS` đúng domain frontend thật

## Scripts

- `npm run build`
- `npm run start`
- `npm run start:dev`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run sync`
- `npm run test`

## API chính

Public:
- `GET /health`
- `GET /elections`
- `GET /elections/active`
- `GET /elections/finished`
- `GET /elections/:id`
- `GET /elections/:id/results`
- `GET /votes/:electionId/status?wallet=0x...`
- `GET /votes/:electionId/events`

Admin:
- `POST /elections/sync`
- `POST /elections/:id/sync`
- `POST /elections/:id/sync-events`
- `GET /elections/:id/authorized-voters`
- `PATCH /elections/:id/admin-metadata`
- `GET /elections/admin/logs`
- `POST /elections/admin/logs`

Swagger docs:
- `GET /api`

## Ghi chú

- `POST /elections/:id/sync` hiện sync cả election record, vote events và whitelist.
- Trang lịch sử vote ở frontend đọc từ dữ liệu `voteEvents` đã được backend sync vào database, không đọc trực tiếp từ chain.
- Nếu muốn lịch sử vote và whitelist tự cập nhật sau khi có giao dịch mới, bật:
  - `SYNC_ON_STARTUP=true`
  - `ENABLE_AUTO_SYNC=true`
  - `ENABLE_CHAIN_LISTENERS=true`
- Cơ chế chống replay cho admin signed request hiện dùng nonce cache trong memory; đủ cho một backend instance đơn. Nếu scale nhiều instance, nên chuyển nonce store sang Redis hoặc DB dùng chung.
