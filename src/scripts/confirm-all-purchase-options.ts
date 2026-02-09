/**
 * Migration script to confirm all unconfirmed purchase options in the StoreCatalog collection
 *
 * This script:
 * 1. Finds all purchase options with confirmed = false or undefined
 * 2. Sets confirmed = true for each unconfirmed purchase option
 * 3. Updates the purchase option document
 *
 * The script is idempotent and safe to run multiple times.
 */

import { getDb } from "@utils/database.ts";
import { Collection } from "npm:mongodb";

interface PurchaseOptionDoc {
  _id: string;
  itemId: string;
  store: string;
  quantity: number;
  units: string;
  price: number;
  confirmed: boolean;
}

interface MigrationStats {
  purchaseOptionsProcessed: number;
  purchaseOptionsConfirmed: number;
  purchaseOptionsSkipped: number;
  errors: Array<{ purchaseOptionId?: string; error: string }>;
}

const COLLECTION_PREFIX = "StoreCatalog.purchaseOptions";

async function confirmAllPurchaseOptions() {
  console.log("Starting purchase option confirmation migration...\n");

  // Initialize database connection
  const [db, client] = await getDb();
  console.log("Database connection established.\n");

  // Access the purchase options collection directly
  const purchaseOptionsCollection = db.collection<PurchaseOptionDoc>(
    COLLECTION_PREFIX,
  );

  const stats: MigrationStats = {
    purchaseOptionsProcessed: 0,
    purchaseOptionsConfirmed: 0,
    purchaseOptionsSkipped: 0,
    errors: [],
  };

  try {
    // Get all purchase options
    const purchaseOptions = await purchaseOptionsCollection.find({}).toArray();
    console.log(`Found ${purchaseOptions.length} purchase options to process.\n`);

    if (purchaseOptions.length === 0) {
      console.log("No purchase options found. Skipping migration.");
      return;
    }

    // Process each purchase option
    for (const purchaseOption of purchaseOptions) {
      stats.purchaseOptionsProcessed++;

      try {
        // Check if purchase option is already confirmed
        if (purchaseOption.confirmed === true) {
          stats.purchaseOptionsSkipped++;
          console.log(
            `  ⊙ PurchaseOption ${purchaseOption._id}: Already confirmed`,
          );
          continue;
        }

        // Confirm the purchase option
        await purchaseOptionsCollection.updateOne(
          { _id: purchaseOption._id },
          { $set: { confirmed: true } },
        );

        stats.purchaseOptionsConfirmed++;
        console.log(
          `  ✓ PurchaseOption ${purchaseOption._id}: Confirmed successfully`,
        );
      } catch (error) {
        stats.errors.push({
          purchaseOptionId: purchaseOption._id,
          error: `Failed to confirm purchase option: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        console.error(
          `  ✗ PurchaseOption ${purchaseOption._id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Print summary
    printSummary(stats);
  } catch (error) {
    console.error("Fatal error during migration:", error);
    stats.errors.push({
      error: `Fatal error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  } finally {
    // Close database connection
    await client.close();
    console.log("\nDatabase connection closed.");
  }
}

function printSummary(stats: MigrationStats) {
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`Purchase options processed: ${stats.purchaseOptionsProcessed}`);
  console.log(`  Purchase options confirmed: ${stats.purchaseOptionsConfirmed}`);
  console.log(
    `  Purchase options skipped (already confirmed): ${stats.purchaseOptionsSkipped}`,
  );
  console.log(`\nTotal errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors) {
      if (error.purchaseOptionId) {
        console.log(
          `  PurchaseOption ${error.purchaseOptionId}: ${error.error}`,
        );
      } else {
        console.log(`  ${error.error}`);
      }
    }
  }

  console.log("=".repeat(60));
}

// Run the migration
if (import.meta.main) {
  confirmAllPurchaseOptions()
    .then(() => {
      console.log("\nMigration completed.");
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:", error);
      Deno.exit(1);
    });
}

