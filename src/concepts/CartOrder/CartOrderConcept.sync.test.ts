import { assert, assertEquals } from "jsr:@std/assert";
import * as concepts from "@test-concepts";
import syncs from "@syncs";
import { ID } from "@utils/types.ts";

const {
  Engine,
  CartOrder,
  MenuCollection,
  CookBook,
  StoreCatalog,
  client,
} = concepts;

let syncsRegistered = false;
if (!syncsRegistered) {
  Engine.register(syncs);
  syncsRegistered = true;
}

Deno.test({
  name: "CartOrder syncs bump version for affected carts (past/current/future)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const user = "user-1" as ID;
    const getWeekStart = (d: Date) => {
      const x = new Date(d);
      x.setUTCHours(0, 0, 0, 0);
      x.setUTCDate(x.getUTCDate() - x.getUTCDay());
      return x;
    };
    const getWeekEnd = (weekStart: Date) => {
      const x = new Date(weekStart);
      x.setUTCHours(0, 0, 0, 0);
      x.setUTCDate(x.getUTCDate() + 6);
      return x;
    };

    const pastMenuDate = new Date();
    pastMenuDate.setUTCHours(0, 0, 0, 0);
    pastMenuDate.setUTCDate(pastMenuDate.getUTCDate() - 14);
    const futureMenuDate = new Date();
    futureMenuDate.setUTCHours(0, 0, 0, 0);
    futureMenuDate.setUTCDate(futureMenuDate.getUTCDate() + 14);

    try {
      let recipeId = "" as ID;
      let pastMenu = "" as ID;
      let futureMenu = "" as ID;
      let itemId = "" as ID;
      let purchaseOptionId = "" as ID;
      let pastCart = "" as ID;
      let futureCart = "" as ID;

      await t.step("1. setup store + recipe", async () => {
        // Seed auth user for Requesting-based MenuCollection syncs.
        await concepts.db.collection<{
          _id: ID;
          username: string;
          password: string;
          admin: boolean;
        }>("UserAuthentication.users").insertOne({
          _id: user,
          username: "user1",
          password: "x",
          admin: false,
        });

        itemId = (await StoreCatalog.createItem({
          primaryName: "Carrot",
        }) as { item: ID }).item;

        purchaseOptionId = (await StoreCatalog.addPurchaseOption({
          item: itemId,
          quantity: 1,
          units: "lb",
          price: 4,
          store: "Store A",
        }) as { purchaseOption: ID }).purchaseOption;

        recipeId = (await CookBook.createRecipe({
          name: "Carrot Soup",
          user,
        }) as { recipe: ID }).recipe;

        await CookBook.addRecipeIngredient({
          recipe: recipeId,
          name: "Carrot",
          quantity: 2,
          units: "lb",
        });
      });

      await t.step(
        "2. cartorder syncs are registered in sync map",
        async () => {
          const names = Object.keys(syncs);
          assert(
            names.some((name) =>
              name.startsWith("CartOrder.CartOrderConcept.")
            ),
          );
          assert(
            names.includes(
              "CartOrder.CartOrderConcept.BumpVersionOnMenuChangeRecipeScaling",
            ),
          );
        },
      );

      await t.step(
        "3. create two menus and attach them to two carts",
        async () => {
          const cartsCollection = concepts.db.collection<{
            _id: ID;
            startDate: Date;
            endDate: Date;
            menus: ID[];
            totalCost: number;
            menuCosts: Record<ID, number>;
            recipeCostsByMenu: Record<ID, Record<ID, number>>;
            aggregatedItems: unknown[];
            dataVersion: number;
            calculatedVersion: number;
          }>("CartOrder.carts");

          // Insert a historical cart directly (createCart disallows past weeks).
          pastCart = "cart-past" as ID;
          const pastWeekStart = getWeekStart(pastMenuDate);
          await cartsCollection.insertOne({
            _id: pastCart,
            startDate: pastWeekStart,
            endDate: getWeekEnd(pastWeekStart),
            menus: [],
            totalCost: 0,
            menuCosts: {},
            recipeCostsByMenu: {},
            aggregatedItems: [],
            dataVersion: 0,
            calculatedVersion: 0,
          });

          // Future cart via normal action.
          futureCart = (await CartOrder.createCart({
            dateInWeek: futureMenuDate,
          }) as { cart: ID }).cart;

          // Create menus; menu-create syncs will ensure/add menus into the right cart.
          pastMenu = (await MenuCollection.createMenu({
            name: "Menu Past",
            date: pastMenuDate,
            actingUser: user,
          }) as { menu: ID }).menu;

          futureMenu = (await MenuCollection.createMenu({
            name: "Menu Future",
            date: futureMenuDate,
            actingUser: user,
          }) as { menu: ID }).menu;

          // Ensure menus are attached to their carts (do not rely on menu-create syncs here).
          await CartOrder.addMenuToCart({
            menu: pastMenu,
            menuDate: pastMenuDate,
          });
          await CartOrder.addMenuToCart({
            menu: futureMenu,
            menuDate: futureMenuDate,
          });

          const menusInPastCart = await CartOrder._getMenusInCart({
            cart: pastCart,
          });
          const menusInFutureCart = await CartOrder._getMenusInCart({
            cart: futureCart,
          });
          assert(
            (menusInPastCart as { menus: ID[] }[])[0].menus.includes(pastMenu),
          );
          assert(
            (menusInFutureCart as { menus: ID[] }[])[0].menus.includes(futureMenu),
          );
        },
      );

      await t.step(
        "4. add recipe, recalculate baseline, and capture versions",
        async () => {
          await MenuCollection.addRecipe({
            menu: pastMenu,
            recipe: recipeId,
            scalingFactor: 1,
          });
          await MenuCollection.addRecipe({
            menu: futureMenu,
            recipe: recipeId,
            scalingFactor: 1,
          });

          await CartOrder.recalculateCart({ cart: pastCart });
          await CartOrder.recalculateCart({ cart: futureCart });

          const costsPast = await CartOrder._getCartCosts({ cart: pastCart });
          const costsFuture = await CartOrder._getCartCosts({ cart: futureCart });
          assertEquals((costsPast as { totalCost: number }[])[0].totalCost, 8);
          assertEquals((costsFuture as { totalCost: number }[])[0].totalCost, 8);
        },
      );

      await t.step(
        "5. scaling change + explicit invalidation, then bundle read recalculates",
        async () => {
          const cartsCollection = concepts.db.collection<{
            _id: ID;
            dataVersion: number;
            calculatedVersion: number;
          }>("CartOrder.carts");
          const beforePast = await cartsCollection.findOne({ _id: pastCart });
          const beforeFuture = await cartsCollection.findOne({ _id: futureCart });
          assert(beforePast && beforeFuture);
          assertEquals(beforePast.dataVersion, beforePast.calculatedVersion);
          assertEquals(beforeFuture.dataVersion, beforeFuture.calculatedVersion);

          // Change scaling in both menus.
          const changePast = await MenuCollection.changeRecipeScaling({
            menu: pastMenu,
            recipe: recipeId,
            newScalingFactor: 2,
          });
          assert("success" in changePast);

          const changeFuture = await MenuCollection.changeRecipeScaling({
            menu: futureMenu,
            recipe: recipeId,
            newScalingFactor: 2,
          });
          assert("success" in changeFuture);

          // Explicitly invalidate both carts to force recomputation on read.
          await CartOrder.bumpCartVersion({ cart: pastCart });
          await CartOrder.bumpCartVersion({ cart: futureCart });

          const pastWeekStart = getWeekStart(pastMenuDate);
          const futureWeekStart = getWeekStart(futureMenuDate);

          const pastBundle = await CartOrder._getCartDetailsBundle({
            weekStart: pastWeekStart,
          });
          const futureBundle = await CartOrder._getCartDetailsBundle({
            weekStart: futureWeekStart,
          });
          assert(Array.isArray(pastBundle));
          assert(Array.isArray(futureBundle));

          assertEquals((pastBundle[0] as { cart: { totalCost: number } }).cart.totalCost, 16);
          assertEquals((futureBundle[0] as { cart: { totalCost: number } }).cart.totalCost, 16);

          const afterPast = await cartsCollection.findOne({ _id: pastCart });
          const afterFuture = await cartsCollection.findOne({ _id: futureCart });
          assert(afterPast && afterFuture);
          assertEquals(afterPast.dataVersion, afterPast.calculatedVersion);
          assertEquals(afterFuture.dataVersion, afterFuture.calculatedVersion);
        },
      );
    } finally {
      await client.close();
    }
  },
});
