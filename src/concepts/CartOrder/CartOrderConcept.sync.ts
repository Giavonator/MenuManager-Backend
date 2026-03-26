import { actions, Frames, Sync } from "@engine";
import { CartOrder, CookBook, db, MenuCollection, StoreCatalog } from "@concepts";
import { ID } from "@utils/types.ts";

const menuCollection = db.collection<{
  _id: ID;
  menuRecipes: Record<ID, number>;
}>("MenuCollection.menus");
const recipeCollection = db.collection<{
  _id: ID;
  ingredients: Array<{ name: string }>;
}>("CookBook.recipes");
const itemCollection = db.collection<{ _id: ID; name: string }>(
  "StoreCatalog.items",
);
const purchaseOptionCollection = db.collection<{ _id: ID; itemId: ID }>(
  "StoreCatalog.purchaseOptions",
);
const cartCollection = db.collection<{
  _id: ID;
  menus: ID[];
  startDate: Date;
}>("CartOrder.carts");

async function getCartIdsByRecipeIds(recipeIds: ID[]): Promise<ID[]> {
  if (recipeIds.length === 0) return [];
  const menus = await menuCollection.find({
    $or: recipeIds.map((recipe) => ({ [`menuRecipes.${recipe}`]: { $exists: true } })),
  }).toArray();
  const menuIds = menus.map((m) => m._id);
  if (menuIds.length === 0) return [];
  const carts = await cartCollection.find({ menus: { $in: menuIds } }).toArray();
  return [...new Set(carts.map((c) => c._id))];
}

async function getCartIdsByItemName(itemName: string): Promise<ID[]> {
  if (!itemName) return [];
  const recipes = await recipeCollection.find({
    "ingredients.name": itemName,
  }).toArray();
  const recipeIds = recipes.map((r) => r._id);
  return await getCartIdsByRecipeIds(recipeIds);
}

export const EnsureCartExistsOnMenuCreate: Sync = ({ menu, date, cart }) => ({
  when: actions([MenuCollection.createMenu, {}, { menu }]),
  where: async (frames) => {
    const results = new Frames();
    for (const frame of frames) {
      const detailFrames = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: ID },
        ) => Promise<Array<{ date: Date }>>,
        { menu },
        { date },
      ) as Promise<Frames>);
      for (const dFrame of detailFrames) {
        const record = dFrame as Record<symbol, unknown>;
        const dateValue = record[date];
        if (!(dateValue instanceof Date)) continue;
        const cartFrames = await (new Frames(dFrame).query(
          CartOrder._getCartByDate as unknown as (
            input: { date: Date },
          ) => Promise<Array<{ cart: ID }>>,
          { date: dateValue },
          { cart },
        ) as Promise<Frames>);
        if (cartFrames.length === 0) results.push(dFrame);
      }
    }
    return results;
  },
  then: actions([CartOrder.createCart, { dateInWeek: date }]),
});

export const AddMenuToCartOnMenuCreateExistingCart: Sync = ({
  menu,
  date,
  cart,
}) => ({
  when: actions([MenuCollection.createMenu, {}, { menu }]),
  where: async (frames) => {
    const results = new Frames();
    for (const frame of frames) {
      const details = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: ID },
        ) => Promise<Array<{ date: Date }>>,
        { menu },
        { date },
      ) as Promise<Frames>);
      for (const dFrame of details) {
        const record = dFrame as Record<symbol, unknown>;
        const dateValue = record[date];
        if (!(dateValue instanceof Date)) continue;
        const cartFrames = await (new Frames(dFrame).query(
          CartOrder._getCartByDate as unknown as (
            input: { date: Date },
          ) => Promise<Array<{ cart: ID }>>,
          { date: dateValue },
          { cart },
        ) as Promise<Frames>);
        if (cartFrames.length > 0) {
          results.push(dFrame);
        }
      }
    }
    return results;
  },
  then: actions([CartOrder.addMenuToCart, { menu, menuDate: date }]),
});

