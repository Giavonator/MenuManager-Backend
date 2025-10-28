---
timestamp: 'Fri Oct 24 2025 09:01:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_090150.87d05b20.md]]'
content_id: 34adea34c7bce95bd0643acd1fc9c1f80ed15403fc882771b6d122b053bf8e89
---

# response:

The provided `WeeklyCart` concept specification presents some ambiguities and internal inconsistencies, particularly regarding the `owner` of a cart and the `addMenuToCart` action's implicit cart creation behavior. To align the implementation with the principles of concept design (especially "Completeness of functionality" and "Concept Independence") and to make it logically consistent, I've made the following clarifications and modifications:

1. **Concept State for `Cart`:** The `Cart` in the state description was updated to explicitly include `an owner User` to reflect its usage in `createCart` and to ensure per-user cart uniqueness.
2. **`createCart` Action Signature:** The `createCart` action in the concept spec should explicitly take an `owner` as an input argument: `createCart (dateInWeek: Date, owner: User): (cart: Cart)`. The implementation already handled this correctly.
3. **`createCart` Precondition:** Clarified the precondition to state that no other `Cart` exists *for this owner* for the given week, ensuring per-user uniqueness. The implementation already adhered to this.
4. **`addMenuToCart` Action Signature and Behavior:**
   * The original spec stated that `addMenuToCart` should implicitly create a cart if one doesn't exist, but it didn't provide an `owner` argument, which `createCart` requires.
   * To maintain "Completeness of functionality," `addMenuToCart` was updated in the implementation to *also accept an `owner`* argument. This allows it to fulfill its specified effect of implicitly creating a cart by calling `createCart` when necessary.
   * **Note:** This implies a necessary modification to the `addMenuToCart` action's signature in the concept specification to `addMenuToCart (menu: Menu, menuDate: Date, owner: User): (cart: Cart)`.
5. **`deleteCart` Action Signature:** To ensure clarity and consistency with per-user carts, `deleteCart` was updated to *also accept an `owner`* argument, allowing it to specifically delete a cart belonging to that owner.
   * **Note:** This implies a necessary modification to the `deleteCart` action's signature in the concept specification to `deleteCart (dateInWeek: Date, owner: User): (cart: Cart)`.
6. **`_getCartOwner` Query:** This useful query, already present in the implementation, was added to the concept specification.
7. **`_getCartByDate` Query Signature:** For consistency with per-user carts, `_getCartByDate` was updated to *also accept an `owner`* argument.
   * **Note:** This implies a necessary modification to the `_getCartByDate` query's signature in the concept specification to `_getCartByDate (date: Date, owner: User): (cart: Cart)`.
8. **Documentation:** All JSDoc comments were updated to reflect these changes and ensure they accurately describe the action/query signatures, requirements, and effects, following the specified format.

Here's the updated `WeeklyCartConcept.ts` file:

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

type DeleteCartInput = { dateInWeek: string; owner: User };
type DeleteCartOutput = Result<{ cart: Cart }>;

type AddMenuToCartInput = { menu: Menu; menuDate: string; owner: User }; // Added owner
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

type GetCartByDateInput = { date: string; owner: User }; // Added owner
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
  startDate: string; // YYYY-MM-DD, always a Sunday
  endDate: string; // YYYY-MM-DD, always a Saturday
  owner: User;
  menus: Menu[];
}

/**
 * **concept** WeeklyCart [Menu]
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
   * deleteCart (dateInWeek: Date, owner: User): (cart: Cart)
   *
   * **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek` and belongs to `owner`.
   * Ownership authorizations will be done via syncs.
   *
   * **effects** Deletes `cart`. Returns the `cart` that was deleted.
   */
  async deleteCart({ dateInWeek, owner }: DeleteCartInput): Promise<DeleteCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(dateInWeek);

      // Precondition: there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek` and belongs to `owner`.
      const cartToDelete = await this.carts.findOne({
        owner: owner,
        startDate: startDate,
        endDate: endDate,
      });

      if (!cartToDelete) {
        return {
          error: `No cart found for owner ${owner} for the week containing ${dateInWeek}.`,
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
   * addMenuToCart (menu: Menu, menuDate: Date, owner: User): (cart: Cart)
   *
   * **requires** `menu` exists. Ownership authorizations will be done via syncs.
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate` and belongs to `owner`.
   * If such a cart doesn't exist for the `owner` and `menuDate`'s week, a new `Cart` is created for that `owner` and week, and then `menu` is added.
   * Returns `cart` menu was added to.
   */
  async addMenuToCart(
    { menu, menuDate, owner }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(menuDate);

      let targetCart = await this.carts.findOne({ owner, startDate, endDate });

      // Effect: If such a cart doesn't exist, createCart for that date and owner
      if (!targetCart) {
        // Call createCart internally. This is robust as createCart has its own preconditions.
        const createResult = await this.createCart({ dateInWeek: menuDate, owner });
        if (createResult.error) {
          // If createCart fails, propagate the error
          return { error: `Failed to implicitly create cart: ${createResult.error}` };
        }
        // Retrieve the newly created cart (should always succeed if createResult.cart is present)
        targetCart = await this.carts.findOne({ _id: createResult.cart });
        if (!targetCart) { 
          // This case should ideally not be reached if createCart was successful
          return { error: "Failed to retrieve newly created cart after implicit creation." };
        }
      }

      // Ensure menu is not already in the cart (idempotent add, but returning error for explicit add attempt)
      if (targetCart.menus.includes(menu)) {
        return { error: `Menu ${menu} is already in cart ${targetCart._id}.` };
      }

      // Add menu and update
      await this.carts.updateOne(
        { _id: targetCart._id },
        { $addToSet: { menus: menu } }, // $addToSet naturally prevents duplicates
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
      // Find the cart that contains this menu. This operation does not specify `owner`,
      // implying it finds the menu in *any* cart. If carts are strictly per-owner,
      // a sync or prior action would filter for the relevant owner's cart.
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
   * _getCartByDate (date: Date, owner: User): (cart: Cart)
   *
   * **requires** `date` is a valid date, `owner` exists.
   *
   * **effects** Returns the `cart` for `owner` that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.
   */
  async _getCartByDate(
    { date, owner }: GetCartByDateInput,
  ): Promise<GetCartByDateOutput> {
    try {
      // Precondition: `date` is a valid date string (implicitly handled by parseDate/getWeekStartAndEndDate)
      const { startDate, endDate } = getWeekStartAndEndDate(date);

      const foundCart = await this.carts.findOne({
        owner: owner,
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
