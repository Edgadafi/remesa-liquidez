import "@x402/express";
import "@x402/core/server";
import "@x402/stellar/exact/server";
import { createApp } from "./app.cjs";

// Node 24 loads traced TypeScript as CommonJS. api/app.cjs is the esbuild
// bundle of src/app.ts (zod and @lifi/sdk are ESM). Regenerate with
// `npm run bundle:api` from a tree that has nirium 0.16.0 installed.
export default createApp();
