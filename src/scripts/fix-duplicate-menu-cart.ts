#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Quick script to fix menu 019c2368-148e-787c-bcdb-b0978c7e6c82
 * that is incorrectly in multiple carts due to previous bugs.
 *
 * The menu's date is 2026-02-02, so it should only be in the cart
 * for week 2026-02-01 to 2026-02-07.
 */

// Load .env file
import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";

const MENU_ID = "019c2368-148e-787c-bcdb-b0978c7e6c82";
const CORRECT_CART_ID = "019c110f-83b2-7a35-a56b-9c0560547b05"; // Week 2026-02-01 to 2026-02-07
const WRONG_CART_ID = "019c19b9-5112-74d4-af61-1a344b63fc11"; // Week 2026-02-08 to 2026-02-14

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

    // Check current state - find all carts containing this menu
    console.log("\n=== Checking current state ===");
    const allCartsWithMenu = await cartsCollection.find({
      menus: MENU_ID,
    }).toArray();

    console.log(
      `Found ${allCartsWithMenu.length} cart(s) containing the menu:`,
    );
    for (const cart of allCartsWithMenu) {
      console.log(`  - Cart ${cart._id}:`, {
        startDate: cart.startDate?.toISOString()?.split("T")[0],
        endDate: cart.endDate?.toISOString()?.split("T")[0],
        menuCount: cart.menus?.length ?? 0,
        menus: cart.menus,
      });
    }

    // Also check the specific carts we're looking for
    const correctCart = await cartsCollection.findOne({ _id: CORRECT_CART_ID });
    const wrongCart = await cartsCollection.findOne({ _id: WRONG_CART_ID });

    console.log(`\nChecking specific carts:`);
    console.log(`Correct cart (${CORRECT_CART_ID}):`, {
      exists: correctCart !== null,
      hasMenu: correctCart?.menus?.includes(MENU_ID) ?? false,
      menuCount: correctCart?.menus?.length ?? 0,
      startDate: correctCart?.startDate?.toISOString()?.split("T")[0],
      endDate: correctCart?.endDate?.toISOString()?.split("T")[0],
      allMenus: correctCart?.menus,
    });

    console.log(`Wrong cart (${WRONG_CART_ID}):`, {
      exists: wrongCart !== null,
      hasMenu: wrongCart?.menus?.includes(MENU_ID) ?? false,
      menuCount: wrongCart?.menus?.length ?? 0,
      startDate: wrongCart?.startDate?.toISOString()?.split("T")[0],
      endDate: wrongCart?.endDate?.toISOString()?.split("T")[0],
      allMenus: wrongCart?.menus,
    });

    // Find all carts to see what's in the database
    console.log(`\n=== All carts in database ===`);
    const allCarts = await cartsCollection.find({}).toArray();
    console.log(`Total carts: ${allCarts.length}`);
    for (const cart of allCarts.slice(0, 10)) { // Show first 10
      console.log(`  - Cart ${cart._id}:`, {
        startDate: cart.startDate?.toISOString()?.split("T")[0],
        endDate: cart.endDate?.toISOString()?.split("T")[0],
        menuCount: cart.menus?.length ?? 0,
        hasOurMenu: cart.menus?.includes(MENU_ID) ?? false,
      });
    }

    // Remove menu from all wrong carts (any cart that's not the correct one)
    console.log("\n=== Removing menu from wrong carts ===");
    let removedCount = 0;
    for (const cart of allCartsWithMenu) {
      if (cart._id !== CORRECT_CART_ID) {
        console.log(`Removing menu from cart ${cart._id}...`);
        const result = await cartsCollection.updateOne(
          { _id: cart._id },
          { $pull: { menus: MENU_ID } },
        );

        if (result.modifiedCount > 0) {
          console.log(
            `✓ Successfully removed menu from cart ${cart._id}`,
          );
          removedCount++;
        } else {
          console.log(
            `⚠ No documents were modified for cart ${cart._id}`,
          );
        }
      }
    }

    if (removedCount === 0 && allCartsWithMenu.length === 0) {
      console.log("✓ Menu is not in any cart, no action needed");
    } else if (removedCount === 0 && allCartsWithMenu.length > 0) {
      console.log("✓ Menu is only in the correct cart, no action needed");
    }

    // Verify final state
    console.log("\n=== Verifying final state ===");
    const correctCartAfter = await cartsCollection.findOne({
      _id: CORRECT_CART_ID,
    });
    const wrongCartAfter = await cartsCollection.findOne({
      _id: WRONG_CART_ID,
    });

    console.log(`Correct cart (${CORRECT_CART_ID}):`, {
      hasMenu: correctCartAfter?.menus?.includes(MENU_ID) ?? false,
      menuCount: correctCartAfter?.menus?.length ?? 0,
    });

    console.log(`Wrong cart (${WRONG_CART_ID}):`, {
      hasMenu: wrongCartAfter?.menus?.includes(MENU_ID) ?? false,
      menuCount: wrongCartAfter?.menus?.length ?? 0,
    });

    // Final check
    if (
      correctCartAfter?.menus?.includes(MENU_ID) &&
      !wrongCartAfter?.menus?.includes(MENU_ID)
    ) {
      console.log("\n✓ SUCCESS: Menu is now only in the correct cart");
    } else if (!correctCartAfter?.menus?.includes(MENU_ID)) {
      console.log("\n⚠ WARNING: Menu is not in the correct cart either!");
    } else if (wrongCartAfter?.menus?.includes(MENU_ID)) {
      console.log("\n⚠ WARNING: Menu is still in the wrong cart!");
    }
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
