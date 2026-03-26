import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { convertWithinCategory } from "@utils/instacart_units.ts";
import { ID, Result } from "@utils/types.ts";

const PREFIX = "CartOrder" + ".";

type Menu = ID;
type Recipe = ID;
type Cart = ID;
type Item = ID;
type PurchaseOption = ID;

interface CartPurchaseOptionUsed {
  purchaseOptionId: PurchaseOption;
  store: string;
  quantityToBuy: number;
  cost: number;
  confirmed: boolean;
}

export interface CartItemSnapshot {
  itemId: Item;
  name: string;
  totalRequiredQuantity: number;
  baseUnits: string;
  purchaseOption: CartPurchaseOptionUsed;
  apportionedCost: number;
}

interface CartOrderDoc {
  _id: Cart;
  startDate: Date;
  endDate: Date;
  menus: Menu[];
  totalCost: number;
  menuCosts: Record<Menu, number>;
  recipeCostsByMenu: Record<Menu, Record<Recipe, number>>;
  aggregatedItems: CartItemSnapshot[];
  dataVersion: number;
  calculatedVersion: number;
}

interface MenuDoc {
  _id: ID;
  name: string;
  date: Date;
  owner: ID;
  menuRecipes: Record<ID, number>;
}

interface UserDoc {
  _id: ID;
  username: string;
}

interface RecipeDoc {
  _id: ID;
  name: string;
  ingredients: Array<{ name: string; quantity: number; units: string }>;
}

interface ItemDoc {
  _id: ID;
  name: string;
}

interface PurchaseOptionDoc {
  _id: ID;
  itemId: ID;
  store: string;
  quantity: number;
  units: string;
  price: number;
  confirmed: boolean;
}

type CreateCartInput = { dateInWeek: Date };
type CreateCartOutput = Result<{ cart: Cart }>;

type DeleteCartInput = { dateInWeek: Date };
type DeleteCartOutput = Result<{ cart: Cart }>;

type AddMenuToCartInput = { menu: Menu; menuDate: Date };
type AddMenuToCartOutput = Result<{ cart: Cart }>;

type RemoveMenuFromCartInput = { menu: Menu };
type RemoveMenuFromCartOutput = Result<{ cart: Cart }>;

type BumpCartVersionInput = { cart: Cart };
type BumpCartVersionOutput = Result<{ cart: Cart; dataVersion: number }>;

type SaveCalculationInput = {
  cart: Cart;
  totalCost: number;
  menuCosts: Record<Menu, number>;
  recipeCostsByMenu: Record<Menu, Record<Recipe, number>>;
  aggregatedItems: CartItemSnapshot[];
};
type SaveCalculationOutput = Result<{ cart: Cart }>;

type RecalculateCartInput = { cart: Cart };
type RecalculateCartOutput = Result<{ cart: Cart; success: true }>;

type GetCartDatesInput = { cart: Cart };
type GetCartDatesOutput = Result<{ startDate: Date; endDate: Date }[]>;

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: Date };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;

type GetCartWithMenuInput = { menu: Menu };
type GetCartWithMenuOutput = Result<{ cart: Cart }[]>;

type GetCartCostsInput = { cart: Cart };
type GetCartCostsOutput = Result<
  {
    totalCost: number;
    menuCosts: Record<Menu, number>;
    recipeCostsByMenu: Record<Menu, Record<Recipe, number>>;
  }[]
>;

type GetCartDetailsBundleInput = { weekStart: Date };
type GetCartDetailsBundleOutput = Result<
  {
    cart: {
      id: Cart;
      startDate: string;
      endDate: string;
      totalCost: number;
      dataVersion: number;
      calculatedVersion: number;
    };
    menus: Array<{
      id: Menu;
      date: string;
      name: string;
      ownerId: ID;
      ownerName: string;
      cost: number;
      recipes: Array<{
        id: Recipe;
        name: string;
        scalingFactor: number;
        cost: number;
        ingredients: Array<{ name: string; quantity: number; units: string }>;
      }>;
      aggregatedItems: Array<{
        itemId: Item;
        name: string;
        totalRequiredQuantity: number;
        baseUnits: string;
        purchaseOption: {
          store: string;
          quantityToBuy: number;
          cost: number;
          confirmed: boolean;
        };
        apportionedCost: number;
      }>;
    }>;
    aggregatedItems: Array<{
      itemId: Item;
      name: string;
      totalRequiredQuantity: number;
      baseUnits: string;
      purchaseOption: {
        store: string;
        quantityToBuy: number;
        cost: number;
        confirmed: boolean;
      };
      apportionedCost: number;
    }>;
  }[]
