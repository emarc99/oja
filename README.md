# Òjà

**Every sale builds your credit.**

Òjà is a Solana Pay checkout for market traders that banks can't see. Customers pay in USDC; every sale leaves a receipt on Solana in the trader's name; that record unlocks a working-capital advance; and the advance repays itself from a share of every later sale, split by the program in the same transaction.

In Yoruba, *òjà* is the cloth a mother uses to carry her child on her back while she keeps working. Òjà is credit that carries you while you sell.

Live on devnet: **https://oja-sash.vercel.app** · Program: [`6rpwpnvUSRzTMNR5R7kNAC9PFJJugJLCQUL9yZfRAwRu`](https://explorer.solana.com/address/6rpwpnvUSRzTMNR5R7kNAC9PFJJugJLCQUL9yZfRAwRu?cluster=devnet)

Built for the MLH Solana Hackathon.

## How it works

1. **Sell.** The trader types the sale the way they'd say it ("3 plates of jollof rice 1,500 each"). Gemini turns it into invoice lines; code re-adds the total and converts naira to USDC at a live rate (see below). The customer scans a Solana Pay QR code (or opens the checkout page) and pays. A sponsor wallet covers network fees, so customers need no SOL.
2. **Build your record.** `pay_invoice` writes a receipt account per invoice and updates the shop's sales count, volume and unique customers.
3. **Get an advance.** Once a shop has 5 sales from 3 different customers, it can request up to 30% of its sales volume, capped by a credit ladder (10, 25, 50, then 100 USDC as advances are repaid). A lender funds it from the Lend page. From then on, `pay_invoice` sends 20% of every sale to the lender until the advance and its 5% fee are repaid.

## Why the record can't be faked

Credit only works if the history is real. The program enforces:

| Attempt | Rejected with |
|---|---|
| Paying your own shop | `SelfPayment` |
| Paying with another token | `WrongMint` |
| Paying the same invoice twice | receipt already exists |
| Paying without repaying the open advance | `AdvanceAccountsMissing` |
| Sending the lender's share elsewhere | `WrongLenderAccount` |
| Borrowing beyond the record or ladder | `AdvanceTooLarge` / `AboveCreditLadder` |

Repeat customers count once (a ring of recent payers), and a shop can't fund its own advance. Off-chain, the app also flags customer wallets the shop owner has sent money to, shows that warning to lenders and pauses new advances. The **Try to cheat** panel on the shop page builds each of these transactions and simulates it against devnet so you can watch it fail.

A determined cheat with several unlinked wallets can still fake a small history; the credit ladder caps the first advance at 10 USDC so that costs more than it pays.

## AI, checked by code

- **Invoices:** Gemini reads the sale; code recomputes every line and the total, and shows the checks.
- **Lender note:** Gemini summarises the on-chain record; code verifies every number in the note against the record and flags anything it can't match.

## Live price

Each invoice converts naira to USDC at the moment it's made:

- **USDC/USD** is read on-chain from Pyth's USDC/USD price account on Solana. The app checks the account is owned by Pyth's receiver program, carries the USDC feed id and is under 10 minutes old.
- **USD/NGN** has no Pyth or Switchboard feed, so the app takes the median of two independent FX sources (ExchangeRate-API and currency-api) and flags the invoice if they disagree by more than 3%.

If no naira rate is available the invoice is refused rather than priced at a guess. The rate is folded into the invoice id, and the checks under each invoice show where it came from. The program itself only ever sees USDC.

## Run it

Requirements: Node 22+, a Phantom wallet on devnet, devnet USDC from [faucet.circle.com](https://faucet.circle.com).

```bash
cd app
cp .env.example .env.local   # add your Gemini key and, ideally, a devnet RPC URL
npm install
npm run setup                 # creates the fee sponsor; fund it with the command it prints
npm run dev
```

`npm run seed -- <shop-owner-address>` gives a shop a demo history from five generated customers. The demo shop on the live site was seeded this way.

The program lives in `programs/oja` (Anchor 1.2.2): `anchor build && anchor deploy --provider.cluster devnet`.

## Notes

- Devnet only. The FX sources quote the official mid-market rate; Nigeria's street rate can differ, which a production version would let the shop override.
- Built with help from AI coding tools (Cursor). Gemini runs in the app as described above.

## Licence

MIT
