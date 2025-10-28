---
timestamp: 'Mon Oct 27 2025 14:09:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_140912.dd806eb7.md]]'
content_id: 462b62bed375f7434d74e7facab6136beba5beada793e8e6ac3b00ba502b9d10
---

# file: src/concepts/WeeklyCart/WeeklyCartConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "WeeklyCart" + ".";

// Generic types of this concept
// The concept spec defines WeeklyCart [Menu], so Menu is the only external ID type.
type Menu = ID;
type Cart = ID; // The concept itself also introduces a Cart ID

/**
 * Helper functions for date calculations, ensuring YYYY-MM-DD format
 * All dates are treated as UTC to avoid timezone issues affecting day calculations.
 */
function formatDate(date: Date): string {
  // Returns 'YYYY-MM-DD' from a Date object
  return date.toISOString().split("T")[0];
}

function parseDate(dateString: string): Date {
  // Parses 'YYYY-MM-DD' string into a UTC Date object
  // Using Date.UTC to ensure consistent interpretation across environments
  const [year, month, day] = dateString.split("-").map(Number);
  // Month is 0-indexed in Date constructor
  return new Date(Date.UTC(year, month - 1, day));
}

function getWeekStartAndEndDate(
  dateInWeekString: string,
): { startDate: string; endDate: string } {
  const dateInWeek = parseDate(dateInWeekString);
  const dayOfWeek = dateInWeek.getUTCDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

  // Calculate Sunday (start of week)
  const sunday = new Date(dateInWeek);
  sunday.setUTCDate(dateInWeek.getUTCDate() - dayOfWeek);
  const startDate = formatDate(sunday);

  // Calculate Saturday (end of week)
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  const endDate = formatDate(saturday);

  return { startDate, endDate };
}

// Input and Output types for actions
type CreateCartInput = { dateInWeek: string };
type CreateCartOutput = Result<{ cart: Cart }>;

type DeleteCartInput = { dateInWeek: string };
type DeleteCartOutput = Result<{ cart: Cart }>;

type AddMenuToCartInput = { menu: Menu; menuDate: string };
type AddMenuToCartOutput = Result<{ cart: Cart }>;

type RemoveMenuFromCartInput = { menu: Menu };
type RemoveMenuFromCartOutput = Result<{ cart: Cart }>;

// Input and Output types for queries
type GetCartDatesInput = { cart: Cart };
type GetCartDatesOutput = Result<{ startDate: string; endDate: string }[]>;

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: string };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;

/**
 * a set of Cart with // must be no overlap in cart dates
 *   a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday for the week the cart represents
 *   an endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday of the same week as startDate
 *   a menus Set of Menu
 */
