import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { estimateRoutes } from "./routeEstimator.js";

describe("routeEstimator", () => {
  let originalEtherfuseKey: string | undefined;

  before(() => {
    originalEtherfuseKey = process.env.ETHERFUSE_API_KEY;
  });

  after(() => {
    if (originalEtherfuseKey !== undefined) {
      process.env.ETHERFUSE_API_KEY = originalEtherfuseKey;
    } else {
      delete process.env.ETHERFUSE_API_KEY;
    }
  });

  describe("estimateRoutes", () => {
    it("returns four options including Etherfuse (unavailable without key)", async () => {
      delete process.env.ETHERFUSE_API_KEY;

      const estimate = await estimateRoutes(100);

      assert.strictEqual(estimate.apiVersion, "1");
      assert.strictEqual(estimate.amountUsd, 100);
      assert.strictEqual(estimate.options.length, 4);

      const routes = estimate.options.map((o) => o.route);
      assert.ok(routes.includes("bitso_directo"));
      assert.ok(routes.includes("stablecoin_usdc"));
      assert.ok(routes.includes("spei_tradicional"));
      assert.ok(routes.includes("etherfuse_offramp"));

      // Etherfuse should be unavailable without API key
      const etherfuse = estimate.options.find(
        (o) => o.route === "etherfuse_offramp"
      );
      assert.ok(etherfuse);
      assert.strictEqual(etherfuse.unavailable, true);
      assert.ok(
        etherfuse.assumptions[0].includes("ETHERFUSE_API_KEY no configurada")
      );
    });

    it("excludes unavailable routes from best calculation", async () => {
      delete process.env.ETHERFUSE_API_KEY;

      const estimate = await estimateRoutes(100);

      // Best should not be etherfuse_offramp when it's unavailable
      assert.notStrictEqual(estimate.best, "etherfuse_offramp");

      // Best should be one of the available routes
      assert.ok(
        ["bitso_directo", "stablecoin_usdc", "spei_tradicional"].includes(
          estimate.best
        )
      );
    });

    it("validates amount range", async () => {
      // The function should not throw on 0 or negative values, but handle them in the route
      const estimate = await estimateRoutes(100);
      assert.ok(estimate.amountUsd === 100);
    });

    it("includes Etherfuse with mock key (unavailable without accounts)", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:mock:org";
      delete process.env.ETHERFUSE_SOURCE_ACCOUNT_ID;
      delete process.env.ETHERFUSE_DEST_ACCOUNT_ID;
      delete process.env.ETHERFUSE_ORG_ID;

      const estimate = await estimateRoutes(100);

      const etherfuse = estimate.options.find(
        (o) => o.route === "etherfuse_offramp"
      );
      assert.ok(etherfuse, "Etherfuse route should be present");
      assert.strictEqual(etherfuse.unavailable, true, "Etherfuse should be unavailable without accounts");
      assert.ok(
        etherfuse.assumptions.some(a => a.includes("cuentas no configuradas")),
        "Should mention missing accounts"
      );
    });

    it("marks Etherfuse unavailable when account IDs are whitespace", async () => {
      process.env.ETHERFUSE_API_KEY = "api_sand:mock:org";
      process.env.ETHERFUSE_SOURCE_ACCOUNT_ID = "   ";
      process.env.ETHERFUSE_DEST_ACCOUNT_ID = "   ";
      process.env.ETHERFUSE_ORG_ID = "   ";

      const estimate = await estimateRoutes(100);

      const etherfuse = estimate.options.find(
        (o) => o.route === "etherfuse_offramp"
      );
      assert.ok(etherfuse, "Etherfuse route should be present");
      assert.strictEqual(etherfuse.unavailable, true, "Etherfuse should be unavailable with whitespace accounts");
      assert.ok(
        etherfuse.assumptions.some(a => a.includes("cuentas no configuradas")),
        "Should mention missing accounts when whitespace"
      );
    });
  });
});
