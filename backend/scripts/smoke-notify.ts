/**
 * Smoke test local: POST /api/tia/notify
 * Uso: npm run smoke:notify -- 521234567890
 */
import "dotenv/config";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const userWA = process.argv[2] ?? "521234567890";

const body = {
  walletSolana: "BsuHTPQxWPyiToz8fZcrP2STGripLmbAaT11AezwBaw",
  userWA,
  amountUSDC: 10,
  reservationPda: "DemoPda12345678901234567890123456789012",
  isVerified: true,
  txSignature: "smoke_test_signature",
};

const res = await fetch(`${base}/api/tia/notify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log("status:", res.status);
console.log(JSON.stringify(await res.json(), null, 2));