interface CartDocument {
  _id: Cart;
  startDate: string; // YYYY-MM-DD, always a Sunday
  endDate: string; // YYYY-MM-DD, always a Saturday
  menus: Menu[];
}

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
      const { startDate, endDate } = getWeekStartAndEndDate(dateInWeek);
      const currentDate = formatDate(new Date());

      // Precondition: current system date is before dateInWeek
      if (parseDate(currentDate).getTime() >= parseDate(dateInWeek).getTime()) {
        return { error: "Cannot create cart for a past or current date." };
      }

      // Precondition: No other `Cart` exists for the week containing `dateInWeek`.
      const existingCart = await this.carts.findOne({
        startDate: startDate,
        endDate: endDate,
      });

      if (existingCart) {
        return {
          error: `A cart already exists for the week of ${dateInWeek}.`,
        };
      }

      const newCartId = freshID() as Cart;
      const newCart: CartDocument = {
        _id: newCartId,
        startDate: startDate,
        endDate: endDate,
        menus: [],
      };

      await this.carts.insertOne(newCart);

      return { cart: newCartId };
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
   * **effects** Deletes `cart`.
   */
  async deleteCart({ dateInWeek }: DeleteCartInput): Promise<DeleteCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(dateInWeek);

      // Precondition: there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.
      const cartToDelete = await this.carts.findOne({
        startDate: startDate,
        endDate: endDate,
      });

      if (!cartToDelete) {
        return {
          error: `No cart found for the week containing ${dateInWeek}.`,
        };
      }

      await this.carts.deleteOne({ _id: cartToDelete._id });

      return { cart: cartToDelete._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error deleting cart: ${errorMessage}`);
      return { error: `Failed to delete cart: ${errorMessage}` };
    }
  }

  /**
   * addMenuToCart (menu: Menu, menuDate: Date): (cart: Cart)
   *
   * **requires** `menu` exists.
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`.
   * If such a cart doesn't exist, a `createCart` for that date and then add `menu` to the new cart.
   * Return `cart` menu was added to.
   */
  async addMenuToCart(
    { menu, menuDate }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(menuDate);

      // Find existing cart for the week
      let targetCart = await this.carts.findOne({ startDate, endDate });
      let cartId: Cart;

      // Effect: If such a cart doesn't exist, create a cart for that date
      if (!targetCart) {
        // Must satisfy `createCart` preconditions to create it.
        const currentDate = formatDate(new Date());
        if (parseDate(currentDate).getTime() >= parseDate(menuDate).getTime()) {
          return {
            error:
              `Cannot create a new cart for a past or current week to add menu ${menu}.`,
          };
        }

        // Create the new cart
        const newCartId = freshID() as Cart;
        const newCart: CartDocument = {
          _id: newCartId,
          startDate: startDate,
          endDate: endDate,
          menus: [],
        };
        await this.carts.insertOne(newCart);
        targetCart = newCart; // Set targetCart to the newly created one
        cartId = newCartId;
      } else {
        cartId = targetCart._id;
      }

      // Ensure menu is not already in the cart
      if (targetCart.menus.includes(menu)) {
        return { error: `Menu ${menu} is already in cart ${cartId}.` };
      }

      // Add menu and update
      await this.carts.updateOne(
        { _id: cartId },
        { $addToSet: { menus: menu } }, // $addToSet prevents duplicates naturally
      );

      return { cart: cartId };
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
   * **effects** Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.
   */
  async removeMenuFromCart(
    { menu }: RemoveMenuFromCartInput,
  ): Promise<RemoveMenuFromCartOutput> {
    try {
      // Find the cart that contains this menu
      const targetCart = await this.carts.findOne({ menus: menu });

      // Precondition: `menu` exists in a `cart.menus`.
      if (!targetCart) {
        return { error: `Menu ${menu} not found in any cart.` };
      }

      // Remove menu and update
      await this.carts.updateOne(
        { _id: targetCart._id },
        { $pull: { menus: menu } },
      );

      return { cart: targetCart._id };
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
      const foundCart = await this.carts.findOne({ _id: cart });

      // Precondition: `cart` exists.
      if (!foundCart) {
        return { error: `Cart ${cart} not found.` };
      }

      return [{ startDate: foundCart.startDate, endDate: foundCart.endDate }];
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
      const foundCart = await this.carts.findOne({ _id: cart });

      // Precondition: `cart` exists.
      if (!foundCart) {
        return { error: `Cart ${cart} not found.` };
      }

      return [{ menus: foundCart.menus }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting menus in cart: ${errorMessage}`);
      return { error: `Failed to get menus in cart: ${errorMessage}` };
    }
  }

  /**
   * _getCartByDate (date: Date): (cart: Cart)
   *
   * **requires** `date` is a valid date.
   *
   * **effects** Returns the `cart` for that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.
   */
  async _getCartByDate(
    { date }: GetCartByDateInput,
  ): Promise<GetCartByDateOutput> {
    try {
      // Precondition: `date` is a valid date string (implicitly handled by parseDate/getWeekStartAndEndDate)
      const { startDate, endDate } = getWeekStartAndEndDate(date);

      const foundCart = await this.carts.findOne({
        startDate: startDate,
        endDate: endDate,
      });

      if (!foundCart) {
        // If no such cart exists, returns empty array as per query spec for no results
        return [];
      }

      return [{ cart: foundCart._id }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart by date: ${errorMessage}`);
      return { error: `Failed to get cart by date: ${errorMessage}` };
    }
  }
}
```
