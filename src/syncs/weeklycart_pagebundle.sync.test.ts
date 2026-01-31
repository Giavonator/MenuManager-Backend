import { assert, assertEquals } from "jsr:@std/assert";
import * as concepts from "@test-concepts";
import syncs from "@syncs";
import { ID } from "@utils/types.ts";

const {
  Engine,
  Requesting,
  WeeklyCart,
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

Deno.test("WeeklyCart page bundle sync returns full payload", async (t) => {
  const futureDate = new Date(Date.UTC(2030, 0, 8));
  const actingUser = "user-1" as ID;

  let cartId: ID;
  let weekStart: string;

  await t.step("1. Setup catalog, recipe, menu, and cart", async () => {
    const createFlour = await StoreCatalog.createItem({ primaryName: "Flour" });
    const flourItem = (createFlour as { item: ID }).item;
    await StoreCatalog.addPurchaseOption({
      item: flourItem as ID,
      quantity: 5,
      units: "lb",
      price: 8.99,
      store: "Whole Foods",
    });

    await StoreCatalog.createItem({ primaryName: "Salt" });

    const createRecipe = await CookBook.createRecipe({
      name: "Bread",
      user: actingUser,
    });
    const recipeId = (createRecipe as { recipe: ID }).recipe;
    await CookBook.addRecipeIngredient({
      recipe: recipeId as ID,
      name: "Flour",
      quantity: 2,
      units: "cup",
    });
    await CookBook.addRecipeIngredient({
      recipe: recipeId as ID,
      name: "Salt",
      quantity: 1,
      units: "tsp",
    });

    const createMenu = await MenuCollection.createMenu({
      name: "Weekly Menu",
      date: futureDate,
      actingUser,
    });
    const menuId = (createMenu as { menu: ID }).menu;
    await MenuCollection.addRecipe({
      menu: menuId as ID,
      recipe: recipeId as ID,
      scalingFactor: 2,
    });

    const createCart = await WeeklyCart.createCart({
      dateInWeek: futureDate,
    });
    cartId = (createCart as { cart: ID }).cart;
    await WeeklyCart.addMenuToCart({
      menu: menuId as ID,
      menuDate: futureDate,
    });

    const cartDates = await WeeklyCart._getCartDates({ cart: cartId as ID });
    weekStart = (cartDates as { startDate: Date }[])[0]
      .startDate
      .toISOString()
      .split("T")[0];
  });

  await t.step("2. Request bundle and validate payload", async () => {
    const { request } = await Requesting.request({
      path: "/WeeklyCart/_getWeeklyCartPageBundle",
      cartId,
      weekStart,
    });

    const [{ response }] = await Requesting._awaitResponse({ request });
    const bundle = response as Record<string, unknown>;

    assert(bundle.cart);
    assertEquals((bundle.cart as { id: string }).id, cartId);
    assertEquals((bundle.week as { start: string }).start, weekStart);

    const menus = bundle.menus as Array<{
      menuId: string;
      menuName: string | null;
      ownerId: string | null;
      ownerName: string | null;
      recipes: Array<{ recipeId: string; name: string }>;
    }>;
    assertEquals(menus.length, 1);
    assertEquals(menus[0].recipes.length, 1);
    assertEquals(menus[0].menuName, "Weekly Menu");
    assertEquals(menus[0].ownerId, actingUser);
    assert(menus[0].ownerName === null || typeof menus[0].ownerName === "string");
    assert(menus[0].recipes[0].name);

    const aggregated = bundle.aggregatedIngredients as Array<{
      name: string;
      totalQuantity: number;
      catalogItem:
        | { purchaseOptions: Array<{ atomicOrderId: string | null }> }
        | null;
    }>;
    const flourAgg = aggregated.find((ing) => ing.name === "Flour");
    assert(flourAgg);
    assertEquals(flourAgg.totalQuantity, 4);
    assert(flourAgg.catalogItem);
    assertEquals(flourAgg.catalogItem.purchaseOptions.length, 1);
    assert(flourAgg.catalogItem.purchaseOptions[0].atomicOrderId);

    assertEquals(bundle.status, undefined);
  });

  await t.step("3. Request bundle with mismatched weekStart", async () => {
    const { request } = await Requesting.request({
      path: "/WeeklyCart/_getWeeklyCartPageBundle",
      cartId,
      weekStart: "2030-01-13",
    });

    const [{ response }] = await Requesting._awaitResponse({ request });
    const bundle = response as Record<string, unknown>;
    assertEquals(bundle.cart, null);
    assertEquals(bundle.week, null);
    assertEquals((bundle.menus as unknown[]).length, 0);
    assertEquals((bundle.aggregatedIngredients as unknown[]).length, 0);
    const optimalPurchase = bundle.optimalPurchase as { atomicOrders: unknown[] };
    assertEquals(optimalPurchase.atomicOrders.length, 0);
  });

  await client.close();
});
