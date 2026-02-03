#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-sys

/**
 * Fix script to repair menu composite order linkages to cart composite orders.
 * 
 * This script fixes data integrity issues where:
 * 1. Menu composite orders have incorrect parentOrder/rootOrder (pointing to themselves)
 * 2. Menu composite orders are not properly linked as children of cart composite orders
 * 
 * For each menu:
 * 1. Find which cart it belongs to (via WeeklyCart.carts)
 * 2. Find the cart's composite order (via PurchaseSystem.compositeOrders by associateID)
 * 3. Ensure the menu composite order is a child of the cart composite order
 * 4. Update the menu composite order's parentOrder and rootOrder to point to the cart
 */

// Load .env file
import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";
import { ID } from "../src/utils/types.ts";

async function main() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  if (!DB_CONN) {
    console.error("Error: MONGODB_URL environment variable not set");
    Deno.exit(1);
  }

  const DB_NAME = Deno.env.get("DB_NAME") || "MenuManager";

  console.log("Connecting to MongoDB...");
  const client = new MongoClient(DB_CONN);

  try {
    await client.connect();
    console.log("Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const cartsCollection = db.collection("WeeklyCart.carts");
    const compositeOrdersCollection = db.collection(
      "PurchaseSystem.compositeOrders",
    );

    // Find all cart composite orders (they have associateID pointing to cart)
    const allCartCompositeOrders = await compositeOrdersCollection
      .find({
        associateID: { $exists: true },
        childSelectOrders: { $exists: true }, // Cart composite orders have this
      })
      .toArray();

    console.log(
      `Found ${allCartCompositeOrders.length} cart composite orders\n`,
    );

    let totalFixed = 0;
    let totalMenusChecked = 0;
    let totalMenusWithIssues = 0;

    // For each cart composite order, find menus in that cart and fix their composite orders
    for (const cartCompositeOrder of allCartCompositeOrders) {
      const cartId = cartCompositeOrder.associateID as ID;
      const cartCompositeOrderId = cartCompositeOrder._id as ID;

      // Find the cart document to get its menus
      const cartDoc = await cartsCollection.findOne({ _id: cartId });
      if (!cartDoc) {
        console.log(
          `  ⚠ Cart ${cartId} not found in WeeklyCart.carts, skipping...`,
        );
        continue;
      }

      const menuIds = cartDoc.menus || [];
      if (menuIds.length === 0) {
        continue; // No menus in this cart
      }

      console.log(
        `\nProcessing cart ${cartId} (composite: ${cartCompositeOrderId}) with ${menuIds.length} menus`,
      );

      // For each menu in the cart, find and fix its composite order
      for (const menuId of menuIds) {
        totalMenusChecked++;

        // Find the menu's composite order (by associateID)
        const menuCompositeOrder = await compositeOrdersCollection.findOne({
          associateID: menuId,
          childSelectOrders: { $exists: true }, // Menu composite orders have this
        });

        if (!menuCompositeOrder) {
          console.log(
            `  ⚠ Menu ${menuId} has no composite order, skipping...`,
          );
          continue;
        }

        const menuCompositeOrderId = menuCompositeOrder._id as ID;
        const currentParentOrder = menuCompositeOrder.parentOrder as ID;
        const currentRootOrder = menuCompositeOrder.rootOrder as ID;
        const cartRootOrder = cartCompositeOrder.rootOrder as ID;

        // Check if menu composite order is already correctly linked
        const isChildOfCart = cartCompositeOrder.childCompositeOrders &&
          menuCompositeOrderId in cartCompositeOrder.childCompositeOrders;
        const hasCorrectParent = currentParentOrder === cartCompositeOrderId;
        const hasCorrectRoot = currentRootOrder === cartRootOrder;

        if (isChildOfCart && hasCorrectParent && hasCorrectRoot) {
          // Already correct, skip
          continue;
        }

        totalMenusWithIssues++;
        console.log(
          `  🔧 Fixing menu ${menuId} (composite: ${menuCompositeOrderId})`,
        );
        console.log(
          `     Current: parentOrder=${currentParentOrder}, rootOrder=${currentRootOrder}`,
        );
        console.log(
          `     Should be: parentOrder=${cartCompositeOrderId}, rootOrder=${cartRootOrder}`,
        );

        // Fix 1: Ensure menu composite order is a child of cart composite order
        if (!isChildOfCart) {
          await compositeOrdersCollection.updateOne(
            { _id: cartCompositeOrderId },
            {
              $set: {
                [`childCompositeOrders.${menuCompositeOrderId}`]: 1.0,
              },
            },
          );
          console.log(
            `     ✓ Added menu composite order to cart's childCompositeOrders`,
          );
        }

        // Fix 2: Update menu composite order's parentOrder
        if (!hasCorrectParent) {
          await compositeOrdersCollection.updateOne(
            { _id: menuCompositeOrderId },
            { $set: { parentOrder: cartCompositeOrderId } },
          );
          console.log(`     ✓ Updated parentOrder to cart composite order`);
        }

        // Fix 3: Update menu composite order's rootOrder (and all its descendants)
        if (!hasCorrectRoot) {
          // Update rootOrder recursively for menu and all its children
          await updateRootOrderRecursive(
            compositeOrdersCollection,
            menuCompositeOrderId,
            cartRootOrder,
          );
          console.log(`     ✓ Updated rootOrder to cart root order`);
        }

        totalFixed++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Menus checked: ${totalMenusChecked}`);
    console.log(`Menus with issues: ${totalMenusWithIssues}`);
    console.log(`Menus fixed: ${totalFixed}`);

    await client.close();
    console.log("\n✅ Script completed successfully");
  } catch (error) {
    console.error("Error:", error);
    await client.close();
    Deno.exit(1);
  }
}

/**
 * Recursively update rootOrder for a composite order and all its descendants
 */
async function updateRootOrderRecursive(
  collection: any,
  compositeOrderId: ID,
  newRootOrder: ID,
): Promise<void> {
  // Update this composite order's rootOrder
  await collection.updateOne(
    { _id: compositeOrderId },
    { $set: { rootOrder: newRootOrder } },
  );

  // Get the composite order to find its children
  const compositeOrder = await collection.findOne({ _id: compositeOrderId });
  if (!compositeOrder) return;

  // Recursively update all child composite orders
  const childCompositeOrders = compositeOrder.childCompositeOrders || {};
  for (const childId of Object.keys(childCompositeOrders)) {
    await updateRootOrderRecursive(
      collection,
      childId as ID,
      newRootOrder,
    );
  }
}

if (import.meta.main) {
  main();
}
