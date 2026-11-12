import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { paymentKeyFromEnvelope, paymentKeyFromHeader, transferTo } from "./stellarPayment.js";

function paymentXdr(destination: string): string {
  const source = Keypair.random();
  return new TransactionBuilder(new Account(source.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: "1.5000000",
      })
    )
    .setTimeout(30)
    .build()
    .toXDR();
}

describe("transferTo", () => {
  it("acepta un pago cuyo destino es payTo", () => {
    const payTo = Keypair.random().publicKey();
    const transfer = transferTo(paymentXdr(payTo), payTo);
    assert.ok(transfer);
    assert.equal(transfer.destination, payTo);
    assert.equal(transfer.amount, "1.5000000");
  });

  it("rechaza un pago a otra cuenta", () => {
    const payTo = Keypair.random().publicKey();
    const other = Keypair.random().publicKey();
    assert.equal(transferTo(paymentXdr(other), payTo), null);
  });

  it("un pago clásico no trae nonce de auth", () => {
    const payTo = Keypair.random().publicKey();
    assert.equal(paymentKeyFromEnvelope(paymentXdr(payTo)), null);
    const header = Buffer.from(JSON.stringify({ payload: { transaction: paymentXdr(payTo) } })).toString(
      "base64url"
    );
    assert.equal(paymentKeyFromHeader(header), null);
  });
});
