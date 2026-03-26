# PrivateVoting Smart Contracts

Hop dong thong minh cho he thong bo phieu kin tren Oasis Sapphire.

## Thanh phan chinh
- `contracts/PrivateVoting.sol`: contract bo phieu.
- `scripts/deploy.ts`: deploy contract `PrivateVoting`.
- `scripts/createElection.ts`: tao election.
- `scripts/createFinishedElection.ts`: tao election da ket thuc de demo ket qua.
- `scripts/closeElection.ts`: dong election.
- `scripts/voteElection.ts`: gui giao dich vote.

## Chay test

Neu may dang dung Node 20/22:

```shell
npm test
```

Neu can dung Node 20 portable trong repo:

```shell
.\run-tests-node20.cmd
```

## Luu y
- Network Sapphire testnet duoc cau hinh trong `hardhat.config.ts`.
- Dat `PRIVATE_KEY` trong `.env` truoc khi deploy hoac chay script can signer.
