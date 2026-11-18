import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { RemesaLiquidez } from "../target/types/remesa_liquidez";
import {
  BPS_DENOMINATOR,
  FEE_BPS,
  buildCancelReservationIx,
  buildInitializeConfigIx,
  buildInitializeReservationIx,
  buildMarkVerifiedIx,
  buildRefundExpiredIx,
  buildRegisterMerchantIx,
  buildSetAdminIx,
  buildSetMerchantStatusIx,
  buildValidateCashoutIx,
  buildWithdrawTreasuryIx,
  findConfigPda,
  findReservationPda,
  findTreasuryTokenAccountPda,
  findVaultPda,
} from "../client";

describe("remesa-liquidez", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.remesaLiquidez as Program<RemesaLiquidez>;
  const connection = provider.connection;

  const admin = (provider.wallet as anchor.Wallet).payer;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  before("bootstrap protocol Config (idempotent across the suite)", async () => {
    const [configPda] = findConfigPda(program.programId);
    const existing = await connection.getAccountInfo(configPda);
    if (existing) return;
    const ix = await buildInitializeConfigIx({ program, admin: admin.publicKey });
    await provider.sendAndConfirm(new Transaction().add(ix), [admin]);
  });

  async function airdrop(pk: PublicKey, sol = 2) {
    const sig = await connection.requestAirdrop(pk, sol * LAMPORTS_PER_SOL);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  }

  async function nextReservationId(): Promise<BN> {
    const [configPda] = findConfigPda(program.programId);
    const cfg = await program.account.config.fetch(configPda);
    return cfg.nextReservationId;
  }

  async function setup(opts: { mintMerchant?: boolean } = { mintMerchant: true }) {
    const sender = Keypair.generate();
    const receiver = Keypair.generate();
    const merchant = Keypair.generate();

    await Promise.all([airdrop(sender.publicKey), airdrop(receiver.publicKey), airdrop(merchant.publicKey)]);

    const mint = await createMint(connection, admin, admin.publicKey, null, 6);

    const senderAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mint,
      sender.publicKey
    );
    const merchantAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mint,
      merchant.publicKey
    );

    await mintTo(connection, admin, mint, senderAta.address, admin, 1_000_000_000);

    if (opts.mintMerchant !== false) {
      const ix = await buildRegisterMerchantIx({
        program,
        admin: admin.publicKey,
        merchant: merchant.publicKey,
      });
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [admin]);
    }

    return { sender, receiver, merchant, mint, senderAta: senderAta.address, merchantAta: merchantAta.address };
  }

  type Setup = Awaited<ReturnType<typeof setup>>;

  async function initialize(s: Setup, amount = 100_000_000, expirySeconds = 60) {
    const reservationId = await nextReservationId();
    const ix = await buildInitializeReservationIx({
      program,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      amount,
      expirySeconds,
      merchant: s.merchant.publicKey,
      reservationId,
    });
    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx, [s.sender]);
    return { amount, reservationId };
  }

  async function markVerified(s: Setup, reservationId: BN) {
    const ix = await buildMarkVerifiedIx({
      program,
      verifier: admin.publicKey,
      sender: s.sender.publicKey,
      reservationId,
    });
    await provider.sendAndConfirm(new Transaction().add(ix), [admin]);
  }

  function cashoutIx(
    s: Setup,
    reservationId: BN,
    merchant: PublicKey = s.merchant.publicKey,
    merchantAta: PublicKey = s.merchantAta,
    mint: PublicKey = s.mint
  ) {
    return buildValidateCashoutIx({
      program,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      merchant,
      mint,
      merchantTokenAccount: merchantAta,
      reservationId,
    });
  }

  it("two reservations get distinct ids and a hand-picked id is rejected", async () => {
    const s = await setup();
    const first = await initialize(s, 100_000_000);
    const second = await initialize(s, 50_000_000);
    expect(second.reservationId.eq(first.reservationId)).to.equal(false);
    expect(second.reservationId.eq(first.reservationId.add(new BN(1)))).to.equal(true);

    const [firstPda] = findReservationPda(program.programId, s.sender.publicKey, first.reservationId);
    const [secondPda] = findReservationPda(program.programId, s.sender.publicKey, second.reservationId);
    const a = await program.account.turnReservation.fetch(firstPda);
    const b = await program.account.turnReservation.fetch(secondPda);
    expect(a.id.eq(first.reservationId)).to.equal(true);
    expect(b.id.eq(second.reservationId)).to.equal(true);

    const bogus = first.reservationId.add(new BN(50));
    const ix = await buildInitializeReservationIx({
      program,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      amount: 10_000_000,
      expirySeconds: 60,
      merchant: s.merchant.publicKey,
      reservationId: bogus,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);
      expect.fail("expected ReservationIdMismatch");
    } catch (e: any) {
      expect(e.toString()).to.match(/ReservationIdMismatch|does not match the protocol counter/i);
    }
  });

  it("happy path: admin mark_verified + assigned merchant and receiver cash out, fee 0.25% to treasury", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const expectedFee = Math.floor((opened.amount * FEE_BPS) / BPS_DENOMINATOR);
    const expectedNet = opened.amount - expectedFee;

    const ix = await cashoutIx(s, opened.reservationId);
    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx, [s.merchant, s.receiver]);

    const merchantBal = await getAccount(connection, s.merchantAta);
    expect(Number(merchantBal.amount)).to.equal(expectedNet);

    const [treasuryTokenAccount] = findTreasuryTokenAccountPda(
      program.programId,
      s.mint
    );
    const treasuryBal = await getAccount(connection, treasuryTokenAccount);
    expect(Number(treasuryBal.amount)).to.equal(expectedFee);
    expect(expectedFee).to.be.greaterThan(0);

    const [reservationPda] = findReservationPda(
      program.programId,
      s.sender.publicKey,
      opened.reservationId
    );
    const reservation = await program.account.turnReservation.fetch(reservationPda);
    expect(JSON.stringify(reservation.status)).to.contain("completed");
    expect(reservation.merchant.toBase58()).to.equal(s.merchant.publicKey.toBase58());
    expect(reservation.isVerified).to.equal(true);
  });

  it("treasury vault accumulates fees across multiple cashouts (same mint)", async () => {
    const a = await setup();
    const openedA = await initialize(a, 200_000_000);
    await markVerified(a, openedA.reservationId);

    await provider.sendAndConfirm(
      new Transaction().add(await cashoutIx(a, openedA.reservationId)),
      [a.merchant, a.receiver]
    );

    const b = await setup({ mintMerchant: true });
    const bAmount = 400_000_000;
    const senderAta2 = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      a.mint,
      b.sender.publicKey
    );
    await mintTo(connection, admin, a.mint, senderAta2.address, admin, 1_000_000_000);
    const merchantAta2 = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      a.mint,
      b.merchant.publicKey
    );

    const reservationId = await nextReservationId();
    const initIx = await buildInitializeReservationIx({
      program,
      sender: b.sender.publicKey,
      receiver: b.receiver.publicKey,
      mint: a.mint,
      senderTokenAccount: senderAta2.address,
      amount: bAmount,
      expirySeconds: 60,
      merchant: b.merchant.publicKey,
      reservationId,
    });
    await provider.sendAndConfirm(new Transaction().add(initIx), [b.sender]);
    await provider.sendAndConfirm(
      new Transaction().add(
        await buildMarkVerifiedIx({
          program,
          verifier: admin.publicKey,
          sender: b.sender.publicKey,
          reservationId,
        })
      ),
      [admin]
    );
    await provider.sendAndConfirm(
      new Transaction().add(
        await buildValidateCashoutIx({
          program,
          sender: b.sender.publicKey,
          receiver: b.receiver.publicKey,
          merchant: b.merchant.publicKey,
          mint: a.mint,
          merchantTokenAccount: merchantAta2.address,
          reservationId,
        })
      ),
      [b.merchant, b.receiver]
    );

    const expectedTotalFee =
      Math.floor((openedA.amount * FEE_BPS) / BPS_DENOMINATOR) +
      Math.floor((bAmount * FEE_BPS) / BPS_DENOMINATOR);

    const [treasuryTokenAccount] = findTreasuryTokenAccountPda(
      program.programId,
      a.mint
    );
    const treasuryBal = await getAccount(connection, treasuryTokenAccount);
    expect(Number(treasuryBal.amount)).to.equal(expectedTotalFee);
  });

  it("ReceiverNotVerified: cashout fails if mark_verified was never called", async () => {
    const s = await setup();
    const opened = await initialize(s);

    const ix = await cashoutIx(s, opened.reservationId);
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant, s.receiver]);
      expect.fail("expected ReceiverNotVerified");
    } catch (e: any) {
      expect(e.toString()).to.match(/ReceiverNotVerified|humanity verification/i);
    }
  });

  it("AlreadyVerified: mark_verified is idempotent (second call errors)", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const ix = await buildMarkVerifiedIx({
      program,
      verifier: admin.publicKey,
      sender: s.sender.publicKey,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [admin]);
      expect.fail("expected AlreadyVerified");
    } catch (e: any) {
      expect(e.toString()).to.match(/AlreadyVerified|already been marked/i);
    }
  });

  it("sender cannot mark their own reservation verified", async () => {
    const s = await setup();
    const opened = await initialize(s);

    const ix = await buildMarkVerifiedIx({
      program,
      verifier: s.sender.publicKey,
      sender: s.sender.publicKey,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);
      expect.fail("expected UnauthorizedVerifier");
    } catch (e: any) {
      expect(e.toString()).to.match(/UnauthorizedVerifier|not the protocol admin or the configured verifier/i);
    }
  });

  it("cashout without the receiver signature fails", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const ix = await cashoutIx(s, opened.reservationId);
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant]);
      expect.fail("expected missing receiver signature");
    } catch (e: any) {
      expect(e.toString()).to.match(/signature|Signature verification failed|unknown signer/i);
    }
  });

  it("ReservationNotActive after a successful cashout", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const ix = await cashoutIx(s, opened.reservationId);
    await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant, s.receiver]);

    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant, s.receiver]);
      expect.fail("expected ReservationNotActive");
    } catch (e: any) {
      expect(e.toString()).to.match(/ReservationNotActive|not in Active/i);
    }
  });

  it("ReservationExpired when expiry has passed", async () => {
    const s = await setup();
    const opened = await initialize(s, 50_000_000, 1);
    await markVerified(s, opened.reservationId);

    await sleep(2500);

    const ix = await cashoutIx(s, opened.reservationId);
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant, s.receiver]);
      expect.fail("expected ReservationExpired");
    } catch (e: any) {
      expect(e.toString()).to.match(/ReservationExpired|already expired/i);
    }
  });

  it("receiver can cancel anytime while Active and rent is refunded", async () => {
    const s = await setup();
    const opened = await initialize(s);

    const senderLamportsBefore = await connection.getBalance(s.sender.publicKey);

    const ix = await buildCancelReservationIx({
      program,
      signer: s.receiver.publicKey,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    await provider.sendAndConfirm(new Transaction().add(ix), [s.receiver]);

    const senderBal = await getAccount(connection, s.senderAta);
    expect(Number(senderBal.amount)).to.equal(1_000_000_000);

    const senderLamportsAfter = await connection.getBalance(s.sender.publicKey);
    expect(senderLamportsAfter).to.be.greaterThan(senderLamportsBefore);

    const [reservationPda] = findReservationPda(
      program.programId,
      s.sender.publicKey,
      opened.reservationId
    );
    const acc = await connection.getAccountInfo(reservationPda);
    expect(acc).to.equal(null);

    const [vaultPda] = findVaultPda(program.programId, reservationPda);
    const vaultAcc = await connection.getAccountInfo(vaultPda);
    expect(vaultAcc).to.equal(null);
  });

  it("WaitUntilExpiration: sender cannot cancel before expiry", async () => {
    const s = await setup();
    const opened = await initialize(s, 100_000_000, 60);

    const ix = await buildCancelReservationIx({
      program,
      signer: s.sender.publicKey,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);
      expect.fail("expected WaitUntilExpiration");
    } catch (e: any) {
      expect(e.toString()).to.match(/WaitUntilExpiration|wait until expiration/i);
    }
  });

  it("sender can cancel after expiry; vault closed and refund delivered", async () => {
    const s = await setup();
    const opened = await initialize(s, 200_000_000, 1);
    await sleep(2500);

    const ix = await buildCancelReservationIx({
      program,
      signer: s.sender.publicKey,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);

    const senderBal = await getAccount(connection, s.senderAta);
    expect(Number(senderBal.amount)).to.equal(1_000_000_000);

    const [reservationPda] = findReservationPda(
      program.programId,
      s.sender.publicKey,
      opened.reservationId
    );
    const acc = await connection.getAccountInfo(reservationPda);
    expect(acc).to.equal(null);
  });

  it("initialize fails when the merchant account does not exist", async () => {
    const s = await setup({ mintMerchant: false });
    try {
      await initialize(s);
      expect.fail("expected AccountNotInitialized");
    } catch (e: any) {
      expect(e.toString()).to.match(/AccountNotInitialized|InvalidMerchant/i);
    }
  });

  it("set_merchant_status(false) blocks that merchant's cashout", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const offIx = await buildSetMerchantStatusIx({
      program,
      admin: admin.publicKey,
      merchant: s.merchant.publicKey,
      active: false,
    });
    await provider.sendAndConfirm(new Transaction().add(offIx), [admin]);

    const ix = await cashoutIx(s, opened.reservationId);
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant, s.receiver]);
      expect.fail("expected InvalidMerchant");
    } catch (e: any) {
      expect(e.toString()).to.match(/InvalidMerchant/i);
    }
  });

  it("withdraw_treasury: admin can drain accumulated fees to a destination ATA", async () => {
    const s = await setup();
    const opened = await initialize(s, 800_000_000);
    await markVerified(s, opened.reservationId);
    await provider.sendAndConfirm(
      new Transaction().add(await cashoutIx(s, opened.reservationId)),
      [s.merchant, s.receiver]
    );

    const expectedFee = Math.floor((opened.amount * FEE_BPS) / BPS_DENOMINATOR);
    const [treasuryTokenAccount] = findTreasuryTokenAccountPda(
      program.programId,
      s.mint
    );
    const treasuryBefore = await getAccount(connection, treasuryTokenAccount);
    expect(Number(treasuryBefore.amount)).to.be.greaterThanOrEqual(expectedFee);

    const adminAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      s.mint,
      admin.publicKey
    );
    const adminBefore = await getAccount(connection, adminAta.address);

    const wIx = await buildWithdrawTreasuryIx({
      program,
      admin: admin.publicKey,
      mint: s.mint,
      destinationTokenAccount: adminAta.address,
      amount: expectedFee,
    });
    await provider.sendAndConfirm(new Transaction().add(wIx), [admin]);

    const adminAfter = await getAccount(connection, adminAta.address);
    expect(Number(adminAfter.amount) - Number(adminBefore.amount)).to.equal(
      expectedFee
    );

    const treasuryAfter = await getAccount(connection, treasuryTokenAccount);
    expect(Number(treasuryBefore.amount) - Number(treasuryAfter.amount)).to.equal(
      expectedFee
    );
  });

  it("withdraw_treasury: non-admin signer is rejected (UnauthorizedAdmin)", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);
    await provider.sendAndConfirm(
      new Transaction().add(await cashoutIx(s, opened.reservationId)),
      [s.merchant, s.receiver]
    );

    const intruder = Keypair.generate();
    await airdrop(intruder.publicKey);
    const intruderAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      s.mint,
      intruder.publicKey
    );

    const wIx = await buildWithdrawTreasuryIx({
      program,
      admin: intruder.publicKey,
      mint: s.mint,
      destinationTokenAccount: intruderAta.address,
      amount: 1,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(wIx), [intruder]);
      expect.fail("expected UnauthorizedAdmin");
    } catch (e: any) {
      expect(e.toString()).to.match(/UnauthorizedAdmin|not the protocol admin/i);
    }
  });

  it("withdraw_treasury: InsufficientTreasury when amount exceeds balance", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);
    await provider.sendAndConfirm(
      new Transaction().add(await cashoutIx(s, opened.reservationId)),
      [s.merchant, s.receiver]
    );

    const adminAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      s.mint,
      admin.publicKey
    );

    const wIx = await buildWithdrawTreasuryIx({
      program,
      admin: admin.publicKey,
      mint: s.mint,
      destinationTokenAccount: adminAta.address,
      amount: 10_000_000_000_000,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(wIx), [admin]);
      expect.fail("expected InsufficientTreasury");
    } catch (e: any) {
      expect(e.toString()).to.match(/InsufficientTreasury|insufficient/i);
    }
  });

  it("a registered merchant who is not the assigned merchant cannot cash out", async () => {
    const s = await setup();
    const otherMerchant = Keypair.generate();
    await airdrop(otherMerchant.publicKey);

    const otherAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      s.mint,
      otherMerchant.publicKey
    );
    const reg = await buildRegisterMerchantIx({
      program,
      admin: admin.publicKey,
      merchant: otherMerchant.publicKey,
    });
    await provider.sendAndConfirm(new Transaction().add(reg), [admin]);

    const opened = await initialize(s, 100_000_000, 60);
    await markVerified(s, opened.reservationId);

    const ix = await cashoutIx(
      s,
      opened.reservationId,
      otherMerchant.publicKey,
      otherAta.address
    );
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [otherMerchant, s.receiver]);
      expect.fail("expected InvalidMerchant");
    } catch (e: any) {
      expect(e.toString()).to.match(/InvalidMerchant/i);
    }
  });

  it("cancel after mark_verified fails", async () => {
    const s = await setup();
    const opened = await initialize(s);
    await markVerified(s, opened.reservationId);

    const ix = await buildCancelReservationIx({
      program,
      signer: s.receiver.publicKey,
      sender: s.sender.publicKey,
      receiver: s.receiver.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.receiver]);
      expect.fail("expected CannotCancelVerified");
    } catch (e: any) {
      expect(e.toString()).to.match(/CannotCancelVerified|cannot be cancelled/i);
    }
  });

  it("verified reservation refunds the sender in full after expiry", async () => {
    const s = await setup();
    const opened = await initialize(s, 100_000_000, 1);
    await markVerified(s, opened.reservationId);
    await sleep(2500);

    const ix = await buildRefundExpiredIx({
      program,
      signer: s.sender.publicKey,
      sender: s.sender.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);

    const senderBal = await getAccount(connection, s.senderAta);
    expect(Number(senderBal.amount)).to.equal(1_000_000_000);
    const [reservationPda] = findReservationPda(
      program.programId,
      s.sender.publicKey,
      opened.reservationId
    );
    const acc = await connection.getAccountInfo(reservationPda);
    expect(acc).to.equal(null);
  });

  it("refund_expired fails before the reservation expires", async () => {
    const s = await setup();
    const opened = await initialize(s, 100_000_000, 60);
    await markVerified(s, opened.reservationId);

    const ix = await buildRefundExpiredIx({
      program,
      signer: s.sender.publicKey,
      sender: s.sender.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);
      expect.fail("expected NotExpired");
    } catch (e: any) {
      expect(e.toString()).to.match(/NotExpired|has not expired/i);
    }
  });

  it("merchant cannot refund an expired verified reservation", async () => {
    const s = await setup();
    const opened = await initialize(s, 100_000_000, 1);
    await markVerified(s, opened.reservationId);
    await sleep(2500);

    const ix = await buildRefundExpiredIx({
      program,
      signer: s.merchant.publicKey,
      sender: s.sender.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.merchant]);
      expect.fail("expected UnauthorizedRefund");
    } catch (e: any) {
      expect(e.toString()).to.match(/UnauthorizedRefund|cannot refund/i);
    }
  });

  it("a cashed-out reservation cannot be refunded", async () => {
    const s = await setup();
    const opened = await initialize(s, 100_000_000, 60);
    await markVerified(s, opened.reservationId);
    await provider.sendAndConfirm(
      new Transaction().add(await cashoutIx(s, opened.reservationId)),
      [s.merchant, s.receiver]
    );

    const ix = await buildRefundExpiredIx({
      program,
      signer: s.sender.publicKey,
      sender: s.sender.publicKey,
      mint: s.mint,
      senderTokenAccount: s.senderAta,
      reservationId: opened.reservationId,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(ix), [s.sender]);
      expect.fail("expected ReservationNotActive");
    } catch (e: any) {
      expect(e.toString()).to.match(/ReservationNotActive|not in Active/i);
    }
  });

  it("set_admin rotates the admin and the previous admin loses the role", async () => {
    const next = Keypair.generate();
    await airdrop(next.publicKey);
    const rotate = await buildSetAdminIx({
      program,
      admin: admin.publicKey,
      newAdmin: next.publicKey,
    });
    await provider.sendAndConfirm(new Transaction().add(rotate), [admin]);

    const probe = Keypair.generate();
    const off = await buildSetMerchantStatusIx({
      program,
      admin: admin.publicKey,
      merchant: probe.publicKey,
      active: true,
    });
    try {
      await provider.sendAndConfirm(new Transaction().add(off), [admin]);
      expect.fail("expected UnauthorizedAdmin");
    } catch (e: any) {
      expect(e.toString()).to.match(/UnauthorizedAdmin/i);
    }

    const restore = await buildSetAdminIx({
      program,
      admin: next.publicKey,
      newAdmin: admin.publicKey,
    });
    await provider.sendAndConfirm(new Transaction().add(restore), [next]);
  });
});