export const AddMenuToCartAfterCartCreate: Sync = ({ menu, date }) => ({
  when: actions(
    [CartOrder.createCart, {}, {}],
    [MenuCollection.createMenu, {}, { menu }],
  ),
  where: async (frames) => {
    const results = new Frames();
    for (const frame of frames) {
      const details = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: ID },
        ) => Promise<Array<{ date: Date }>>,
        { menu },
        { date },
      ) as Promise<Frames>);
      for (const dFrame of details) {
        const record = dFrame as Record<symbol, unknown>;
        if (record[date] instanceof Date) results.push(dFrame);
      }
    }
    return results;
  },
  then: actions([CartOrder.addMenuToCart, { menu, menuDate: date }]),
});

export const EnsureCartExistsOnMenuDateChange: Sync = ({ date, cart }) => ({
  when: actions([MenuCollection.updateMenu, { date }, {}]),
  where: async (frames) => {
    const results = new Frames();
    for (const frame of frames) {
      const record = frame as Record<symbol, unknown>;
      const newDate = record[date];
      if (!(newDate instanceof Date)) continue;
      const cartFrames = await (new Frames(frame).query(
        CartOrder._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: ID }>>,
        { date: newDate },
        { cart },
      ) as Promise<Frames>);
      if (cartFrames.length === 0) {
        results.push(frame);
      }
    }
    return results;
  },
  then: actions([CartOrder.createCart, { dateInWeek: date }]),
});

export const MoveMenuOnMenuDateChange: Sync = ({ menu, date }) => ({
  when: actions([MenuCollection.updateMenu, { menu, date }, {}]),
  where: (frames) => {
    return frames.filter((frame) => {
      const record = frame as Record<symbol, unknown>;
      return record[menu] && record[date] instanceof Date;
    });
  },
  then: actions(
    [CartOrder.removeMenuFromCart, { menu }],
    [CartOrder.addMenuToCart, { menu, menuDate: date }],
  ),
});

export const RemoveMenuOnMenuDelete: Sync = ({ menu }) => ({
  when: actions([MenuCollection.deleteMenu, { menu }, {}]),
  then: actions([CartOrder.removeMenuFromCart, { menu }]),
});

