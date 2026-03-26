import { assert, assertEquals } from "jsr:@std/assert";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";
import CartOrderConcept from "./CartOrderConcept.ts";
import MenuCollectionConcept from "../MenuCollection/MenuCollectionConcept.ts";
import CookBookConcept from "../CookBook/CookBookConcept.ts";
import StoreCatalogConcept from "../StoreCatalog/StoreCatalogConcept.ts";

Deno.test({
  name: "CartOrderConcept - create/save/recalculate behavior",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const [db, client] = await testDb();
    const CartOrder = new CartOrderConcept(db);
    const MenuCollection = new MenuCollectionConcept(db);
    const CookBook = new CookBookConcept(db);
    const StoreCatalog = new StoreCatalogConcept(db);

    try {
      const user = "user-1" as ID;
      const futureDate = new Date(Date.UTC(2031, 0, 8));
      let cartId = "" as ID;
      let menuId = "" as ID;
      let recipeA = "" as ID;
      let recipeB = "" as ID;
      let carrotItem = "" as ID;
      let carrotOption1 = "" as ID;

    await t.step("1. createCart and get cart by date", async () => {
      const createCart = await CartOrder.createCart({ dateInWeek: futureDate });
      assert("cart" in createCart);
      cartId = (createCart as { cart: ID }).cart;

      const byDate = await CartOrder._getCartByDate({ date: futureDate });
      assert(Array.isArray(byDate));
      assertEquals((byDate as { cart: ID }[])[0].cart, cartId);

      const cartDoc = await db.collection<{
        dataVersion: number;
        calculatedVersion: number;
      }>("CartOrder.carts").findOne({ _id: cartId });
      assert(cartDoc);
      assertEquals(cartDoc.dataVersion, 0);
      assertEquals(cartDoc.calculatedVersion, 0);
    });

    await t.step("2. saveCalculation persists all cost fields", async () => {
      const save = await CartOrder.saveCalculation({
        cart: cartId,
        totalCost: 42,
        menuCosts: { ["menu:test" as ID]: 42 },
        recipeCostsByMenu: {
          ["menu:test" as ID]: { ["recipe:test" as ID]: 42 },
        },
        aggregatedItems: [{
          itemId: "item:test" as ID,
          name: "Test",
          totalRequiredQuantity: 1,
          baseUnits: "lb",
          purchaseOption: {
            purchaseOptionId: "po:test" as ID,
            store: "Store A",
            quantityToBuy: 1,
            cost: 42,
            confirmed: false,
          },
          apportionedCost: 42,
        }],
      });
      assert("cart" in save);

      const costs = await CartOrder._getCartCosts({ cart: cartId });
      assert(Array.isArray(costs));
      assertEquals((costs as { totalCost: number }[])[0].totalCost, 42);

      const cartDoc = await db.collection<{
        dataVersion: number;
        calculatedVersion: number;
      }>("CartOrder.carts").findOne({ _id: cartId });
      assert(cartDoc);
      assertEquals(cartDoc.calculatedVersion, cartDoc.dataVersion);
    });

    await t.step(
      "3. recalculateCart chooses optimal option and prorates recipe costs",
      async () => {
        const createCarrot = await StoreCatalog.createItem({
          primaryName: "Carrot",
        });
        carrotItem = (createCarrot as { item: ID }).item;

        const addOption1 = await StoreCatalog.addPurchaseOption({
          item: carrotItem,
          quantity: 1,
          units: "lb",
          price: 4,
          store: "Store A",
        });
        carrotOption1 = (addOption1 as { purchaseOption: ID }).purchaseOption;

        await StoreCatalog.addPurchaseOption({
          item: carrotItem,
          quantity: 0.5,
          units: "lb",
          price: 3,
          store: "Store B",
        });

        recipeA = (await CookBook.createRecipe({
          name: "Soup A",
          user,
        }) as { recipe: ID }).recipe;
        recipeB = (await CookBook.createRecipe({
          name: "Soup B",
          user,
        }) as { recipe: ID }).recipe;

        await CookBook.addRecipeIngredient({
          recipe: recipeA,
          name: "Carrot",
          quantity: 1,
          units: "lb",
        });
        await CookBook.addRecipeIngredient({
          recipe: recipeB,
          name: "Carrot",
          quantity: 2,
          units: "lb",
        });

        menuId = (await MenuCollection.createMenu({
          name: "Menu One",
          date: futureDate,
          actingUser: user,
        }) as { menu: ID }).menu;

        await MenuCollection.addRecipe({
          menu: menuId,
          recipe: recipeA,
          scalingFactor: 1,
        });
        await MenuCollection.addRecipe({
          menu: menuId,
          recipe: recipeB,
          scalingFactor: 1,
        });

        await CartOrder.addMenuToCart({ menu: menuId, menuDate: futureDate });
        const recalc = await CartOrder.recalculateCart({ cart: cartId });
        assertEquals((recalc as { success: true }).success, true);

        const costs = await CartOrder._getCartCosts({ cart: cartId });
        assert(Array.isArray(costs));
        const first = (costs as Array<{
          totalCost: number;
          menuCosts: Record<ID, number>;
          recipeCostsByMenu: Record<ID, Record<ID, number>>;
        }>)[0];

        // Total carrot demand is 3 lb:
        // - Option A: ceil(3/1) * 4 = 12
        // - Option B: ceil(3/0.5) * 3 = 18
        assertEquals(first.totalCost, 12);
        assertEquals(first.menuCosts[menuId], 12);
        assertEquals(first.recipeCostsByMenu[menuId][recipeA], 4);
        assertEquals(first.recipeCostsByMenu[menuId][recipeB], 8);

        const cartDoc = await db.collection<{
          aggregatedItems: Array<{
            itemId: ID;
            baseUnits: string;
            totalRequiredQuantity: number;
            purchaseOption: { purchaseOptionId: ID; confirmed: boolean };
          }>;
        }>("CartOrder.carts").findOne({ _id: cartId });
        assert(cartDoc);
        assertEquals(cartDoc.aggregatedItems.length, 1);
        assertEquals(cartDoc.aggregatedItems[0].itemId, carrotItem);
        assertEquals(cartDoc.aggregatedItems[0].baseUnits, "lb");
        assertEquals(cartDoc.aggregatedItems[0].totalRequiredQuantity, 3);
        assertEquals(
          cartDoc.aggregatedItems[0].purchaseOption.purchaseOptionId,
          carrotOption1,
        );
        assertEquals(
          cartDoc.aggregatedItems[0].purchaseOption.confirmed,
          false,
        );
      },
    );
    } finally {
      await client.close();
    }
  },
});

