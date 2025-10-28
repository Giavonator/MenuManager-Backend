---
timestamp: 'Mon Oct 27 2025 14:28:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_142817.7a879c17.md]]'
content_id: 0926fdf626c4214dbf53f29bc9e9009cdeaaab8c491c4f6b64f1b22e85e13c52
---

# file: src/concepts/WeeklyCart/WeeklyCartConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";

// --- Helper Date Functions ---
// These helpers normalize dates to UTC start of day for consistent comparison
// and calculation of week boundaries (Sunday to Saturday).

/**
 * Calculates the UTC Sunday (start of day) for the week containing the given date.
 * @param date The reference date.
 * @returns A Date object representing the UTC Sunday of the week.
 */
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = d.getUTCDate() - day; // Adjust date to Sunday
  d.setUTCDate(diff);
  return d;
}

/**
 * Calculates the UTC Saturday (start of day) for the week containing the given date.
 * @param date The reference date.
 * @returns A Date object representing the UTC Saturday of the week.
 */
function getSaturdayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = d.getUTCDate() + (6 - day); // Adjust date to Saturday
  d.setUTCDate(diff);
  return d;
}

// --- Concept Definition ---

// Declare collection prefix, use concept name
const PREFIX = "WeeklyCart" + ".";

// Generic types of this concept
type Menu = ID; // Menu is an external ID, no internal properties here.
type Cart = ID; // The ID of a cart will be its startDate formatted as a YYYY-MM-DD string.

// --- MongoDB Document Interfaces ---

/**
 * a set of Cart with // must be no overlap in cart dates
 *   a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday for the week the cart represents
 *   an endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday of the same week as startDate
 *   a menus Set of Menu
 */
interface CartDocument {
  _id: Cart; // The startDate formatted as YYYY-MM-DD string, serving as the unique identifier for the week.
  startDate: Date;
  endDate: Date;
  menus: Menu[]; // Storing an array of Menu IDs that belong to this week's cart.
}

// --- Action Input/Output Types ---

type CreateCartInput = { dateInWeek: Date };
type CreateCartOutput = Result<{ cart: Cart }>; // Returns the ID of the created cart

type DeleteCartInput = { dateInWeek: Date };
type DeleteCartOutput = Result<{ cart: Cart }>; // Returns the ID of the deleted cart

type AddMenuToCartInput = { menu: Menu; menuDate: Date };
type AddMenuToCartOutput = Result<{ cart: Cart }>; // Returns the ID of the cart the menu was added to

type RemoveMenuFromCartInput = { menu: Menu };
type RemoveMenuFromCartOutput = Result<{ cart: Cart }>; // Returns the ID of the cart the menu was removed from

// --- Query Input/Output Types ---

type GetCartDatesInput = { cart: Cart };
type GetCartDatesOutput = Result<{ startDate: Date; endDate: Date }[]>; // Returns an array of objects.

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>; // Returns an array of objects.

type GetCartByDateInput = { date: Date };
type GetCartByDateOutput = Result<{ cart: Cart }[]>; // Returns an array of objects, or empty array if not found.

// --- WeeklyCartConcept Class ---

/**
 * **concept** WeeklyCart [Menu]
 *
 * **purpose** Organize menus for a specific week into a coherent cart for ease of organization.
 *
 * **principle** A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2".
 * They then `addMenuToCart` for "Monday Spaghetti", "Wednesday Pizza", and "Friday Tacos" enabling a comprehensive grouping of the week's meals.
 * User can then `removeMenuFromCart` "Wednesday Pizza" when they decide it is not needed anymore.
 */
