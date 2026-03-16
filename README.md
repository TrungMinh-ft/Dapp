# BackendDapp

Backend phụ trợ cho Private Voting DApp dùng NestJS + Prisma + PostgreSQL.

## Chức năng
- Đồng bộ election từ smart contract Oasis Sapphire
- Cung cấp REST API cho frontend đọc nhanh
- Kiểm tra trạng thái đã vote / được quyền vote
- Lưu vote events và tx hash đã bắt được

## Chạy dự án

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

## Biến môi trường
Sửa file `.env`:
- `DATABASE_URL`
- `CONTRACT_ADDRESS`
- `OASIS_RPC_URL`

## API
- `GET /health`
- `GET /elections`
- `GET /elections/:id`
- `GET /elections/:id/results`
- `POST /elections/sync`
- `GET /votes/:electionId/status?wallet=0x...`
- `GET /votes/:electionId/events`