Deno.test("CartOrderConcept - _getCartDetailsBundle query", async (t) => {
  const [db, client] = await testDb();
  const CartOrder = new CartOrderConcept(db);
  const MenuCollection = new MenuCollectionConcept(db);
  const CookBook = new CookBookConcept(db);
  const StoreCatalog = new StoreCatalogConcept(db);
  // Note: we directly seed `UserAuthentication.users` for ownerName hydration tests.

  try {
    const user = "user-2" as ID;
    const missingUser = "user-missing" as ID;
    await db.collection<{ _id: ID; username: string; password: string; admin: boolean }>(
      "UserAuthentication.users",
    ).insertOne({
      _id: user,
      username: "user2",
      password: "x",
      admin: false,
    });
    const menuDate = new Date(Date.UTC(2032, 4, 12));
    const menuDateTwo = new Date(Date.UTC(2032, 4, 13));
    const weekStartDate = new Date(menuDate);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - weekStartDate.getUTCDay());
    const weekStartWithTime = new Date(weekStartDate);
    weekStartWithTime.setUTCHours(9, 30, 0, 0);

    let purchaseOptionId = "" as ID;
    const itemId = (await StoreCatalog.createItem({
      primaryName: "Tomato",
    }) as { item: ID }).item;
    purchaseOptionId = (await StoreCatalog.addPurchaseOption({
      item: itemId,
      quantity: 1,
      units: "lb",
      price: 6,
      store: "Market A",
    }) as { purchaseOption: ID }).purchaseOption;

    const recipeId = (await CookBook.createRecipe({
      name: "Tomato Soup",
      user,
    }) as { recipe: ID }).recipe;
    await CookBook.addRecipeIngredient({
      recipe: recipeId,
      name: "Tomato",
      quantity: 2,
      units: "lb",
    });

    const menuId = (await MenuCollection.createMenu({
      name: "Soup Night",
      date: menuDate,
      actingUser: user,
    }) as { menu: ID }).menu;
    const menuIdTwo = (await MenuCollection.createMenu({
      name: "Soup Night 2",
      date: menuDateTwo,
      actingUser: missingUser,
    }) as { menu: ID }).menu;
    await MenuCollection.addRecipe({
      menu: menuId,
      recipe: recipeId,
      scalingFactor: 1.5,
    });
    await MenuCollection.addRecipe({
      menu: menuIdTwo,
      recipe: recipeId,
      scalingFactor: 1,
    });

    const cartId = (await CartOrder.createCart({
      dateInWeek: menuDate,
    }) as { cart: ID }).cart;
    await CartOrder.addMenuToCart({ menu: menuId, menuDate: menuDate });
    await CartOrder.addMenuToCart({ menu: menuIdTwo, menuDate: menuDateTwo });
    await CartOrder.recalculateCart({ cart: cartId });

    await t.step("1. returns hydrated bundle", async () => {
      const result = await CartOrder._getCartDetailsBundle({
        weekStart: weekStartDate,
      });
      assert(Array.isArray(result));

      const bundle = result[0] as {
        cart: {
          id: ID;
          startDate: string;
          endDate: string;
          totalCost: number;
          dataVersion: number;
          calculatedVersion: number;
        };
        menus: Array<{
          id: ID;
          name: string;
          ownerId: ID;
          ownerName: string;
          cost: number;
          recipes: Array<{
            id: ID;
            name: string;
            scalingFactor: number;
            ingredients: Array<{ name: string; quantity: number; units: string }>;
          }>;
          aggregatedItems: Array<{
            itemId: ID;
            purchaseOption: {
              store: string;
              quantityToBuy: number;
              cost: number;
              confirmed: boolean;
            };
          }>;
        }>;
        aggregatedItems: Array<{
          itemId: ID;
          purchaseOption: {
            store: string;
            quantityToBuy: number;
            cost: number;
            confirmed: boolean;
          };
        }>;
      };

      assertEquals(bundle.cart.id, cartId);
      assertEquals(bundle.cart.dataVersion, bundle.cart.calculatedVersion);
      assertEquals(bundle.menus.length, 2);
      const menuOne = bundle.menus.find((m) => m.id === menuId)!;
      const menuTwo = bundle.menus.find((m) => m.id === menuIdTwo)!;
      assertEquals(menuOne.name, "Soup Night");
      assertEquals(menuOne.ownerId, user);
      assertEquals(menuOne.ownerName, "user2");
      assertEquals(menuTwo.name, "Soup Night 2");
      assertEquals(menuTwo.ownerId, missingUser);
      assertEquals(menuTwo.ownerName, "USER_NOT_FOUND");
      assertEquals(bundle.menus[0].recipes.length, 1);
      assertEquals(bundle.menus[0].recipes[0].id, recipeId);
      assertEquals(bundle.menus[0].recipes[0].name, "Tomato Soup");
      assertEquals(bundle.menus[0].recipes[0].scalingFactor, 1.5);
      assertEquals(bundle.menus[0].recipes[0].ingredients[0].name, "Tomato");
      assertEquals(bundle.menus[0].recipes[0].ingredients[0].quantity, 3);
      assertEquals(bundle.menus[0].recipes[0].ingredients[0].units, "lb");

      assertEquals(bundle.aggregatedItems.length, 1);
      assertEquals(bundle.aggregatedItems[0].itemId, itemId);
      assertEquals(
        bundle.aggregatedItems[0].purchaseOption.store,
        "Market A",
      );
      assert(
        !("purchaseOptionId" in bundle.aggregatedItems[0].purchaseOption),
      );
      assertEquals(bundle.aggregatedItems[0].purchaseOption.confirmed, false);
      assertEquals(bundle.menus[0].aggregatedItems.length, 1);
      assertEquals(bundle.menus[0].aggregatedItems[0].itemId, itemId);
      assertEquals(bundle.menus[0].aggregatedItems[0].purchaseOption.store, "Market A");
      assertEquals(
        bundle.menus[0].aggregatedItems[0].purchaseOption.confirmed,
        false,
      );
    });

    await t.step(
      "1b. confirmPurchaseOption flips confirmed flag",
      async () => {
        const confirmRes = await StoreCatalog.confirmPurchaseOption({
          purchaseOption: purchaseOptionId,
        });
        assert("success" in confirmRes);
        await CartOrder.recalculateCart({ cart: cartId });
        const fresh = await CartOrder._getCartDetailsBundle({
          weekStart: weekStartDate,
        });
        assert(Array.isArray(fresh));
        const freshBundle = fresh[0] as unknown as {
          aggregatedItems: Array<{
            purchaseOption: { confirmed: boolean };
          }>;
          menus: Array<{
            aggregatedItems: Array<{
              purchaseOption: { confirmed: boolean };
            }>;
          }>;
        };
        assertEquals(
          freshBundle.aggregatedItems[0].purchaseOption.confirmed,
          true,
        );
        assertEquals(
          freshBundle.menus[0].aggregatedItems[0].purchaseOption.confirmed,
          true,
        );
      },
    );

    await t.step(
      "1c. _getCartCosts recalculates inline when stale",
      async () => {
        const cartsCollection = db.collection<{
          _id: ID;
          dataVersion: number;
          calculatedVersion: number;
        }>("CartOrder.carts");

        const before = await cartsCollection.findOne({ _id: cartId });
        assert(before);
        assertEquals(before.dataVersion, before.calculatedVersion);

        await CartOrder.bumpCartVersion({ cart: cartId });

        const updatePrice = await StoreCatalog.updatePurchaseOption({
          purchaseOption: purchaseOptionId,
          price: 10,
        });
        assert("success" in updatePrice);

        const costs = await CartOrder._getCartCosts({ cart: cartId });
        assert(Array.isArray(costs));
        assertEquals((costs as { totalCost: number }[])[0].totalCost, 50);

        const after = await cartsCollection.findOne({ _id: cartId });
        assert(after);
        assertEquals(after.dataVersion, after.calculatedVersion);
      },
    );

    await t.step("2. normalizes weekStart time", async () => {
      const result = await CartOrder._getCartDetailsBundle({
        weekStart: weekStartWithTime,
      });
      assert(Array.isArray(result));
      assertEquals((result[0] as { cart: { id: ID } }).cart.id, cartId);
    });

    await t.step("3. stale bundle request recalculates inline", async () => {
      const bump = await CartOrder.bumpCartVersion({ cart: cartId });
      assert("cart" in bump);

      const staleBefore = await db.collection<{
        dataVersion: number;
        calculatedVersion: number;
      }>("CartOrder.carts").findOne({ _id: cartId });
      assert(staleBefore);
      assert(staleBefore.dataVersion > staleBefore.calculatedVersion);

      const result = await CartOrder._getCartDetailsBundle({
        weekStart: weekStartDate,
      });
      assert(Array.isArray(result));
      assertEquals(
        (result[0] as {
          cart: { dataVersion: number; calculatedVersion: number };
        }).cart.dataVersion,
        (result[0] as {
          cart: { dataVersion: number; calculatedVersion: number };
        }).cart.calculatedVersion,
      );
    });

    await t.step("4. returns error when no cart for weekStart", async () => {
      const missing = await CartOrder._getCartDetailsBundle({
        weekStart: new Date(Date.UTC(2040, 0, 6)),
      });
      assert("error" in missing);
    });
  } finally {
    await client.close();
  }
});
