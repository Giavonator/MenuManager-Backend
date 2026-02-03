#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-sys

/**
 * Cleanup script to fix ALL menus that are incorrectly in multiple carts.
 * For each menu, keeps it only in the cart that matches its date.
 */

// Load .env file
import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";

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
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const cartsCollection = db.collection("WeeklyCart.carts");
    const menusCollection = db.collection("MenuCollection.menus");
    const compositeOrdersCollection = db.collection(
      "PurchaseSystem.compositeOrders",
    );

    // Find all menus
    const allMenus = await menusCollection.find({}).toArray();
    console.log("\nFound " + allMenus.length + " menus in database");

    let totalFixed = 0;
    let totalMenusWithIssues = 0;

    for (const menu of allMenus) {
      const menuId = menu._id;
      const menuDate = menu.date;

      if (!(menuDate instanceof Date)) {
        continue;
      }

      // Normalize menu date to start of day UTC
      const normalizedMenuDate = new Date(menuDate);
      normalizedMenuDate.setUTCHours(0, 0, 0, 0);

      // Find all carts containing this menu
      const cartsWithMenu = await cartsCollection.find({
        menus: menuId,
      }).toArray();

      if (cartsWithMenu.length === 0) {
        // Menu not in any cart - that's fine
        continue;
      }

      if (cartsWithMenu.length === 1) {
        // Menu is in exactly one cart - check if it's the correct one
        const cart = cartsWithMenu[0];
        const cartStartDate = new Date(cart.startDate);
        cartStartDate.setUTCHours(0, 0, 0, 0);
        const cartEndDate = new Date(cart.endDate);
        cartEndDate.setUTCHours(0, 0, 0, 0);

        if (
          normalizedMenuDate >= cartStartDate &&
          normalizedMenuDate <= cartEndDate
        ) {
          // Menu is in the correct cart
          continue;
        } else {
          // Menu is in the wrong cart - remove it
          console.log(
            "\nMenu " + menuId + " is in wrong cart (date: " +
              normalizedMenuDate.toISOString().split("T")[0] + ", cart week: " +
              cartStartDate.toISOString().split("T")[0] + " to " +
              cartEndDate.toISOString().split("T")[0] + ")",
          );
          await cartsCollection.updateOne(
            { _id: cart._id },
            { $pull: { menus: menuId } },
          );
          totalFixed++;
          continue;
        }
      }

      // Menu is in multiple carts - find the correct one
      totalMenusWithIssues++;
      console.log(
        "\n⚠ Menu " + menuId + " is in " + cartsWithMenu.length +
          " carts (date: " + normalizedMenuDate.toISOString().split("T")[0] +
          ")",
      );

      // Find the correct cart (where menuDate falls within cart's week)
      let correctCart: typeof cartsWithMenu[0] | null = null;
      for (const cart of cartsWithMenu) {
        const cartStartDate = new Date(cart.startDate);
        cartStartDate.setUTCHours(0, 0, 0, 0);
        const cartEndDate = new Date(cart.endDate);
        cartEndDate.setUTCHours(0, 0, 0, 0);

        if (
          normalizedMenuDate >= cartStartDate &&
          normalizedMenuDate <= cartEndDate
        ) {
          correctCart = cart;
          break;
        }
      }

      // Remove menu from all carts
      for (const cart of cartsWithMenu) {
        if (cart._id !== correctCart?._id) {
          console.log(
            "  Removing from cart " + cart._id + " (week: " +
              cart.startDate.toISOString().split("T")[0] + " to " +
              cart.endDate.toISOString().split("T")[0] + ")",
          );
          await cartsCollection.updateOne(
            { _id: cart._id },
            { $pull: { menus: menuId } },
          );
          totalFixed++;
        }
      }

      // If no correct cart found, remove from all and let syncs handle it
      if (!correctCart) {
        console.log(
          "  ⚠ No cart found for menu date " +
            normalizedMenuDate.toISOString().split("T")[0] +
            " - removing from all carts",
        );
        for (const cart of cartsWithMenu) {
          await cartsCollection.updateOne(
            { _id: cart._id },
            { $pull: { menus: menuId } },
          );
          totalFixed++;
        }
      } else {
        console.log(
          "  ✓ Keeping in cart " + correctCart._id + " (week: " +
            correctCart.startDate.toISOString().split("T")[0] + " to " +
            correctCart.endDate.toISOString().split("T")[0] + ")",
        );
      }
    }

    console.log("\n=== Summary (Menu-in-Cart Cleanup) ===");
    console.log("Menus with issues: " + totalMenusWithIssues);
    console.log("Total removals: " + totalFixed);

    // ============================================================================
    // Part 2: Fix duplicate composite orders
    // ============================================================================
    console.log("\n=== Checking for duplicate composite orders ===");
    let totalCompositeOrderFixes = 0;
    let totalMenusWithCompositeOrderIssues = 0;

    // Iterate through all menus again to check their composite orders
    for (const menu of allMenus) {
      const menuId = menu._id;
      const menuDate = menu.date;

      if (!(menuDate instanceof Date)) {
        continue;
      }

      // Normalize menu date to start of day UTC
      const normalizedMenuDate = new Date(menuDate);
      normalizedMenuDate.setUTCHours(0, 0, 0, 0);

      // Find menu's composite order by associateID
      const menuCompositeOrder = await compositeOrdersCollection.findOne({
        associateID: menuId,
      });

      if (!menuCompositeOrder) {
        // Menu doesn't have a composite order yet - that's fine
        continue;
      }

      const menuOrderId = menuCompositeOrder._id;

      // Find all composite orders that have this menu's composite order as a child
      // IMPORTANT: We only want to check cart composite orders, not menu or recipe composite orders
      // (Recipe composite orders can legitimately be under multiple menu composite orders)
      const queryField = "childCompositeOrders." + menuOrderId;
      const query: Record<string, unknown> = {};
      query[queryField] = { $exists: true };
      const allOrdersWithMenuOrder = await compositeOrdersCollection.find(
        query,
      ).toArray();

      // Filter to only include cart composite orders (those whose associateID matches a cart ID)
      const cartOrdersWithMenuOrder = [];
      for (const order of allOrdersWithMenuOrder) {
        const orderAssociateID = order.associateID;
        // Check if this associateID matches a cart (not a menu or recipe)
        const cart = await cartsCollection.findOne({ _id: orderAssociateID });
        if (cart) {
          // This is a cart composite order
          cartOrdersWithMenuOrder.push(order);
        }
        // If it's not a cart, it's a menu or recipe composite order - skip it
        // Recipe composite orders can be under multiple menu composite orders (that's normal)
      }

      if (cartOrdersWithMenuOrder.length === 0) {
        // Menu's composite order is not under any cart composite order - that's fine
        continue;
      }

      if (cartOrdersWithMenuOrder.length === 1) {
        // Menu's composite order is under exactly one cart composite order - check if it's correct
        const cartOrder = cartOrdersWithMenuOrder[0];
        const cartId = cartOrder.associateID;

        // Find the cart for this cartId
        const cart = await cartsCollection.findOne({ _id: cartId });
        if (!cart) {
          // Cart doesn't exist - remove the link
          console.log(
            "\nMenu " + menuId +
              "'s composite order is under non-existent cart " +
              cartId,
          );
          const unsetField = "childCompositeOrders." + menuOrderId;
          await compositeOrdersCollection.updateOne(
            { _id: cartOrder._id },
            { $unset: { [unsetField]: "" } },
          );
          // Also update the menu order's parentOrder to itself
          await compositeOrdersCollection.updateOne(
            { _id: menuOrderId },
            { $set: { parentOrder: menuOrderId, rootOrder: menuOrderId } },
          );
          totalCompositeOrderFixes++;
          continue;
        }

        const cartStartDate = new Date(cart.startDate);
        cartStartDate.setUTCHours(0, 0, 0, 0);
        const cartEndDate = new Date(cart.endDate);
        cartEndDate.setUTCHours(0, 0, 0, 0);

        if (
          normalizedMenuDate >= cartStartDate &&
          normalizedMenuDate <= cartEndDate
        ) {
          // Menu's composite order is under the correct cart composite order
          continue;
        } else {
          // Menu's composite order is under the wrong cart composite order
          console.log(
            "\nMenu " + menuId +
              "'s composite order is under wrong cart composite order (date: " +
              normalizedMenuDate.toISOString().split("T")[0] + ", cart week: " +
              cartStartDate.toISOString().split("T")[0] + " to " +
              cartEndDate.toISOString().split("T")[0] + ")",
          );
          const unsetField = "childCompositeOrders." + menuOrderId;
          await compositeOrdersCollection.updateOne(
            { _id: cartOrder._id },
            { $unset: { [unsetField]: "" } },
          );
          // Also update the menu order's parentOrder to itself
          await compositeOrdersCollection.updateOne(
            { _id: menuOrderId },
            { $set: { parentOrder: menuOrderId, rootOrder: menuOrderId } },
          );
          totalCompositeOrderFixes++;
          continue;
        }
      }

      // Menu's composite order is under multiple cart composite orders
      totalMenusWithCompositeOrderIssues++;
      console.log(
        "\n⚠ Menu " + menuId + "'s composite order is under " +
          cartOrdersWithMenuOrder.length +
          " cart composite orders (date: " +
          normalizedMenuDate.toISOString().split("T")[0] + ")",
      );

      // Find the correct cart composite order (where menuDate falls within cart's week)
      let correctCartOrder: typeof cartOrdersWithMenuOrder[0] | null = null;
      for (const cartOrder of cartOrdersWithMenuOrder) {
        const cartId = cartOrder.associateID;
        const cart = await cartsCollection.findOne({ _id: cartId });
        if (!cart) {
          continue; // Skip non-existent carts
        }

        const cartStartDate = new Date(cart.startDate);
        cartStartDate.setUTCHours(0, 0, 0, 0);
        const cartEndDate = new Date(cart.endDate);
        cartEndDate.setUTCHours(0, 0, 0, 0);

        if (
          normalizedMenuDate >= cartStartDate &&
          normalizedMenuDate <= cartEndDate
        ) {
          correctCartOrder = cartOrder;
          break;
        }
      }

      // Remove menu's composite order from all incorrect cart composite orders
      for (const cartOrder of cartOrdersWithMenuOrder) {
        if (cartOrder._id !== correctCartOrder?._id) {
          const cartId = cartOrder.associateID;
          const cart = await cartsCollection.findOne({ _id: cartId });
          const cartWeekStr = cart
            ? cart.startDate.toISOString().split("T")[0] + " to " +
              cart.endDate.toISOString().split("T")[0]
            : "non-existent cart";
          console.log(
            "  Removing from cart composite order " + cartOrder._id +
              " (cart: " + cartId + ", week: " + cartWeekStr + ")",
          );
          const unsetField = "childCompositeOrders." + menuOrderId;
          await compositeOrdersCollection.updateOne(
            { _id: cartOrder._id },
            { $unset: { [unsetField]: "" } },
          );
          totalCompositeOrderFixes++;
        }
      }

      // If no correct cart found, remove from all and let syncs handle it
      if (!correctCartOrder) {
        console.log(
          "  ⚠ No correct cart composite order found for menu date " +
            normalizedMenuDate.toISOString().split("T")[0] +
            " - removing from all",
        );
        for (const cartOrder of cartOrdersWithMenuOrder) {
          const unsetField = "childCompositeOrders." + menuOrderId;
          await compositeOrdersCollection.updateOne(
            { _id: cartOrder._id },
            { $unset: { [unsetField]: "" } },
          );
          totalCompositeOrderFixes++;
        }
        // Update the menu order's parentOrder to itself
        await compositeOrdersCollection.updateOne(
          { _id: menuOrderId },
          { $set: { parentOrder: menuOrderId, rootOrder: menuOrderId } },
        );
      } else {
        const correctCartId = correctCartOrder.associateID;
        const correctCart = await cartsCollection.findOne({
          _id: correctCartId,
        });
        const correctCartWeekStr = correctCart
          ? correctCart.startDate.toISOString().split("T")[0] + " to " +
            correctCart.endDate.toISOString().split("T")[0]
          : "unknown";
        console.log(
          "  ✓ Keeping under cart composite order " + correctCartOrder._id +
            " (cart: " + correctCartId + ", week: " + correctCartWeekStr + ")",
        );
        // Ensure the menu order's parentOrder and rootOrder are set correctly
        await compositeOrdersCollection.updateOne(
          { _id: menuOrderId },
          {
            $set: {
              parentOrder: correctCartOrder._id,
              rootOrder: correctCartOrder.rootOrder,
            },
          },
        );
      }
    }

    console.log("\n=== Final Summary ===");
    console.log("Menus with cart issues: " + totalMenusWithIssues);
    console.log("Total cart removals: " + totalFixed);
    console.log(
      "Menus with composite order issues: " +
        totalMenusWithCompositeOrderIssues,
    );
    console.log("Total composite order removals: " + totalCompositeOrderFixes);
    console.log("✓ Cleanup complete");
  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  } finally {
    await client.close();
    console.log("\nDisconnected from MongoDB");
  }
}

if (import.meta.main) {
  await main();
}
