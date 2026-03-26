#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-sys

/**
 * CartOrder backfill migration (clear-and-rebuild).
 *
 * What this script does:
 * 1) Reads all MenuCollection menus and groups them by cart week (Sunday->Saturday).
 * 2) Deletes all existing CartOrder carts.
 * 3) Recreates one CartOrder per week, attaching that week's menus.
 * 4) Runs CartOrder.recalculateCart for each created cart.
 * 5) Verifies migration invariants and prints a summary.
 *
 * Usage:
 *   deno run --allow-env --allow-net --allow-read --allow-sys src/scripts/migrate-cartorder-backfill.ts
 *   deno run --allow-env --allow-net --allow-read --allow-sys src/scripts/migrate-cartorder-backfill.ts --dry-run
 *   deno run --allow-env --allow-net --allow-read --allow-sys src/scripts/migrate-cartorder-backfill.ts --limit-weeks=25
 *
 * Notes:
 * - `--dry-run` computes all grouping/statistics but performs no writes.
 * - `--limit-weeks` processes only the first N weeks sorted by startDate asc.
 */

import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";
import CartOrderConcept from "@concepts/CartOrder/CartOrderConcept.ts";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

interface CliOptions {
  dryRun: boolean;
  limitWeeks: number | null;
}

interface WeekBucket {
  startDate: Date;
  endDate: Date;
  menus: Set<ID>;
}

interface MigrationStats {
  menusScanned: number;
  menusWithInvalidDate: number;
  uniqueWeeks: number;
  cartsDeleted: number;
  cartsCreated: number;
  recalcSuccess: number;
  recalcFailed: number;
  failures: Array<{ cart?: ID; error: string }>;
}

interface CartOrderDoc {
  _id: ID;
  startDate: Date;
  endDate: Date;
  menus: ID[];
  totalCost: number;
  menuCosts: Record<ID, number>;
  recipeCostsByMenu: Record<ID, Record<ID, number>>;
  aggregatedItems: Array<{
    itemId: ID;
    name: string;
    totalRequiredQuantity: number;
    baseUnits: string;
    purchaseOption: {
      purchaseOptionId: ID;
      store: string;
      quantityToBuy: number;
      cost: number;
      confirmed: boolean;
    };
    apportionedCost: number;
  }>;
  dataVersion: number;
  calculatedVersion: number;
}

const getSundayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
};

const getSaturdayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (6 - d.getUTCDay()));
  return d;
};

const parseArgs = (args: string[]): CliOptions => {
  let dryRun = false;
  let limitWeeks: number | null = null;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--limit-weeks=")) {
      const raw = arg.slice("--limit-weeks=".length).trim();
      const parsed = Number(raw);
      if (
        !Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)
      ) {
        throw new Error(
          `Invalid --limit-weeks value '${raw}'. Must be a positive integer.`,
        );
      }
      limitWeeks = parsed;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage:\n" +
          "  migrate-cartorder-backfill.ts [--dry-run] [--limit-weeks=N]\n",
      );
      Deno.exit(0);
    }
    throw new Error(`Unknown argument '${arg}'. Use --help for usage.`);
  }

  return { dryRun, limitWeeks };
};