export default class WeeklyCartConcept {
  carts: Collection<CartDocument>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection(PREFIX + "carts");
  }

  /**
   * createCart (dateInWeek: Date): (cart: Cart)
   *
   * **requires** the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.
   *
   * **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week.
   * Creates a new `Cart` with this `startDate` and `endDate`. It will have an empty set of `menus`.
   */
  async createCart({ dateInWeek }: CreateCartInput): Promise<CreateCartOutput> {
    try {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0); // Normalize current date for comparison

      const normalizedDateInWeek = new Date(dateInWeek);
      normalizedDateInWeek.setUTCHours(0, 0, 0, 0); // Normalize input date for comparison

      // Requirement: current system date is before `dateInWeek`
      if (now >= normalizedDateInWeek) {
        return {
          error:
            `Cannot create a cart for a week that has already started or is in the past relative to the current day: ${
              dateInWeek.toISOString().split("T")[0]
            }`,
        };
      }

      const startDate = getSundayOfWeek(dateInWeek);
      const endDate = getSaturdayOfWeek(dateInWeek);

      // The _id of the cart will be its startDate formatted as YYYY-MM-DD string.
      const cartId = startDate.toISOString().split("T")[0] as Cart;

      // Requirement: No other Cart exists for the week containing `dateInWeek`.
      const existingCart = await this.carts.findOne({ _id: cartId });
      if (existingCart) {
        return {
          error: `A cart already exists for the week starting on ${cartId}`,
        };
      }

      const newCart: CartDocument = {
        _id: cartId,
        startDate: startDate,
        endDate: endDate,
        menus: [],
      };

      await this.carts.insertOne(newCart);
      return { cart: cartId };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error creating cart: ${errorMessage}`);
      return { error: `Failed to create cart: ${errorMessage}` };
    }
  }

  /**
   * deleteCart (dateInWeek: Date): (cart: Cart)
   *
   * **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.
   *
   * **effects** Deletes `cart`. Returns `cart` ID.
   */
  async deleteCart({ dateInWeek }: DeleteCartInput): Promise<DeleteCartOutput> {
    try {
      const normalizedDateInWeek = new Date(dateInWeek);
      normalizedDateInWeek.setUTCHours(0, 0, 0, 0);

      // Find the cart whose date range contains the dateInWeek
      const cart = await this.carts.findOne({
        startDate: { $lte: normalizedDateInWeek },
        endDate: { $gte: normalizedDateInWeek },
      });

      if (!cart) {
        return {
          error: `No cart found for the week containing ${
            dateInWeek.toISOString().split("T")[0]
          }`,
        };
      }

      const deleteResult = await this.carts.deleteOne({ _id: cart._id });
      if (deleteResult.deletedCount === 0) {
        // This case should ideally not be reached if findOne succeeded, but good for robustness.
        return { error: `Failed to delete cart with ID ${cart._id}` };
      }

      return { cart: cart._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error deleting cart: ${errorMessage}`);
      return { error: `Failed to delete cart: ${errorMessage}` };
    }
  }

  /**
   * addMenuToCart (menu: Menu, menuDate: Date): (cart: Cart)
   *
   * **requires** `menu` exists. (Note: "menu exists" means its ID is valid, but this concept does not validate `Menu` content itself)
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`.
   * If such a cart doesn't exist, a `createCart` for that date and then add `menu` to the new cart.
   * Return `cart` menu was added to.
   */
  async addMenuToCart(
    { menu, menuDate }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const normalizedMenuDate = new Date(menuDate);
      normalizedMenuDate.setUTCHours(0, 0, 0, 0);

      let cart = await this.carts.findOne({
        startDate: { $lte: normalizedMenuDate },
        endDate: { $gte: normalizedMenuDate },
      });

      // If cart doesn't exist for the week, create one
      if (!cart) {
        console.log(
          `No cart found for ${
            menuDate.toISOString().split("T")[0]
          }, creating a new one...`,
        );
        const createResult = await this.createCart({ dateInWeek: menuDate });

        if (createResult.error) {
          return {
            error:
              `Failed to create cart for menu addition: ${createResult.error}`,
          };
        }
        // Retrieve the newly created cart using its ID from createResult
        cart = await this.carts.findOne({ _id: createResult.cart });
        if (!cart) {
          // This scenario indicates a critical issue if cart creation succeeded but lookup failed
          return {
            error:
              `Failed to retrieve newly created cart with ID ${createResult.cart}`,
          };
        }
      }

      // Check if menu is already in the cart to provide a specific error message if applicable
      if (cart.menus.includes(menu)) {
        return {
          error: `Menu ${menu} is already in the cart for week starting ${
            cart.startDate.toISOString().split("T")[0]
          }`,
        };
      }

      const updateResult = await this.carts.updateOne(
        { _id: cart._id },
        { $addToSet: { menus: menu } }, // $addToSet ensures unique menu IDs in the array
      );

      if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        // This case might happen if cart was found but not modified (e.g., menu already present)
        // However, the check above covers 'menu already present'.
        return { error: `Failed to add menu ${menu} to cart ${cart._id}` };
      }

      return { cart: cart._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error adding menu to cart: ${errorMessage}`);
      return { error: `Failed to add menu to cart: ${errorMessage}` };
    }
  }

  /**
   * removeMenuFromCart (menu: Menu): (cart: Cart)
   *
   * **requires** `menu` exists in a `cart.menus`.
   *
   * **effects** Removes `menu` from `cart.menus`. Returns `cart` that menu was removed from.
   */
  async removeMenuFromCart(
    { menu }: RemoveMenuFromCartInput,
  ): Promise<RemoveMenuFromCartOutput> {
    try {
      // Find the cart that contains the specified menu
      const cart = await this.carts.findOne({ menus: menu });

      if (!cart) {
        return { error: `Menu ${menu} not found in any cart.` };
      }

      const updateResult = await this.carts.updateOne(
        { _id: cart._id },
        { $pull: { menus: menu } }, // $pull removes all occurrences of a value from an array
      );

      if (updateResult.modifiedCount === 0) {
        // This might happen if the menu was found in the findOne but then somehow already removed
        // by another operation, or $pull failed for another reason.
        return { error: `Failed to remove menu ${menu} from cart ${cart._id}` };
      }

      return { cart: cart._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error removing menu from cart: ${errorMessage}`);
      return { error: `Failed to remove menu from cart: ${errorMessage}` };
    }
  }

  /**
   * _getCartDates (cart: Cart): (startDate: Date, endDate: Date)
   *
   * **requires** `cart` exists.
   *
   * **effects** Returns `cart` `startDate` and `endDate`.
   */
  async _getCartDates(
    { cart }: GetCartDatesInput,
  ): Promise<GetCartDatesOutput> {
    try {
      const cartDoc = await this.carts.findOne({ _id: cart });
      if (!cartDoc) {
        return { error: `Cart with ID ${cart} not found.` };
      }
      return [{ startDate: cartDoc.startDate, endDate: cartDoc.endDate }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart dates: ${errorMessage}`);
      return { error: `Failed to get cart dates: ${errorMessage}` };
    }
  }

  /**
   * _getMenusInCart (cart: Cart): (menus: Set of Menu)
   *
   * **requires** `cart` exists.
   *
   * **effects** Returns the set of all `Menu` IDs associated with the given `cart`.
   */
  async _getMenusInCart(
    { cart }: GetMenusInCartInput,
  ): Promise<GetMenusInCartOutput> {
    try {
      const cartDoc = await this.carts.findOne({ _id: cart });
      if (!cartDoc) {
        return { error: `Cart with ID ${cart} not found.` };
      }
      return [{ menus: cartDoc.menus }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting menus in cart: ${errorMessage}`);
      return { error: `Failed to get menus in cart: ${errorMessage}` };
    }
  }

  /**
   * _getCartByDate (date: Date): (cart: Cart)
   *
   * **requires** true.
   *
   * **effects** Returns the `cart` for that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.
   */
  async _getCartByDate(
    { date }: GetCartByDateInput,
  ): Promise<GetCartByDateOutput> {
    try {
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      const cartDoc = await this.carts.findOne({
        startDate: { $lte: normalizedDate },
        endDate: { $gte: normalizedDate },
      });

      if (!cartDoc) {
        return []; // As per spec, returns an empty array if no cart found.
      }
      return [{ cart: cartDoc._id }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart by date: ${errorMessage}`);
      return { error: `Failed to get cart by date: ${errorMessage}` };
    }
  }
}

```
