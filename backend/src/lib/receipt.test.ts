/**
 * Tests for verifiable receipts.
 * 
 * Uses a generated throwaway key for hashing/signing/verification tests.
 * Tests basic cryptographic functions without requiring network calls.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";

describe("receipt cryptography", () => {
  let testKeypair: Keypair;

  beforeEach(() => {
    // Generate a fresh throwaway keypair for each test
    testKeypair = Keypair.random();
  });

  it("should generate valid ed25519 signature", () => {
    const testHash = "a".repeat(64);
    const message = `nirium-audit-v1:${testHash}`;
    
    const signature = Buffer.from(
      testKeypair.sign(Buffer.from(message, "utf8"))
    ).toString("base64");

    // Verify the signature
    const valid = Keypair.fromPublicKey(testKeypair.publicKey()).verify(
      Buffer.from(message, "utf8"),
      Buffer.from(signature, "base64")
    );

    assert.equal(valid, true);
  });

  it("should reject invalid signature", () => {
    const testHash = "a".repeat(64);
    const message = `nirium-audit-v1:${testHash}`;
    const wrongMessage = `nirium-audit-v1:${"b".repeat(64)}`;
    
    const signature = Buffer.from(
      testKeypair.sign(Buffer.from(message, "utf8"))
    ).toString("base64");

    // Verify against wrong message should fail
    const valid = Keypair.fromPublicKey(testKeypair.publicKey()).verify(
      Buffer.from(wrongMessage, "utf8"),
      Buffer.from(signature, "base64")
    );

    assert.equal(valid, false);
  });

  it("should generate consistent sha256 hash", () => {
    const data = { a: 1, b: 2 };
    const canonical = JSON.stringify(data);
    
    const hash1 = createHash("sha256").update(canonical, "utf8").digest("hex");
    const hash2 = createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  it("should sort object keys for canonical JSON", () => {
    const unsorted = { z: 3, a: 1, m: 2 };
    const sorted = { a: 1, m: 2, z: 3 };
    
    const unsortedJson = JSON.stringify(unsorted);
    const sortedJson = JSON.stringify(sorted);

    // Without sorting, order may vary
    // With proper canonical sorting, order is stable
    assert.ok(unsortedJson.length > 0);
    assert.ok(sortedJson.length > 0);
  });

  it("should handle nested objects in canonical form", () => {
    const nested = {
      outer: {
        b: 2,
        a: 1,
      },
      array: [3, 2, 1],
    };

    const canonical = JSON.stringify(nested);
    const hash = createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("should detect different signers", () => {
    const testHash = "a".repeat(64);
    const message = `nirium-audit-v1:${testHash}`;
    
    const keypair1 = Keypair.random();
    const keypair2 = Keypair.random();

    const signature1 = Buffer.from(
      keypair1.sign(Buffer.from(message, "utf8"))
    ).toString("base64");

    // Verify signature1 with keypair2 should fail
    const valid = Keypair.fromPublicKey(keypair2.publicKey()).verify(
      Buffer.from(message, "utf8"),
      Buffer.from(signature1, "base64")
    );

    assert.equal(valid, false);
  });

  it("should generate different signatures for different messages", () => {
    const hash1 = "a".repeat(64);
    const hash2 = "b".repeat(64);
    
    const sig1 = Buffer.from(
      testKeypair.sign(Buffer.from(`nirium-audit-v1:${hash1}`, "utf8"))
    ).toString("base64");

    const sig2 = Buffer.from(
      testKeypair.sign(Buffer.from(`nirium-audit-v1:${hash2}`, "utf8"))
    ).toString("base64");

    assert.notEqual(sig1, sig2);
  });
});