async function main() {
  const { dryRun, limitWeeks } = parseArgs(Deno.args);

  const dbConn = Deno.env.get("MONGODB_URL");
  if (!dbConn) throw new Error("Missing MONGODB_URL.");
  const dbName = Deno.env.get("DB_NAME");
  if (!dbName) throw new Error("Missing DB_NAME.");

  const client = new MongoClient(dbConn);
  const stats: MigrationStats = {
    menusScanned: 0,
    menusWithInvalidDate: 0,
    uniqueWeeks: 0,
    cartsDeleted: 0,
    cartsCreated: 0,
    recalcSuccess: 0,
    recalcFailed: 0,
    failures: [],
  };

  try {
    await client.connect();
    const db = client.db(dbName);

    const menusCollection = db.collection<{ _id: ID; date: Date }>(
      "MenuCollection.menus",
    );
    const cartsCollection = db.collection<CartOrderDoc>("CartOrder.carts");
    const cartOrder = new CartOrderConcept(db);

    console.log("=== CartOrder Backfill Migration ===");
    console.log(`Database: ${dbName}`);
    console.log(`Mode: ${dryRun ? "DRY RUN" : "APPLY"}`);
    if (limitWeeks !== null) {
      console.log(`Week limit: ${limitWeeks}`);
    }

    // Step 1: Read menus and build weekly buckets
    const allMenus = await menusCollection.find({}, {
      projection: { _id: 1, date: 1 },
    }).toArray();
    stats.menusScanned = allMenus.length;

    const bucketMap = new Map<string, WeekBucket>();
    for (const menu of allMenus) {
      if (!(menu.date instanceof Date) || Number.isNaN(menu.date.getTime())) {
        stats.menusWithInvalidDate++;
        continue;
      }
      const normalizedDate = new Date(menu.date);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      const startDate = getSundayOfWeek(normalizedDate);
      const endDate = getSaturdayOfWeek(normalizedDate);
      const weekKey = startDate.toISOString();

      const existing = bucketMap.get(weekKey);
      if (existing) {
        existing.menus.add(menu._id);
      } else {
        bucketMap.set(weekKey, {
          startDate,
          endDate,
          menus: new Set<ID>([menu._id]),
        });
      }
    }

    let buckets = Array.from(bucketMap.values()).sort((a, b) =>
      a.startDate.getTime() - b.startDate.getTime()
    );
    if (limitWeeks !== null) {
      buckets = buckets.slice(0, limitWeeks);
    }
    stats.uniqueWeeks = buckets.length;

    console.log(`Menus scanned: ${stats.menusScanned}`);
    console.log(
      `Menus with invalid dates skipped: ${stats.menusWithInvalidDate}`,
    );
    console.log(`Unique weeks to migrate: ${stats.uniqueWeeks}`);

    // Step 2: clear old carts
    const existingCartCount = await cartsCollection.countDocuments({});
    if (!dryRun) {
      const deleteResult = await cartsCollection.deleteMany({});
      stats.cartsDeleted = deleteResult.deletedCount ?? 0;
    } else {
      stats.cartsDeleted = existingCartCount;
    }
    console.log(`Existing CartOrder carts cleared: ${stats.cartsDeleted}`);

    // Step 3 + 4: create new carts for each week
    const createdCartIds: ID[] = [];
    if (!dryRun) {
      const toInsert: CartOrderDoc[] = buckets.map((bucket) => ({
        _id: freshID(),
        startDate: bucket.startDate,
        endDate: bucket.endDate,
        menus: Array.from(bucket.menus),
        totalCost: 0,
        menuCosts: {},
        recipeCostsByMenu: {},
        aggregatedItems: [],
        dataVersion: 0,
        calculatedVersion: 0,
      }));

      if (toInsert.length > 0) {
        await cartsCollection.insertMany(toInsert);
        stats.cartsCreated = toInsert.length;
        for (const cart of toInsert) createdCartIds.push(cart._id);
      }
    } else {
      stats.cartsCreated = buckets.length;
    }
    console.log(`CartOrder carts created: ${stats.cartsCreated}`);

    // Step 5: recalculate
    if (!dryRun) {
      for (const cartId of createdCartIds) {
        const recalc = await cartOrder.recalculateCart({ cart: cartId });
        if ("error" in recalc) {
          stats.recalcFailed++;
          stats.failures.push({ cart: cartId, error: recalc.error });
          console.error(
            `  ✗ Recalc failed for cart ${cartId}: ${recalc.error}`,
          );
        } else {
          stats.recalcSuccess++;
        }
      }
    }
    console.log(`Recalculation successes: ${stats.recalcSuccess}`);
    console.log(`Recalculation failures: ${stats.recalcFailed}`);

    // Step 6: invariants
    const uniqueMenuAssignments = new Set<string>();
    let duplicateAssignments = 0;
    for (const bucket of buckets) {
      for (const menuId of bucket.menus) {
        const key = String(menuId);
        if (uniqueMenuAssignments.has(key)) duplicateAssignments++;
        uniqueMenuAssignments.add(key);
      }
    }

    if (duplicateAssignments > 0) {
      stats.failures.push({
        error:
          `Invariant failed: duplicate menu assignment count = ${duplicateAssignments}`,
      });
    }

    if (!dryRun) {
      const cartCount = await cartsCollection.countDocuments({});
      if (cartCount !== stats.uniqueWeeks) {
        stats.failures.push({
          error:
            `Invariant failed: cart count ${cartCount} != unique weeks ${stats.uniqueWeeks}`,
        });
      }

      if (stats.recalcSuccess > 0) {
        const mismatchVersionCount = await cartsCollection.countDocuments({
          _id: { $in: createdCartIds },
          $expr: { $ne: ["$dataVersion", "$calculatedVersion"] },
        });
        if (mismatchVersionCount > 0) {
          stats.failures.push({
            error:
              `Invariant failed: ${mismatchVersionCount} carts have data/calculated version mismatch after recalc.`,
          });
        }
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`menusScanned: ${stats.menusScanned}`);
    console.log(`menusWithInvalidDate: ${stats.menusWithInvalidDate}`);
    console.log(`uniqueWeeks: ${stats.uniqueWeeks}`);
    console.log(`cartsDeleted: ${stats.cartsDeleted}`);
    console.log(`cartsCreated: ${stats.cartsCreated}`);
    console.log(`recalcSuccess: ${stats.recalcSuccess}`);
    console.log(`recalcFailed: ${stats.recalcFailed}`);
    console.log(`failureCount: ${stats.failures.length}`);

    if (stats.failures.length > 0) {
      console.log("\nFailures:");
      for (const failure of stats.failures) {
        if (failure.cart) {
          console.log(`- cart ${failure.cart}: ${failure.error}`);
        } else {
          console.log(`- ${failure.error}`);
        }
      }
      if (!dryRun || stats.recalcFailed > 0) {
        Deno.exit(1);
      }
    }

    console.log("\nMigration completed successfully.");
  } finally {
    await client.close();
  }
}

if (import.meta.main) {
  await main();
}
