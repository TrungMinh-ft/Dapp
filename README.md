# Backend

Backend cho Private Voting DApp, xay dung bang NestJS, Prisma va PostgreSQL.

## Muc dich

- Dong bo du lieu election tu smart contract tren Oasis Sapphire
- Luu vote events, whitelist va metadata off-chain de frontend doc nhanh
- Cung cap REST API cho election, vote status va admin operations

## Cong nghe

- NestJS
- Prisma
- PostgreSQL
- Ethers.js

## Chay local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Backend mac dinh chay o `http://localhost:3001`.

## Bien moi truong

Cau hinh trong `.env`:

- `PORT`: cong backend
- `DATABASE_URL`: chuoi ket noi PostgreSQL
- `OASIS_RPC_URL`: RPC endpoint cua Oasis Sapphire
- `CONTRACT_ADDRESS`: dia chi contract `PrivateVoting`
- `CORS_ORIGINS`: danh sach origin duoc phep goi API, phan tach bang dau phay
- `SYNC_INTERVAL_MS`: chu ky auto-sync
- `SYNC_ON_STARTUP`: sync khi khoi dong
- `ENABLE_AUTO_SYNC`: bat auto-sync nen
- `ENABLE_CHAIN_LISTENERS`: bat listener on-chain
- `ADMIN_WALLETS`: danh sach vi admin allowlist, phan tach bang dau phay
- `ADMIN_TOKEN`: token legacy cho moi truong dev
- `ALLOW_LEGACY_ADMIN_TOKEN`: cho phep dung `ADMIN_TOKEN`
- `ADMIN_AUTH_MAX_SKEW_SECONDS`: do lech thoi gian toi da cho signed admin request
- `ADMIN_RATE_LIMIT_WINDOW_MS`: cua so rate limit admin auth
- `ADMIN_RATE_LIMIT_MAX_ATTEMPTS`: so lan auth sai toi da trong mot cua so

## Admin auth

Backend ho tro 2 cach xac thuc admin:

1. Khuyen nghi: signed request bang vi admin
2. Legacy/dev only: `x-admin-token` khi `ALLOW_LEGACY_ADMIN_TOKEN=true`

Signed request dung cac header:

- `x-admin-address`
- `x-admin-timestamp`
- `x-admin-nonce`
- `x-admin-signature`

Khuyen nghi production:

- Dien `ADMIN_WALLETS`
- Dat `ALLOW_LEGACY_ADMIN_TOKEN=false`
- Gioi han `CORS_ORIGINS` dung domain frontend that

## Scripts

- `npm run build`
- `npm run start`
- `npm run start:dev`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run sync`
- `npm run test`

## API chinh

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

## Ghi chu

- `POST /elections/:id/sync` hien sync ca election record, vote events va whitelist
- Trang lich su vote o frontend doc tu du lieu `voteEvents` da duoc backend sync vao database, khong doc truc tiep tu chain
- Neu muon lich su vote va whitelist tu cap nhat sau khi co giao dich moi, bat:
  - `SYNC_ON_STARTUP=true`
  - `ENABLE_AUTO_SYNC=true`
  - `ENABLE_CHAIN_LISTENERS=true`
- Co che chong replay cho admin signed request hien dung nonce cache trong memory; du cho mot backend instance don. Neu scale nhieu instance, nen chuyen nonce store sang Redis hoac DB dung chung.
