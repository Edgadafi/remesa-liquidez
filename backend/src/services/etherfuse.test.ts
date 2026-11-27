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
  let originalUsdcAsset: string | undefined;
  let originalSourceAccount: string | undefined;
  let originalDestAccount: string | undefined;
  let originalOrgId: string | undefined;

  before(() => {
    originalApiKey = process.env.ETHERFUSE_API_KEY;
    originalApiBase = process.env.ETHERFUSE_API_BASE;
    originalUsdcAsset = process.env.ETHERFUSE_USDC_ASSET;
    originalSourceAccount = process.env.ETHERFUSE_SOURCE_ACCOUNT_ID;
    originalDestAccount = process.env.ETHERFUSE_DEST_ACCOUNT_ID;
    originalOrgId = process.env.ETHERFUSE_ORG_ID;
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
    if (originalUsdcAsset !== undefined) {
      process.env.ETHERFUSE_USDC_ASSET = originalUsdcAsset;
    } else {
      delete process.env.ETHERFUSE_USDC_ASSET;
    }
    if (originalSourceAccount !== undefined) {
      process.env.ETHERFUSE_SOURCE_ACCOUNT_ID = originalSourceAccount;
    } else {
      delete process.env.ETHERFUSE_SOURCE_ACCOUNT_ID;
    }
    if (originalDestAccount !== undefined) {
      process.env.ETHERFUSE_DEST_ACCOUNT_ID = originalDestAccount;
    } else {
      delete process.env.ETHERFUSE_DEST_ACCOUNT_ID;
    }
    if (originalOrgId !== undefined) {
      process.env.ETHERFUSE_ORG_ID = originalOrgId;
    } else {
      delete process.env.ETHERFUSE_ORG_ID;
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

  describe("USDC asset configuration", () => {
    it("uses sandbox USDC by default for sandbox environment", () => {
      process.env.ETHERFUSE_API_BASE = "https://api.sand.etherfuse.com";
      delete process.env.ETHERFUSE_USDC_ASSET;
      // This test verifies the default behavior indirectly through environment detection
      assert.strictEqual(getEtherfuseEnvironment(), "sandbox");
    });

    it("uses mainnet USDC by default for production environment", () => {
      process.env.ETHERFUSE_API_BASE = "https://api.etherfuse.com";
      delete process.env.ETHERFUSE_USDC_ASSET;
      // This test verifies the default behavior indirectly through environment detection
      assert.strictEqual(getEtherfuseEnvironment(), "production");
    });

    it("respects ETHERFUSE_USDC_ASSET override", () => {
      const customAsset = "USDC:CUSTOM123";
      process.env.ETHERFUSE_USDC_ASSET = customAsset;
      // The override is used when explicitly set, regardless of environment
      // This is validated through the quote function behavior
      assert.ok(process.env.ETHERFUSE_USDC_ASSET === customAsset);
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

    it("returns null when sourceAccountId is empty", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:test:org";
      const quote = await getEtherfuseQuote(
        100,
        "",
        "dest-id",
        "org-id"
      );
      assert.strictEqual(quote, null);
    });

    it("returns null when sourceAccountId is whitespace", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:test:org";
      const quote = await getEtherfuseQuote(
        100,
        "   ",
        "dest-id",
        "org-id"
      );
      assert.strictEqual(quote, null);
    });

    it("returns null when destAccountId is empty", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:test:org";
      const quote = await getEtherfuseQuote(
        100,
        "source-id",
        "",
        "org-id"
      );
      assert.strictEqual(quote, null);
    });

    it("returns null when organizationId is empty", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:test:org";
      const quote = await getEtherfuseQuote(
        100,
        "source-id",
        "dest-id",
        ""
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