>;

const getSundayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const diff = d.getUTCDate() - d.getUTCDay();
  d.setUTCDate(diff);
  return d;
};

const getSaturdayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const diff = d.getUTCDate() + (6 - d.getUTCDay());
  d.setUTCDate(diff);
  return d;
};

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export default class CartOrderConcept {
  private carts: Collection<CartOrderDoc>;
  private menus: Collection<MenuDoc>;
  private recipes: Collection<RecipeDoc>;
  private items: Collection<ItemDoc>;
  private purchaseOptions: Collection<PurchaseOptionDoc>;
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection<CartOrderDoc>(PREFIX + "carts");
    this.menus = this.db.collection<MenuDoc>("MenuCollection.menus");
    this.recipes = this.db.collection<RecipeDoc>("CookBook.recipes");
    this.items = this.db.collection<ItemDoc>("StoreCatalog.items");
    this.purchaseOptions = this.db.collection<PurchaseOptionDoc>(
      "StoreCatalog.purchaseOptions",
    );
    this.users = this.db.collection<UserDoc>("UserAuthentication.users");
  }

  private async ensureFreshCart(
    cartId: Cart,
  ): Promise<CartOrderDoc | null> {
    let cartDoc = await this.carts.findOne({ _id: cartId });
    if (!cartDoc) return null;

    if (cartDoc.dataVersion !== cartDoc.calculatedVersion) {
      const recalc = await this.recalculateCart({ cart: cartId });
      if ("error" in recalc) {
        throw new Error(recalc.error);
      }

      const refreshed = await this.carts.findOne({ _id: cartId });
      if (!refreshed) return null;
      cartDoc = refreshed;
    }

    return cartDoc;
  }

  async createCart({ dateInWeek }: CreateCartInput): Promise<CreateCartOutput> {
    try {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      const startDate = getSundayOfWeek(dateInWeek);
      const endDate = getSaturdayOfWeek(dateInWeek);

      if (now > startDate) {
        return {
          error: `Cannot create cart for a past/started week. Week starts on ${
            startDate.toISOString().split("T")[0]
          }.`,
        };
      }

      const existing = await this.carts.findOne({ startDate, endDate });
      if (existing) {
        return {
          error: `Cart already exists for week ${
            startDate.toISOString().split("T")[0]
          }.`,
        };
      }

      const cart = freshID() as Cart;
      await this.carts.insertOne({
        _id: cart,
        startDate,
        endDate,
        menus: [],
        totalCost: 0,
        menuCosts: {},
        recipeCostsByMenu: {},
        aggregatedItems: [],
        dataVersion: 0,
        calculatedVersion: 0,
      });
      return { cart };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to create cart: ${error}` };
    }
  }

  async deleteCart({ dateInWeek }: DeleteCartInput): Promise<DeleteCartOutput> {
    try {
      const normalized = new Date(dateInWeek);
      normalized.setUTCHours(0, 0, 0, 0);
      const cart = await this.carts.findOne({
        startDate: { $lte: normalized },
        endDate: { $gte: normalized },
      });
      if (!cart) {
        return {
          error: `No cart found for date ${
            normalized.toISOString().split("T")[0]
          }.`,
        };
      }
      await this.carts.deleteOne({ _id: cart._id });
      return { cart: cart._id };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to delete cart: ${error}` };
    }
  }

  async addMenuToCart(
    { menu, menuDate }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const normalized = new Date(menuDate);
      normalized.setUTCHours(0, 0, 0, 0);
      const cart = await this.carts.findOne({
        startDate: { $lte: normalized },
        endDate: { $gte: normalized },
      });
      if (!cart) {
        return { error: `No cart exists for provided menuDate.` };
      }
      const res = await this.carts.updateOne(
        { _id: cart._id },
        { $addToSet: { menus: menu } },
      );
      if (res.matchedCount === 0) return { error: `Cart not found.` };
      return { cart: cart._id };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to add menu to cart: ${error}` };
    }
  }

  async removeMenuFromCart(
    { menu }: RemoveMenuFromCartInput,
  ): Promise<RemoveMenuFromCartOutput> {
    try {
      const cart = await this.carts.findOne({ menus: menu });
      if (!cart) return { error: `Menu not found in any cart.` };
      await this.carts.updateOne({ _id: cart._id }, { $pull: { menus: menu } });
      return { cart: cart._id };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to remove menu from cart: ${error}` };
    }
  }

  async bumpCartVersion(
    { cart }: BumpCartVersionInput,
  ): Promise<BumpCartVersionOutput> {
    try {
      const updated = await this.carts.findOneAndUpdate(
        { _id: cart },
        { $inc: { dataVersion: 1 } },
        { returnDocument: "after" },
      );
      if (!updated) return { error: `Cart '${cart}' not found.` };
      return { cart: updated._id, dataVersion: updated.dataVersion };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to bump cart version: ${error}` };
    }
  }

  async saveCalculation(
    {
      cart,
      totalCost,
      menuCosts,
      recipeCostsByMenu,
      aggregatedItems,
    }: SaveCalculationInput,
  ): Promise<SaveCalculationOutput> {
    try {
      const existing = await this.carts.findOne({ _id: cart });
      if (!existing) return { error: `Cart '${cart}' not found.` };

      await this.carts.updateOne(
        { _id: cart },
        {
          $set: {
            totalCost: roundMoney(totalCost),
            menuCosts,
            recipeCostsByMenu,
            aggregatedItems,
            calculatedVersion: existing.dataVersion,
          },
        },
      );
      return { cart };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to save calculation: ${error}` };
    }
  }

  async recalculateCart(
    { cart }: RecalculateCartInput,
  ): Promise<RecalculateCartOutput> {
    try {
      const cartDoc = await this.carts.findOne({ _id: cart });
      if (!cartDoc) {
        return { error: `Cart '${cart}' not found.` };
      }

      const rows = await this.carts.aggregate<{
        menuId: ID;
        recipeId: ID;
        ingredientName: string;
        ingredientQuantity: number;
        ingredientUnits: string;
        scaledQuantity: number;
        item: ItemDoc | null;
        purchaseOptions: PurchaseOptionDoc[];
      }>([
        { $match: { _id: cart } },
        {
          $lookup: {
            from: "MenuCollection.menus",
            localField: "menus",
            foreignField: "_id",
            as: "menuDocs",
          },
        },
        { $unwind: "$menuDocs" },
        {
          $project: {
            menuId: "$menuDocs._id",
            menuRecipesArray: { $objectToArray: "$menuDocs.menuRecipes" },
          },
        },
        { $unwind: "$menuRecipesArray" },
        {
          $project: {
            menuId: 1,
            recipeId: "$menuRecipesArray.k",
            scalingFactor: "$menuRecipesArray.v",
          },
        },
        {
          $lookup: {
            from: "CookBook.recipes",
            let: { recipeId: "$recipeId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$recipeId"] } } },
            ],
            as: "recipeDoc",
          },
        },
        { $unwind: "$recipeDoc" },
        { $unwind: "$recipeDoc.ingredients" },
        {
          $project: {
            menuId: 1,
            recipeId: 1,
            ingredientName: "$recipeDoc.ingredients.name",
            ingredientQuantity: "$recipeDoc.ingredients.quantity",
            ingredientUnits: "$recipeDoc.ingredients.units",
            scaledQuantity: {
              $multiply: ["$recipeDoc.ingredients.quantity", "$scalingFactor"],
            },
          },
        },
        {
          $lookup: {
            from: "StoreCatalog.items",
            localField: "ingredientName",
            foreignField: "name",
            as: "itemDoc",
          },
        },
        {
          $unwind: {
            path: "$itemDoc",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "StoreCatalog.purchaseOptions",
            localField: "itemDoc._id",
            foreignField: "itemId",
            as: "purchaseOptions",
          },
        },
        {
          $project: {
            menuId: 1,
            recipeId: 1,
            ingredientName: 1,
            ingredientQuantity: 1,
            ingredientUnits: 1,
            scaledQuantity: 1,
            item: "$itemDoc",
            purchaseOptions: 1,
          },
        },
      ]).toArray();

      const byItem = new Map<
        Item,
        {
          itemId: Item;
          name: string;
          occurrences: Array<{
            menuId: Menu;
            recipeId: Recipe;
            quantity: number;
            units: string;
          }>;
          purchaseOptions: Map<PurchaseOption, PurchaseOptionDoc>;
        }
      >();

      for (const row of rows) {
        if (!row.item?._id) {
          continue;
        }
        const itemId = row.item._id as Item;
        let itemBucket = byItem.get(itemId);
        if (!itemBucket) {
          itemBucket = {
            itemId,
            name: row.item.name,
            occurrences: [],
            purchaseOptions: new Map(),
          };
          byItem.set(itemId, itemBucket);
        }
        itemBucket.occurrences.push({
          menuId: row.menuId as Menu,
          recipeId: row.recipeId as Recipe,
          quantity: row.scaledQuantity,
          units: row.ingredientUnits,
        });
        for (const po of row.purchaseOptions ?? []) {
          itemBucket.purchaseOptions.set(po._id as PurchaseOption, po);
        }
      }

      const menuCosts: Record<Menu, number> = {};
      const recipeCostsByMenu: Record<Menu, Record<Recipe, number>> = {};
      const aggregatedItems: CartItemSnapshot[] = [];
      let totalCost = 0;

      for (const [, itemData] of byItem) {
        let best:
          | {
            po: PurchaseOptionDoc;
            totalRequiredInPoUnits: number;
            packageCount: number;
            cost: number;
          }
          | null = null;

        for (const [, po] of itemData.purchaseOptions) {
          if (po.quantity <= 0 || po.price < 0) continue;
          let totalRequiredInPoUnits = 0;
          let convertible = true;
          for (const occ of itemData.occurrences) {
            const converted = convertWithinCategory(
              occ.quantity,
              occ.units,
              po.units,
            );
            if (converted === null || !Number.isFinite(converted)) {
              convertible = false;
              break;
            }
            totalRequiredInPoUnits += converted;
          }
          if (!convertible || totalRequiredInPoUnits <= 0) continue;
          const packageCount = Math.ceil(totalRequiredInPoUnits / po.quantity);
          const cost = packageCount * po.price;

          if (
            !best ||
            cost < best.cost ||
            (cost === best.cost && String(po._id) < String(best.po._id))
          ) {
            best = {
              po,
              totalRequiredInPoUnits,
              packageCount,
              cost,
            };
          }
        }

        if (!best) {
          continue;
        }

        totalCost += best.cost;

        for (const occ of itemData.occurrences) {
          const converted = convertWithinCategory(
            occ.quantity,
            occ.units,
            best.po.units,
          );
          if (converted === null || !Number.isFinite(converted)) {
            continue;
          }
          const share = best.totalRequiredInPoUnits > 0
            ? converted / best.totalRequiredInPoUnits
            : 0;
          const contribution = best.cost * share;
          menuCosts[occ.menuId] = (menuCosts[occ.menuId] ?? 0) + contribution;
          recipeCostsByMenu[occ.menuId] = recipeCostsByMenu[occ.menuId] ?? {};
          recipeCostsByMenu[occ.menuId][occ.recipeId] =
            (recipeCostsByMenu[occ.menuId][occ.recipeId] ?? 0) + contribution;
        }

        aggregatedItems.push({
          itemId: itemData.itemId,
          name: itemData.name,
          totalRequiredQuantity: best.totalRequiredInPoUnits,
          baseUnits: best.po.units,
          purchaseOption: {
            purchaseOptionId: best.po._id as PurchaseOption,
            store: best.po.store,
            quantityToBuy: best.packageCount,
            cost: roundMoney(best.cost),
            confirmed: best.po.confirmed,
          },
          apportionedCost: roundMoney(best.cost),
        });
      }

      for (const key of Object.keys(menuCosts)) {
        menuCosts[key as Menu] = roundMoney(menuCosts[key as Menu]);
      }
      for (const [menuId, recipeMap] of Object.entries(recipeCostsByMenu)) {
        for (const recipeId of Object.keys(recipeMap)) {
          recipeMap[recipeId as Recipe] = roundMoney(
            recipeMap[recipeId as Recipe],
          );
        }
        recipeCostsByMenu[menuId as Menu] = recipeMap;
      }

      aggregatedItems.sort((a, b) => a.name.localeCompare(b.name));

      const save = await this.saveCalculation({
        cart: cartDoc._id,
        totalCost: roundMoney(totalCost),
        menuCosts,
        recipeCostsByMenu,
        aggregatedItems,
      });
      if ("error" in save) {
        return save;
      }

      return { cart: cartDoc._id, success: true };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to recalculate cart: ${error}` };
    }
  }

  async _getCartDates(
    { cart }: GetCartDatesInput,
  ): Promise<GetCartDatesOutput> {
    try {
      const cartDoc = await this.ensureFreshCart(cart);
      if (!cartDoc) return { error: `Cart '${cart}' not found.` };
      return [{ startDate: cartDoc.startDate, endDate: cartDoc.endDate }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get cart dates: ${error}` };
    }
  }

  async _getMenusInCart(
    { cart }: GetMenusInCartInput,
  ): Promise<GetMenusInCartOutput> {
    try {
      const cartDoc = await this.ensureFreshCart(cart);
      if (!cartDoc) return { error: `Cart '${cart}' not found.` };
      return [{ menus: cartDoc.menus }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get menus in cart: ${error}` };
    }
  }

  async _getCartByDate(
    { date }: GetCartByDateInput,
  ): Promise<GetCartByDateOutput> {
    try {
      const normalized = new Date(date);
      normalized.setUTCHours(0, 0, 0, 0);
      const cartDoc = await this.carts.findOne({
        startDate: { $lte: normalized },
        endDate: { $gte: normalized },
      });
      if (!cartDoc) return [];
      const fresh = await this.ensureFreshCart(cartDoc._id);
      if (!fresh) return [];
      return [{ cart: fresh._id }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get cart by date: ${error}` };
    }
  }

  async _getCartWithMenu(
    { menu }: GetCartWithMenuInput,
  ): Promise<GetCartWithMenuOutput> {
    try {
      const cartDoc = await this.carts.findOne({ menus: menu });
      if (!cartDoc) return [];
      const fresh = await this.ensureFreshCart(cartDoc._id);
      if (!fresh) return [];
      return [{ cart: fresh._id }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get cart with menu: ${error}` };
    }
  }

  async _getCartCosts(
    { cart }: GetCartCostsInput,
  ): Promise<GetCartCostsOutput> {
    try {
      const cartDoc = await this.ensureFreshCart(cart);
      if (!cartDoc) return { error: `Cart '${cart}' not found.` };
      return [{
        totalCost: cartDoc.totalCost,
        menuCosts: cartDoc.menuCosts,
        recipeCostsByMenu: cartDoc.recipeCostsByMenu,
      }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get cart costs: ${error}` };
    }
  }

  async _getCartDetailsBundle(
    { weekStart }: GetCartDetailsBundleInput,
  ): Promise<GetCartDetailsBundleOutput> {
    try {
      const normalized = new Date(weekStart);
      normalized.setUTCHours(0, 0, 0, 0);

      const cartFound = await this.carts.findOne({ startDate: normalized });
      if (!cartFound) {
        return {
          error: `Cart with weekStart '${normalized.toISOString().split("T")[0]}' not found.`,
        };
      }

      const cartDoc = await this.ensureFreshCart(cartFound._id);
      if (!cartDoc) {
        return { error: `Cart '${cartFound._id}' not found after recalculation.` };
      }

      const menuDocs = await this.menus.find({
        _id: { $in: cartDoc.menus },
      }).toArray();
      menuDocs.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return String(a._id).localeCompare(String(b._id));
      });

      const menusPayload: Array<{
        id: Menu;
        date: string;
        name: string;
        ownerId: ID;
        ownerName: string;
        cost: number;
        recipes: Array<{
          id: Recipe;
          name: string;
          scalingFactor: number;
          cost: number;
          ingredients: Array<{ name: string; quantity: number; units: string }>;
        }>;
        aggregatedItems: Array<{
          itemId: Item;
          name: string;
          totalRequiredQuantity: number;
          baseUnits: string;
          purchaseOption: {
            store: string;
            quantityToBuy: number;
            cost: number;
            confirmed: boolean;
          };
          apportionedCost: number;
        }>;
      }> = [];

      const ownerIds = [...new Set(menuDocs.map((m) => m.owner))];
      const ownerDocs = await this.users.find(
        { _id: { $in: ownerIds } },
        { projection: { _id: 1, username: 1 } },
      ).toArray();
      const ownerNameById = new Map<ID, string>(
        ownerDocs.map((u) => [u._id, u.username]),
      );

      const menuItemRows = await this.carts.aggregate<{
        menuId: ID;
        ingredientUnits: string;
        scaledQuantity: number;
        item: ItemDoc | null;
      }>([
        { $match: { _id: cartDoc._id } },
        {
          $lookup: {
            from: "MenuCollection.menus",
            localField: "menus",
            foreignField: "_id",
            as: "menuDocs",
          },
        },
        { $unwind: "$menuDocs" },
        {
          $project: {
            menuId: "$menuDocs._id",
            menuRecipesArray: { $objectToArray: "$menuDocs.menuRecipes" },
          },
        },
        { $unwind: "$menuRecipesArray" },
        {
          $project: {
            menuId: 1,
            recipeId: "$menuRecipesArray.k",
            scalingFactor: "$menuRecipesArray.v",
          },
        },
        {
          $lookup: {
            from: "CookBook.recipes",
            let: { recipeId: "$recipeId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$recipeId"] } } },
            ],
            as: "recipeDoc",
          },
        },
        { $unwind: "$recipeDoc" },
        { $unwind: "$recipeDoc.ingredients" },
        {
          $project: {
            menuId: 1,
            ingredientName: "$recipeDoc.ingredients.name",
            ingredientUnits: "$recipeDoc.ingredients.units",
            scaledQuantity: {
              $multiply: ["$recipeDoc.ingredients.quantity", "$scalingFactor"],
            },
          },
        },
        {
          $lookup: {
            from: "StoreCatalog.items",
            localField: "ingredientName",
            foreignField: "name",
            as: "itemDoc",
          },
        },
        {
          $unwind: {
            path: "$itemDoc",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            menuId: 1,
            ingredientUnits: 1,
            scaledQuantity: 1,
            item: "$itemDoc",
          },
        },
      ]).toArray();

      const cartAggregatedByItem = new Map<Item, CartItemSnapshot>(
        cartDoc.aggregatedItems.map((item) => [item.itemId, item]),
      );
      const menuAggregations = new Map<
        Menu,
        Map<Item, { item: CartItemSnapshot; totalRequiredQuantity: number; apportionedCost: number }>
      >();

      for (const row of menuItemRows) {
        if (!row.item?._id) continue;
        const itemId = row.item._id as Item;
        const cartItem = cartAggregatedByItem.get(itemId);
        if (!cartItem) continue;
        const converted = convertWithinCategory(
          row.scaledQuantity,
          row.ingredientUnits,
          cartItem.baseUnits,
        );
        if (converted === null || !Number.isFinite(converted) || converted <= 0) continue;

        const menuId = row.menuId as Menu;
        const byItem = menuAggregations.get(menuId) ?? new Map();
        const existing = byItem.get(itemId) ?? {
          item: cartItem,
          totalRequiredQuantity: 0,
          apportionedCost: 0,
        };
        existing.totalRequiredQuantity += converted;
        byItem.set(itemId, existing);
        menuAggregations.set(menuId, byItem);
      }

      for (const [, byItem] of menuAggregations) {
        for (const [itemId, entry] of byItem) {
          const denom = entry.item.totalRequiredQuantity;
          const share = denom > 0 ? entry.totalRequiredQuantity / denom : 0;
          const cost = entry.item.apportionedCost * share;
          byItem.set(itemId, {
            ...entry,
            totalRequiredQuantity: roundMoney(entry.totalRequiredQuantity),
            apportionedCost: roundMoney(cost),
          });
        }
      }

      for (const menuDoc of menuDocs) {
        const recipeIds = Object.keys(menuDoc.menuRecipes) as Recipe[];
        const recipes = await this.recipes.find({
          _id: { $in: recipeIds },
        }).toArray();
        recipes.sort((a, b) => String(a._id).localeCompare(String(b._id)));

        const recipeById = new Map<Recipe, RecipeDoc>(
          recipes.map((r) => [r._id as Recipe, r]),
        );

        const recipesPayload = recipeIds
          .sort((a, b) => String(a).localeCompare(String(b)))
          .map((recipeId) => {
            const recipeDoc = recipeById.get(recipeId)!;
            const scalingFactor = menuDoc.menuRecipes[recipeId] ?? 1;
            const recipeCost =
              cartDoc.recipeCostsByMenu[menuDoc._id]?.[recipeId] ?? 0;

            return {
              id: recipeId,
              name: recipeDoc.name,
              scalingFactor,
              cost: roundMoney(recipeCost),
              ingredients: recipeDoc.ingredients.map((ingredient) => ({
                name: ingredient.name,
                quantity: ingredient.quantity * scalingFactor,
                units: ingredient.units,
              })),
            };
          });

        menusPayload.push({
          id: menuDoc._id as Menu,
          date: menuDoc.date.toISOString().split("T")[0],
          name: menuDoc.name,
          ownerId: menuDoc.owner,
          ownerName: ownerNameById.get(menuDoc.owner) ?? "USER_NOT_FOUND",
          cost: roundMoney(cartDoc.menuCosts[menuDoc._id as Menu] ?? 0),
          recipes: recipesPayload,
          aggregatedItems: Array.from(menuAggregations.get(menuDoc._id as Menu)?.values() ??
            []).map((entry) => ({
              itemId: entry.item.itemId,
              name: entry.item.name,
              totalRequiredQuantity: entry.totalRequiredQuantity,
              baseUnits: entry.item.baseUnits,
              purchaseOption: {
                store: entry.item.purchaseOption.store,
                quantityToBuy: entry.item.purchaseOption.quantityToBuy,
                cost: entry.item.purchaseOption.cost,
                confirmed: entry.item.purchaseOption.confirmed ?? false,
              },
              apportionedCost: entry.apportionedCost,
            })).sort((a, b) => a.name.localeCompare(b.name)),
        });
      }

      const aggregatedItemsPayload = cartDoc.aggregatedItems.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        totalRequiredQuantity: item.totalRequiredQuantity,
        baseUnits: item.baseUnits,
        purchaseOption: {
          store: item.purchaseOption.store,
          quantityToBuy: item.purchaseOption.quantityToBuy,
          cost: item.purchaseOption.cost,
          confirmed: item.purchaseOption.confirmed ?? false,
        },
        apportionedCost: item.apportionedCost,
      }));

      return [{
        cart: {
          id: cartDoc._id,
          startDate: cartDoc.startDate.toISOString().split("T")[0],
          endDate: cartDoc.endDate.toISOString().split("T")[0],
          totalCost: cartDoc.totalCost,
          dataVersion: cartDoc.dataVersion,
          calculatedVersion: cartDoc.calculatedVersion,
        },
        menus: menusPayload,
        aggregatedItems: aggregatedItemsPayload,
      }];
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      return { error: `Failed to get cart details bundle: ${error}` };
    }
  }
}
