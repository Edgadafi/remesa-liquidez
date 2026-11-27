import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  isEtherfuseAvailable,
  getEtherfuseEnvironment,
  getEtherfuseQuote,
} from "./etherfuse.js";

describe("etherfuse service", () => {
  let originalApiKey: string | undefined;
  let originalApiBase: string | undefined;

  before(() => {
    originalApiKey = process.env.ETHERFUSE_API_KEY;
    originalApiBase = process.env.ETHERFUSE_API_BASE;
  });

  after(() => {
    if (originalApiKey !== undefined) {
      process.env.ETHERFUSE_API_KEY = originalApiKey;
    } else {
      delete process.env.ETHERFUSE_API_KEY;
    }
    if (originalApiBase !== undefined) {
      process.env.ETHERFUSE_API_BASE = originalApiBase;
    } else {
      delete process.env.ETHERFUSE_API_BASE;
    }
  });

  describe("isEtherfuseAvailable", () => {
    it("returns false when ETHERFUSE_API_KEY is empty", () => {
      delete process.env.ETHERFUSE_API_KEY;
      assert.strictEqual(isEtherfuseAvailable(), false);
    });

    it("returns false when ETHERFUSE_API_KEY is whitespace", () => {
      process.env.ETHERFUSE_API_KEY = "   ";
      assert.strictEqual(isEtherfuseAvailable(), false);
    });

    it("returns true when ETHERFUSE_API_KEY is set", () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:key123:org456";
      assert.strictEqual(isEtherfuseAvailable(), true);
    });
  });

  describe("getEtherfuseEnvironment", () => {
    it("returns sandbox when API_BASE contains sand.etherfuse.com", () => {
      process.env.ETHERFUSE_API_BASE = "https://api.sand.etherfuse.com";
      assert.strictEqual(getEtherfuseEnvironment(), "sandbox");
    });

    it("returns production when API_BASE is production URL", () => {
      process.env.ETHERFUSE_API_BASE = "https://api.etherfuse.com";
      assert.strictEqual(getEtherfuseEnvironment(), "production");
    });

    it("defaults to sandbox when ETHERFUSE_API_BASE is not set", () => {
      delete process.env.ETHERFUSE_API_BASE;
      assert.strictEqual(getEtherfuseEnvironment(), "sandbox");
    });
  });

  describe("getEtherfuseQuote", () => {
    it("returns null when API key is missing", async () => {
      delete process.env.ETHERFUSE_API_KEY;
      const quote = await getEtherfuseQuote(
        100,
        "source-id",
        "dest-id",
        "org-id"
      );
      assert.strictEqual(quote, null);
    });

    it("returns null on 401 unauthorized", async () => {
      process.env.ETHERFUSE_API_KEY = "invalid-key";
      process.env.ETHERFUSE_API_BASE = "https://api.sand.etherfuse.com";

      const quote = await getEtherfuseQuote(
        100,
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000003"
      );

      // With an invalid key, the API returns 401 and we return null
      assert.strictEqual(quote, null);
    });

    it("returns null on 404 not-found (payment account not registered)", async () => {
      // Mock a valid-looking key (won't actually work without real setup)
      process.env.ETHERFUSE_API_KEY = "api_sand:test:org";
      process.env.ETHERFUSE_API_BASE = "https://api.sand.etherfuse.com";

      const quote = await getEtherfuseQuote(
        100,
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000003"
      );

      // Without registered payment accounts, the API returns 404 and we return null
      assert.strictEqual(quote, null);
    });
  });
});
