import "@x402/express";
import "@x402/core/server";
import "@x402/stellar/exact/server";
import { createApp } from "./app.cjs";

// Node 24 loads traced TypeScript as CommonJS. api/app.cjs is the esbuild
// bundle of src/app.ts (nirium 0.11 is inlined because it ships ESM without
// "type": "module"). Regenerate with `npm run bundle:api`.
export default createApp();
