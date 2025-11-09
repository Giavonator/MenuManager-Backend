/**
 * Migration script to migrate existing StoreCatalog data to PurchaseSystem
 *
 * This script:
 * 1. Migrates all Items to SelectOrders
 * 2. Migrates all PurchaseOptions to AtomicOrders
 *
 * The script is idempotent and safe to run multiple times.
 */

import { getDb } from "@utils/database.ts";
import StoreCatalogConcept from "@concepts/StoreCatalog/StoreCatalogConcept.ts";
import PurchaseSystemConcept from "@concepts/PurchaseSystem/PurchaseSystemConcept.ts";

interface MigrationStats {
  itemsProcessed: number;
  selectOrdersCreated: number;
  selectOrdersSkipped: number;
  purchaseOptionsProcessed: number;
  atomicOrdersCreated: number;
  atomicOrdersSkipped: number;
  errors: Array<{ item?: string; purchaseOption?: string; error: string }>;
}

async function migrateStoreCatalogToPurchaseSystem() {
  console.log("Starting StoreCatalog to PurchaseSystem migration...\n");

  // Initialize database connection
  const [db, client] = await getDb();
  console.log("Database connection established.\n");

  // Create concept instances
  const storeCatalog = new StoreCatalogConcept(db);
  const purchaseSystem = new PurchaseSystemConcept(db);

  const stats: MigrationStats = {
    itemsProcessed: 0,
    selectOrdersCreated: 0,
    selectOrdersSkipped: 0,
    purchaseOptionsProcessed: 0,
    atomicOrdersCreated: 0,
    atomicOrdersSkipped: 0,
    errors: [],
  };

  try {
    // Phase 1: Migrate Items to SelectOrders
    console.log("=== Phase 1: Migrating Items to SelectOrders ===\n");
    await migrateItemsToSelectOrders(storeCatalog, purchaseSystem, stats);

    // Phase 2: Migrate PurchaseOptions to AtomicOrders
    console.log(
      "\n=== Phase 2: Migrating PurchaseOptions to AtomicOrders ===\n",
    );
    await migratePurchaseOptionsToAtomicOrders(
      storeCatalog,
      purchaseSystem,
      stats,
    );

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

async function migrateItemsToSelectOrders(
  storeCatalog: StoreCatalogConcept,
  purchaseSystem: PurchaseSystemConcept,
  stats: MigrationStats,
) {
  // Get all items
  const allItemsResult = await storeCatalog._getAllItems({});
  if ("error" in allItemsResult) {
    stats.errors.push({
      error: `Failed to get all items: ${allItemsResult.error}`,
    });
    console.error(`Error: ${allItemsResult.error}`);
    return;
  }

  const items = allItemsResult[0]?.items || [];
  console.log(`Found ${items.length} items to process.`);

  if (items.length === 0) {
    console.log("No items found. Skipping migration.");
    return;
  }

  // Process each item
  for (const itemId of items) {
    stats.itemsProcessed++;

    try {
      // Check if SelectOrder already exists for this item
      const existingOrderResult = await purchaseSystem._getOrderByAssociateID({
        associateID: itemId,
      });

      if ("error" in existingOrderResult) {
        // Order doesn't exist, create it
        const createResult = await purchaseSystem.createSelectOrder({
          associateID: itemId,
        });

        if ("error" in createResult) {
          stats.errors.push({
            item: itemId,
            error: `Failed to create SelectOrder: ${createResult.error}`,
          });
          console.error(
            `  ✗ Item ${itemId}: Failed to create SelectOrder - ${createResult.error}`,
          );
        } else {
          stats.selectOrdersCreated++;
          console.log(
            `  ✓ Item ${itemId}: Created SelectOrder ${createResult.selectOrder}`,
          );
        }
      } else {
        // Order already exists, check if it's a SelectOrder
        const orders = existingOrderResult;
        if (orders.length > 0) {
          const order = orders[0].order;
          if ("childAtomicOrders" in order) {
            // It's a SelectOrder
            stats.selectOrdersSkipped++;
            console.log(
              `  ⊙ Item ${itemId}: SelectOrder already exists (${order._id})`,
            );
          } else {
            // It's not a SelectOrder (shouldn't happen, but handle gracefully)
            stats.errors.push({
              item: itemId,
              error: `Order exists but is not a SelectOrder: ${order._id}`,
            });
            console.error(
              `  ✗ Item ${itemId}: Order exists but is not a SelectOrder`,
            );
          }
        }
      }
    } catch (error) {
      stats.errors.push({
        item: itemId,
        error: `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      console.error(`  ✗ Item ${itemId}: ${error}`);
    }
  }
}

async function migratePurchaseOptionsToAtomicOrders(
  storeCatalog: StoreCatalogConcept,
  purchaseSystem: PurchaseSystemConcept,
  stats: MigrationStats,
) {
  // Get all items
  const allItemsResult = await storeCatalog._getAllItems({});
  if ("error" in allItemsResult) {
    stats.errors.push({
      error: `Failed to get all items: ${allItemsResult.error}`,
    });
    console.error(`Error: ${allItemsResult.error}`);
    return;
  }

  const items = allItemsResult[0]?.items || [];
  console.log(`Processing PurchaseOptions for ${items.length} items.`);

  if (items.length === 0) {
    console.log("No items found. Skipping PurchaseOption migration.");
    return;
  }

  // Process each item's purchase options
  for (const itemId of items) {
    try {
      // Get purchase options for this item
      const purchaseOptionsResult = await storeCatalog._getItemPurchaseOptions({
        item: itemId,
      });

      if ("error" in purchaseOptionsResult) {
        stats.errors.push({
          item: itemId,
          error:
            `Failed to get purchase options: ${purchaseOptionsResult.error}`,
        });
        console.error(
          `  ✗ Item ${itemId}: Failed to get purchase options - ${purchaseOptionsResult.error}`,
        );
        continue;
      }

      const purchaseOptions = purchaseOptionsResult[0]?.purchaseOptions || [];

      if (purchaseOptions.length === 0) {
        console.log(`  ⊙ Item ${itemId}: No purchase options to process`);
        continue;
      }

      // Get the SelectOrder for this item (should exist from Phase 1)
      const selectOrderResult = await purchaseSystem._getOrderByAssociateID({
        associateID: itemId,
      });

      if ("error" in selectOrderResult || selectOrderResult.length === 0) {
        stats.errors.push({
          item: itemId,
          error:
            `SelectOrder not found for item. Phase 1 may have failed for this item.`,
        });
        console.error(
          `  ✗ Item ${itemId}: SelectOrder not found. Skipping purchase options.`,
        );
        continue;
      }

      // Verify it's a SelectOrder
      const order = selectOrderResult[0].order;
      if (!("childAtomicOrders" in order)) {
        stats.errors.push({
          item: itemId,
          error: `Order for item is not a SelectOrder: ${order._id}`,
        });
        console.error(
          `  ✗ Item ${itemId}: Order is not a SelectOrder. Skipping purchase options.`,
        );
        continue;
      }

      const selectOrderId = order._id;

      // Process each purchase option
      for (const purchaseOptionId of purchaseOptions) {
        stats.purchaseOptionsProcessed++;

        try {
          // Check if AtomicOrder already exists for this purchase option
          const existingAtomicOrderResult = await purchaseSystem
            ._getOrderByAssociateID({
              associateID: purchaseOptionId,
            });

          if ("error" in existingAtomicOrderResult) {
            // AtomicOrder doesn't exist, create it
            // Get purchase option details
            const poDetailsResult = await storeCatalog
              ._getPurchaseOptionDetails({
                purchaseOption: purchaseOptionId,
              });

            if ("error" in poDetailsResult || poDetailsResult.length === 0) {
              stats.errors.push({
                purchaseOption: purchaseOptionId,
                error: `Failed to get purchase option details: ${
                  "error" in poDetailsResult
                    ? poDetailsResult.error
                    : "No details returned"
                }`,
              });
              console.error(
                `    ✗ PurchaseOption ${purchaseOptionId}: Failed to get details`,
              );
              continue;
            }

            const { quantity, units, price } = poDetailsResult[0];

            // Validate data
            if (quantity <= 0) {
              stats.errors.push({
                purchaseOption: purchaseOptionId,
                error: `Invalid quantity: ${quantity}`,
              });
              console.error(
                `    ✗ PurchaseOption ${purchaseOptionId}: Invalid quantity ${quantity}`,
              );
              continue;
            }

            if (price < 0) {
              stats.errors.push({
                purchaseOption: purchaseOptionId,
                error: `Invalid price: ${price}`,
              });
              console.error(
                `    ✗ PurchaseOption ${purchaseOptionId}: Invalid price ${price}`,
              );
              continue;
            }

            // Create AtomicOrder
            const createResult = await purchaseSystem.createAtomicOrder({
              selectOrder: selectOrderId,
              associateID: purchaseOptionId,
              quantity,
              units,
              price,
            });

            if ("error" in createResult) {
              stats.errors.push({
                purchaseOption: purchaseOptionId,
                error: `Failed to create AtomicOrder: ${createResult.error}`,
              });
              console.error(
                `    ✗ PurchaseOption ${purchaseOptionId}: Failed to create AtomicOrder - ${createResult.error}`,
              );
            } else {
              stats.atomicOrdersCreated++;
              console.log(
                `    ✓ PurchaseOption ${purchaseOptionId}: Created AtomicOrder ${createResult.atomicOrder}`,
              );
            }
          } else {
            // AtomicOrder already exists
            const orders = existingAtomicOrderResult;
            if (orders.length > 0) {
              const order = orders[0].order;
              if ("parentOrder" in order) {
                // It's an AtomicOrder
                stats.atomicOrdersSkipped++;
                console.log(
                  `    ⊙ PurchaseOption ${purchaseOptionId}: AtomicOrder already exists (${order._id})`,
                );
              } else {
                // It's not an AtomicOrder (shouldn't happen)
                stats.errors.push({
                  purchaseOption: purchaseOptionId,
                  error: `Order exists but is not an AtomicOrder: ${order._id}`,
                });
                console.error(
                  `    ✗ PurchaseOption ${purchaseOptionId}: Order exists but is not an AtomicOrder`,
                );
              }
            }
          }
        } catch (error) {
          stats.errors.push({
            purchaseOption: purchaseOptionId,
            error: `Unexpected error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          console.error(`    ✗ PurchaseOption ${purchaseOptionId}: ${error}`);
        }
      }
    } catch (error) {
      stats.errors.push({
        item: itemId,
        error: `Unexpected error processing item: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      console.error(`  ✗ Item ${itemId}: ${error}`);
    }
  }
}

function printSummary(stats: MigrationStats) {
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`Items processed: ${stats.itemsProcessed}`);
  console.log(`  SelectOrders created: ${stats.selectOrdersCreated}`);
  console.log(
    `  SelectOrders skipped (already existed): ${stats.selectOrdersSkipped}`,
  );
  console.log(`\nPurchaseOptions processed: ${stats.purchaseOptionsProcessed}`);
  console.log(`  AtomicOrders created: ${stats.atomicOrdersCreated}`);
  console.log(
    `  AtomicOrders skipped (already existed): ${stats.atomicOrdersSkipped}`,
  );
  console.log(`\nTotal errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors) {
      if (error.item) {
        console.log(`  Item ${error.item}: ${error.error}`);
      } else if (error.purchaseOption) {
        console.log(`  PurchaseOption ${error.purchaseOption}: ${error.error}`);
      } else {
        console.log(`  ${error.error}`);
      }
    }
  }

  console.log("=".repeat(60));
}

// Run the migration
if (import.meta.main) {
  migrateStoreCatalogToPurchaseSystem()
    .then(() => {
      console.log("\nMigration completed.");
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:", error);
      Deno.exit(1);
    });
}
