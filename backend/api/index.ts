import "@x402/express";
import "@x402/core/server";
import "@x402/stellar/exact/server";
import { createApp } from "./app.cjs";

// Node 24 on Vercel loads traced .ts as CommonJS, so src/app.ts cannot be
// imported directly ("Cannot use import statement outside a module").
// api/app.cjs is the esbuild bundle of that app (packages left external).
export default createApp();