export const BumpVersionOnAddMenuToCart: Sync = ({ cart }) => ({
  when: actions([CartOrder.addMenuToCart, {}, { cart }]),
  where: (frames) =>
    frames.filter((frame) => {
      const record = frame as Record<symbol, unknown>;
      return typeof record[cart] === "string";
    }),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

export const BumpVersionOnRemoveMenuFromCart: Sync = ({ cart }) => ({
  when: actions([CartOrder.removeMenuFromCart, {}, { cart }]),
  where: (frames) =>
    frames.filter((frame) => {
      const record = frame as Record<symbol, unknown>;
      return typeof record[cart] === "string";
    }),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

async function expandMenuToCarts(
  frames: Frames,
  menu: symbol,
  cart: symbol,
): Promise<Frames> {
  const results = new Frames();
  for (const frame of frames) {
    const record = frame as Record<symbol, unknown>;
    const menuId = record[menu];
    if (typeof menuId !== "string") continue;
    const carts = await cartCollection.find(
      { menus: menuId as ID },
      { projection: { _id: 1 } },
    ).toArray();
    for (const c of carts) {
      results.push({ ...frame, [cart]: c._id });
    }
  }
  return results;
}

export const BumpVersionOnMenuAddRecipe: Sync = ({ menu, recipe, scalingFactor, cart }) => ({
  // Match loosely; MenuCollection actions may include additional fields.
  when: actions([MenuCollection.addRecipe, { menu }, {}]),
  where: async (frames) => await expandMenuToCarts(frames, menu, cart),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

export const BumpVersionOnMenuRemoveRecipe: Sync = ({ menu, recipe, cart }) => ({
  when: actions([MenuCollection.removeRecipe, { menu }, {}]),
  where: async (frames) => await expandMenuToCarts(frames, menu, cart),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

export const BumpVersionOnMenuChangeRecipeScaling: Sync = ({ menu, recipe, newScalingFactor, cart }) => ({
  when: actions([MenuCollection.changeRecipeScaling, { menu }, {}]),
  where: async (frames) => await expandMenuToCarts(frames, menu, cart),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

// Keep this broad (menu-only) since updateMenu has multiple shapes.
export const BumpVersionOnMenuUpdate: Sync = ({ menu, cart }) => ({
  when: actions([MenuCollection.updateMenu, { menu }, {}]),
  where: async (frames) => await expandMenuToCarts(frames, menu, cart),
  then: actions([CartOrder.bumpCartVersion, { cart }]),
});

const bumpVersionForRecipeAction = (action: unknown): Sync =>
  ({ recipe, cart }) => ({
    when: actions([action as never, { recipe }, {}]),
    where: async (frames) => {
      const results = new Frames();
      for (const frame of frames) {
        const record = frame as Record<symbol, unknown>;
        const recipeId = record[recipe];
        if (typeof recipeId !== "string") continue;
        const cartIds = await getCartIdsByRecipeIds([recipeId as ID]);
        for (const cartId of cartIds) {
          results.push({ ...frame, [cart]: cartId });
        }
      }
      return results;
    },
    then: actions([CartOrder.bumpCartVersion, { cart }]),
  });

export const BumpVersionOnCookBookAddIngredient = bumpVersionForRecipeAction(
  CookBook.addRecipeIngredient,
);
export const BumpVersionOnCookBookUpdateIngredient = bumpVersionForRecipeAction(
  CookBook.updateRecipeIngredient,
);
export const BumpVersionOnCookBookRemoveIngredient = bumpVersionForRecipeAction(
  CookBook.removeRecipeIngredient,
);
export const BumpVersionOnCookBookUpdateRecipe = bumpVersionForRecipeAction(
  CookBook.updateRecipe,
);

const bumpVersionForItemAction = (action: unknown): Sync =>
  ({ item, cart }) => ({
    when: actions([action as never, { item }, {}]),
    where: async (frames) => {
      const results = new Frames();
      for (const frame of frames) {
        const record = frame as Record<symbol, unknown>;
        const itemId = record[item];
        if (typeof itemId !== "string") continue;
        const itemDoc = await itemCollection.findOne({ _id: itemId as ID });
        if (!itemDoc) continue;
        const cartIds = await getCartIdsByItemName(itemDoc.name);
        for (const cartId of cartIds) {
          results.push({ ...frame, [cart]: cartId });
        }
      }
      return results;
    },
    then: actions([CartOrder.bumpCartVersion, { cart }]),
  });

export const BumpVersionOnStoreCatalogCreateItem = bumpVersionForItemAction(
  StoreCatalog.createItem,
);
export const BumpVersionOnStoreCatalogDeleteItem = bumpVersionForItemAction(
  StoreCatalog.deleteItem,
);
export const BumpVersionOnStoreCatalogUpdateItemName = bumpVersionForItemAction(
  StoreCatalog.updateItemName,
);

const bumpVersionForPurchaseOptionAction = (action: unknown): Sync =>
  ({ purchaseOption, cart }) => ({
    when: actions([action as never, { purchaseOption }, {}]),
    where: async (frames) => {
      const results = new Frames();
      for (const frame of frames) {
        const record = frame as Record<symbol, unknown>;
        const poId = record[purchaseOption];
        if (typeof poId !== "string") continue;
        const poDoc = await purchaseOptionCollection.findOne({ _id: poId as ID });
        if (!poDoc) continue;
        const itemDoc = await itemCollection.findOne({ _id: poDoc.itemId });
        if (!itemDoc) continue;
        const cartIds = await getCartIdsByItemName(itemDoc.name);
        for (const cartId of cartIds) {
          results.push({ ...frame, [cart]: cartId });
        }
      }
      return results;
    },
    then: actions([CartOrder.bumpCartVersion, { cart }]),
  });

export const BumpVersionOnStoreCatalogAddPurchaseOption =
  bumpVersionForPurchaseOptionAction(StoreCatalog.addPurchaseOption);
export const BumpVersionOnStoreCatalogUpdatePurchaseOption =
  bumpVersionForPurchaseOptionAction(StoreCatalog.updatePurchaseOption);
export const BumpVersionOnStoreCatalogConfirmPurchaseOption =
  bumpVersionForPurchaseOptionAction(StoreCatalog.confirmPurchaseOption);
export const BumpVersionOnStoreCatalogRemovePurchaseOption =
  bumpVersionForPurchaseOptionAction(StoreCatalog.removePurchaseOption);
