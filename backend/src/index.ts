import "dotenv/config";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`[TIA] remesa-tia-backend listening on :${PORT}`);
  console.log(`[TIA] BOT_INTERNAL_URL=${process.env.BOT_INTERNAL_URL ?? "(not set)"}`);
});
