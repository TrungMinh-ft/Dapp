# Backend DApp

Backend phu tro cho Private Voting DApp dung NestJS + Prisma + PostgreSQL.

## Chuc nang
- Dong bo election, vote events va whitelist tu Oasis Sapphire.
- Cung cap REST API cho frontend doc nhanh va truy van lich su vote.
- Bao ve admin API bang chu ky vi admin allowlist; `ADMIN_TOKEN` chi con la fallback legacy cho dev noi bo.
- Ghi audit log cho cac thao tac sync va cap nhat metadata.

## Chay du an

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Bien moi truong

Sua file `.env`:
- `DATABASE_URL`
- `CONTRACT_ADDRESS`
- `OASIS_RPC_URL`
- `CORS_ORIGINS`
- `ADMIN_WALLETS`
- `ALLOW_LEGACY_ADMIN_TOKEN`
- `ADMIN_TOKEN`

Khuyen nghi production:
- Dat `ADMIN_WALLETS` thanh danh sach vi admin phan tach boi dau phay.
- Dat `ALLOW_LEGACY_ADMIN_TOKEN=false`.
- Gioi han `CORS_ORIGINS` dung domain frontend that su duoc phep goi API.

## Admin auth

Backend chap nhan hai co che:
- Khuyen nghi: frontend ky message bang vi admin, gui qua cac header `x-admin-address`, `x-admin-timestamp`, `x-admin-signature`.
- Legacy/dev only: gui `x-admin-token` khi `ALLOW_LEGACY_ADMIN_TOKEN=true`.

## Scripts
- `npm run build`
- `npm run sync`
- `npm run test`

## API
- `GET /health`
- `GET /elections`
- `GET /elections/active`
- `GET /elections/finished`
- `GET /elections/:id`
- `GET /elections/:id/results`
- `POST /elections/sync`
- `POST /elections/:id/sync`
- `POST /elections/:id/sync-events`
- `GET /votes/:electionId/status?wallet=0x...`
- `GET /votes/:electionId/events`
