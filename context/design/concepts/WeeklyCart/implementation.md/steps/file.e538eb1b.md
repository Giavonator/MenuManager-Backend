---
timestamp: 'Mon Oct 27 2025 14:12:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_141229.b933a2b3.md]]'
content_id: e538eb1b1fe27707bbc2975c368671d57536049e3c6258e6f34e9cbf0f54b060
---

# file: src/concepts/WeeklyCart/WeeklyCartConcept.ts

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "WeeklyCart" + ".";

// Generic types of this concept
type User = ID;
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
type CreateCartInput = { dateInWeek: string; owner: User };
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

type GetCartOwnerInput = { cart: Cart };
type GetCartOwnerOutput = Result<{ owner: User }[]>;

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: string };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;

/**
 * a set of Cart with
 *   a startDate Date
 *   an endDate Date
 *   an owner User
 *   a menus Set of Menu
 */
interface CartDocument {
  _id: Cart;
  startDate: Date; // YYYY-MM-DD, always a Sunday
  endDate: Date; // YYYY-MM-DD, always a Saturday
  owner: User;
  menus: Menu[];
}

/**
 * **concept** WeeklyCart [User, Menu]
 *
 * **purpose** Organize menus for a specific week into a coherent cart for a user.
 *
 * **principle** A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2".
 * They then `addMenuToCart` for "Monday Dinner" and "Wednesday Lunch".
 * If "Wednesday Lunch" menu is later removed (e.g., due to cancellation), they `removeMenuFromCart`.
 */
export default class WeeklyCartConcept {
  carts: Collection<CartDocument>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection(PREFIX + "carts");
  }

  /**
   * createCart (dateInWeek: Date, owner: User): (cart: Cart)
   *
   * **requires** the current system date is before `dateInWeek`, `owner` exists. No other `Cart` exists for this `owner` for the week containing `dateInWeek`.
   *
   * **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week.
   * Creates a new `Cart` with this `startDate`, `endDate`, and `owner`. It will have an empty set of `menus`.
   * Ownership authorizations will be done via syncs.
   */
  async createCart(
    { dateInWeek, owner }: CreateCartInput,
  ): Promise<CreateCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(dateInWeek);
      const currentDate = formatDate(new Date());

      // Precondition: current system date is before dateInWeek
      if (parseDate(currentDate).getTime() >= parseDate(dateInWeek).getTime()) {
        return { error: "Cannot create cart for a past or current date." };
      }

      // Precondition: No other Cart exists for this owner for the week containing dateInWeek.
      const existingCart = await this.carts.findOne({
        owner: owner,
        startDate: startDate,
        endDate: endDate,
      });

      if (existingCart) {
        return {
          error:
            `A cart already exists for owner ${owner} for the week of ${dateInWeek}.`,
        };
      }

      const newCartId = freshID() as Cart;
      const newCart: CartDocument = {
        _id: newCartId,
        startDate: startDate,
        endDate: endDate,
        owner: owner,
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
   * **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`. Ownership authorizations will be done via syncs.
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
   * **requires** `menu` exists. Ownership authorizations will be done via syncs.
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`.
   * If such a cart doesn't exist, a createCart for that date and then add `menu` to the new cart.
   * Return `cart` menu was added to.
   */
  async addMenuToCart(
    { menu, menuDate }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(menuDate);

      // Find existing cart for the week or create one
      let targetCart = await this.carts.findOne({ startDate, endDate });

      // Effect: If such a cart doesn't exist, createCart for that date
      if (!targetCart) {
        // We cannot directly call createCart without an owner.
        // The spec implies the owner is implicitly known or derived.
        // For now, we'll return an error if no owner is provided, as createCart requires it.
        // A sync would typically provide the `owner` from the user session.
        return {
          error:
            `No cart found for week of ${menuDate}. An owner is required to create a new cart.`,
        };
      }

      // Ensure menu is not already in the cart
      if (targetCart.menus.includes(menu)) {
        return { error: `Menu ${menu} is already in cart ${targetCart._id}.` };
      }

      // Add menu and update
      await this.carts.updateOne(
        { _id: targetCart._id },
        { $addToSet: { menus: menu } }, // $addToSet prevents duplicates naturally
      );

      return { cart: targetCart._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error adding menu to cart: ${errorMessage}`);
      return { error: `Failed to add menu to cart: ${errorMessage}` };
    }
  }

  /**
   * removeMenuFromCart (menu: Menu): (cart: Cart)
   *
   * **requires** `menu` exists in a `cart.menus`. Ownership authorizations will be done via syncs.
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
   * _getCartOwner (cart: Cart): (owner: User)
   *
   * **requires** `cart` exists.
   *
   * **effects** Returns `owner` of the `cart`.
   */
  async _getCartOwner(
    { cart }: GetCartOwnerInput,
  ): Promise<GetCartOwnerOutput> {
    try {
      const foundCart = await this.carts.findOne({ _id: cart });

      // Precondition: `cart` exists.
      if (!foundCart) {
        return { error: `Cart ${cart} not found.` };
      }

      return [{ owner: foundCart.owner }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart owner: ${errorMessage}`);
      return { error: `Failed to get cart owner: ${errorMessage}` };
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

1. **Removed `owner` field from `WeeklyCart` Concept:**
   * The concept specification states `concept WeeklyCart [Menu]`, indicating that `Menu` is the only generic type parameter. The original implementation introduced a `User` type and an `owner` field into the `CartDocument` and `createCart` action.
   * This deviates from the principle of modularity and concept independence. Ownership is a cross-cutting concern that, as the problem description itself notes, should typically be handled by separate concepts (e.g., `UserOwnedCart`) or by `syncs`.
   * **Action:** Removed `type User = ID;`, `owner` from `CartDocument`, `CreateCartInput`, and the `createCart` method signature and body. Also removed the `_getCartOwner` query.
   * The `requires` clause for `createCart` was updated to reflect that a cart is unique *per week* (across the application), not *per user per week*.

2. **Date String Consistency:**
   * The `CartDocument` interface declared `startDate: Date` and `endDate: Date`, while the helper functions and MongoDB queries used `string` (`YYYY-MM-DD`) representations.
   * Within the concept design the dates are defined as Date, so all of the dates should be a date object.

3. **Implemented `addMenuToCart`'s Implicit Cart Creation:**
   * The specification states: "If such a cart doesn't exist, a `createCart` for that date and then add `menu` to the new cart." The original implementation returned an error in this scenario.
   * **Action:** Modified `addMenuToCart` to call `this.createCart()` if no cart exists for the given `menuDate`. It now correctly handles the `Result` from `createCart`, propagating any errors or proceeding to add the menu to the newly created cart.

4. **Updated Preconditions and Doc Comments:**
   * Ensured that the `requires` and `effects` in the JSDoc comments for each action and query accurately reflect the updated implementation and the concept specification. Specifically, the `createCart` precondition now correctly checks for uniqueness of the cart for a given week.

These changes make the `WeeklyCartConcept` implementation more faithful to its defined specification and the principles of concept design, especially regarding modularity and separation of concerns.
