#!/usr/bin/env node
// Turns a TIA receipt CID into the arguments for `register_receipt`.
//
//   eval "$(node scripts/receipt-args.mjs <CID>)"
//
// Fetches the signed record from IPFS, checks it locally (same rules as
// backend/src/lib/receipt.ts verifyReceipt) and prints `export` lines:
//   RECEIPT_CID, RECEIPT_HASH (hex 32 bytes), RECEIPT_SIG (hex 64 bytes),
//   RECEIPT_SIGNER_G (G…), RECEIPT_SIGNER_HEX (hex 32 bytes)
// Only public data. No secret keys are read or printed.
// Node 18+, no dependencies.

import { createPublicKey, verify } from "node:crypto";

const PREFIX = "nirium-audit-v1:";
const GATEWAY = process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function die(msg) {
  console.error(`receipt-args: ${msg}`);
  process.exit(1);
}

function crc16xmodem(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

/** Stellar StrKey `G…` -> raw 32-byte ed25519 public key. */
function decodeG(g) {
  if (!/^G[A-Z2-7]{55}$/.test(g)) die(`not a G… public key: ${g}`);
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of g) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const raw = Buffer.from(out);
  if (raw.length !== 35 || raw[0] !== 6 << 3) die("bad G… version byte");
  const body = raw.subarray(0, 33);
  const crc = raw[33] | (raw[34] << 8);
  if (crc16xmodem(body) !== crc) die("bad G… checksum");
  return raw.subarray(1, 33);
}

const cid = (process.argv[2] ?? "").trim();
if (!/^[A-Za-z0-9]{46,100}$/.test(cid)) die("usage: node scripts/receipt-args.mjs <CID>");

const res = await fetch(GATEWAY + cid, { signal: AbortSignal.timeout(30_000) }).catch((e) =>
  die(`gateway error: ${e.message}`),
);
if (!res.ok) die(`gateway HTTP ${res.status}`);
const doc = await res.json().catch(() => die("record is not JSON"));

const hash = String(doc.content_sha256 ?? "").toLowerCase();
if (!/^[0-9a-f]{64}$/.test(hash)) die("record has no content_sha256");
const key = doc.agent?.key;
const sigB64 = doc.agent?.signature;
if (typeof key !== "string" || typeof sigB64 !== "string") die("record has no agent.key / agent.signature");

const signer = decodeG(key);
const sig = Buffer.from(sigB64, "base64");
if (sig.length !== 64) die("signature is not 64 bytes");

const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), signer]);
const ok = verify(null, Buffer.from(PREFIX + hash, "utf8"), createPublicKey({ key: spki, format: "der", type: "spki" }), sig);
if (!ok) die("signature does not verify; the contract would reject it");

console.error(`receipt-args: OK, ${cid} signed by ${key}`);
console.log(`export RECEIPT_CID=${cid}`);
console.log(`export RECEIPT_HASH=${hash}`);
console.log(`export RECEIPT_SIG=${sig.toString("hex")}`);
console.log(`export RECEIPT_SIGNER_G=${key}`);
console.log(`export RECEIPT_SIGNER_HEX=${signer.toString("hex")}`);
