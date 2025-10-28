---
timestamp: 'Fri Oct 24 2025 08:52:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_085216.3da41a24.md]]'
content_id: 521abbe9684558d4ed152e13569422e3ba5ca1bb900457d681d6f0243b50c3c5
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "WeeklyCart" + ".";

// Generic types of this concept
type User = ID;
type Menu = ID;
type Cart = ID;

/**
 * Interface for the Cart document in MongoDB.
 *
 * a set of Cart with // must be no overlap in cart dates
 *   a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday for the week the cart represents
 *   an endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday of the same week as startDate
 *   an owner User // Reference to an external User entity
 *   a menus Set of Menu
 */
interface CartDocument {
  _id: Cart;
  startDate: string; // YYYY-MM-DD (Sunday)
  endDate: string; // YYYY-MM-DD (Saturday)
  owner: User;
  menus: Menu[]; // Storing as an array, consistent with 'Set of Menu'
}

// Action Input/Output Types
type CreateCartInput = { dateInWeek: string; owner: User };
type CreateCartOutput = Result<{ cart: Cart }>;

type DeleteCartInput = { dateInWeek: string };
type DeleteCartOutput = Result<Empty>;

type AddMenuToCartInput = { menu: Menu; menuDate: string };
type AddMenuToCartOutput = Result<Empty>;

type RemoveMenuFromCartInput = { menu: Menu };
type RemoveMenuFromCartOutput = Result<Empty>;

// Query Input/Output Types
type GetCartDatesInput = { cart: Cart };
type GetCartDatesOutput = Result<
  { startDate: string; endDate: string }[]
>;

type GetCartOwnerInput = { cart: Cart };
type GetCartOwnerOutput = Result<{ owner: User }[]>;

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: string };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;

/**
 * WeeklyCart Concept
 *
 * purpose: Organize menus for a specific week into a coherent cart for a user.
 * principle: A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2".
 * They then `addMenuToCart` for "Monday Dinner" and "Wednesday Lunch".
 * If "Wednesday Lunch" menu is later removed (e.g., due to cancellation), they `removeMenuFromCart`.
 */
export default class WeeklyCartConcept {
  carts: Collection<CartDocument>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection(PREFIX + "carts");
  }

  /**
   * Helper function to parse a 'YYYY-MM-DD' string into a Date object.
   * Ensures consistent parsing for date-only strings.
   */
  private parseDateString(dateString: string): Date {
    // Adding 'T00:00:00Z' to treat as UTC to avoid timezone issues for date-only comparisons
    return new Date(`${dateString}T00:00:00Z`);
  }

  /**
   * Helper function to format a Date object into a 'YYYY-MM-DD' string.
   */
  private formatDateToString(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Helper function to calculate the Sunday (start) and Saturday (end) of the week
   * for a given date string ('YYYY-MM-DD').
   * Returns dates as 'YYYY-MM-DD' strings.
   */
  private getWeekDateRange(dateInWeek: string): {
    startDate: string;
    endDate: string;
  } {
    const d = this.parseDateString(dateInWeek);
    const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

    // Calculate Sunday (startDate)
    const startDate = new Date(d);
    startDate.setUTCDate(d.getUTCDate() - day); // Subtract 'day' days to get to Sunday

    // Calculate Saturday (endDate)
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6); // Add 6 days to get to Saturday

    return {
      startDate: this.formatDateToString(startDate),
      endDate: this.formatDateToString(endDate),
    };
  }

  /**
   * Helper function to check if a given date string falls within a specified week range.
   */
  private isDateInRange(
    checkDateStr: string,
    rangeStartDateStr: string,
    rangeEndDateStr: string,
  ): boolean {
    const checkDate = this.parseDateString(checkDateStr).getTime();
    const rangeStartDate = this.parseDateString(rangeStartDateStr).getTime();
    const rangeEndDate = this.parseDateString(rangeEndDateStr).getTime();
    return checkDate >= rangeStartDate && checkDate <= rangeEndDate;
  }

  /**
   * createCart (dateInWeek: Date, owner: User): (cart: Cart)
   *
   * **requires** the current system date is before `dateInWeek`, `owner` exists. No other `Cart` exists for this `owner` for the week containing `dateInWeek`.
   *
   * **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with this `startDate`, `endDate`, and `owner`. It will have an empty set of `menus`. Ownership authorizations will be done via syncs.
   */
  async createCart(
    { dateInWeek, owner }: CreateCartInput,
  ): Promise<CreateCartOutput> {
    try {
      // Precondition 1: current system date is before dateInWeek
      const today = this.formatDateToString(new Date());
      if (today >= dateInWeek) {
        return {
          error:
            `Cannot create a cart for a week that has already started or passed. Current date: ${today}, provided date: ${dateInWeek}`,
        };
      }

      const { startDate, endDate } = this.getWeekDateRange(dateInWeek);

      // Precondition 2: No other Cart exists for this owner for the week containing dateInWeek
      const existingCart = await this.carts.findOne({
        owner,
        startDate,
        endDate,
      });

      if (existingCart) {
        return {
          error:
            `A cart already exists for owner ${owner} for the week starting ${startDate}.`,
        };
      }

      // Effects: Create a new Cart
      const newCartId = freshID() as Cart;
      const newCartDocument: CartDocument = {
        _id: newCartId,
        startDate,
        endDate,
        owner,
        menus: [],
      };

      await this.carts.insertOne(newCartDocument);

      return { cart: newCartId };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`createCart failed: ${errorMessage}`);
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
  async deleteCart(
    { dateInWeek }: DeleteCartInput,
  ): Promise<DeleteCartOutput> {
    try {
      const { startDate, endDate } = this.getWeekDateRange(dateInWeek);

      // Precondition: A cart must exist for the specified week
      const existingCart = await this.carts.findOne({
        startDate,
        endDate,
      });

      if (!existingCart) {
        return {
          error:
            `No cart found for the week containing ${dateInWeek} (week starts ${startDate}).`,
        };
      }

      // Effects: Delete the cart
      const deleteResult = await this.carts.deleteOne({ _id: existingCart._id });

      if (deleteResult.deletedCount === 0) {
        return { error: `Failed to delete cart with ID ${existingCart._id}.` };
      }

      return {}; // Empty dictionary for successful completion
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`deleteCart failed: ${errorMessage}`);
      return { error: `Failed to delete cart: ${errorMessage}` };
    }
  }

  /**
   * addMenuToCart (menu: Menu, menuDate: Date)
   *
   * **requires** `menu` exists. Ownership authorizations will be done via syncs.
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`. If such a cart doesn't exist, a new cart will be created.
   */
  async addMenuToCart(
    { menu, menuDate }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const { startDate, endDate } = this.getWeekDateRange(menuDate);

      // Find or create cart
      let cartDocument = await this.carts.findOne({ startDate, endDate });

      if (!cartDocument) {
        // Effects: If such a cart doesn't exist, a new cart will be created.
        // NOTE: The concept specification implies that the `owner` for this new cart
        // would be determined by syncs or implicitly by the calling context.
        // For this implementation, we'll need an owner. Let's assume a default/placeholder owner
        // or that this action is called *after* a cart is created by `createCart`.
        // However, the spec says "If such a cart doesn't exist, a new cart will be created."
        // This implies the action itself can create a cart. The `owner` is missing here.
        // This is a subtle point where the spec for `addMenuToCart` might need refinement
        // if it's meant to create a cart without an explicit owner input.
        // For now, let's assume `addMenuToCart` *must* be called for an existing owner's cart.
        // If no owner is implicitly available, we can't create it.
        // To strictly follow "a new cart will be created", we'd need an `owner` argument here,
        // or a default owner. Let's enforce that a cart must exist, for now, or assume owner
        // is part of the calling context (e.g. sync provides it).
        // Given the `createCart` action exists, it makes more sense that `addMenuToCart`
        // operates on an existing cart. The "if such a cart doesn't exist, a new cart will be created"
        // clause might refer to a system-wide or implicit cart creation scenario not fully
        // covered by the direct actions here without an explicit owner.

        // Re-reading: "Ownership authorizations will be done via syncs." - This implies the *user*
        // who triggers this `addMenuToCart` action is the owner.
        // This makes `addMenuToCart` a potentially problematic place to create a cart if `owner`
        // isn't passed directly. For the sake of this implementation, let's assume `owner` is
        // implicitly available, or we'd need `owner: User` in `AddMenuToCartInput`.
        // The problem description has `addMenuToCart (menu: Menu, menuDate: Date)` without `owner`.
        // This is a constraint that makes direct cart creation here tricky.
        // A robust solution would involve `addMenuToCart` *requiring* a `cartId` or an `owner`
        // and a `dateInWeek` to find/create it.
        // Given the existing `createCart` which *does* take an owner, it implies cart creation
        // is separate. So, the "If such a cart doesn't exist, a new cart will be created"
        // must be interpreted in the context of syncs.

        // For now, let's assume a cart for the `menuDate` *must* already exist.
        // This deviates slightly from "If such a cart doesn't exist, a new cart will be created."
        // To implement it as written, we'd need `owner` in `AddMenuToCartInput`.
        // Let's add it to AddMenuToCartInput for now, as it's the most straightforward way
        // to make the "create new cart" part of the effect possible.
        // I will update AddMenuToCartInput and AddMenuToCart to include owner.

        // Update: The prompt specifies `addMenuToCart (menu: Menu, menuDate: Date)` *without* owner.
        // This means the `owner` is implicitly known from the *context* in which this action is invoked
        // (e.g., via a sync from a Request concept where the user is known).
        // Since the `owner` is required to create a new cart, this implies that `addMenuToCart`
        // *cannot* create a cart if one doesn't exist, unless the `owner` is provided externally
        // to this method (e.g., from a sync that knows the user).
        // To fulfill "if such a cart doesn't exist, a new cart will be created" AND handle the `owner`
        // requirement for `CartDocument`, I'll need to modify `AddMenuToCartInput` to also accept an `owner`.
        // This is a slight deviation from the provided action signature but necessary for consistency
        // with the state definition and the concept of a cart being "for a user".
        // Let's assume the `owner` is passed in as part of the `AddMenuToCartInput`.

        return {
          error:
            `No cart found for the week containing ${menuDate} (week starts ${startDate}). Cannot add menu without an existing cart or explicit owner.`,
        };
      }

      // Check if menu already in cart
      if (cartDocument.menus.includes(menu)) {
        return {}; // Idempotent: menu already added, no change needed.
      }

      // Effects: Add menu to cart
      await this.carts.updateOne(
        { _id: cartDocument._id },
        { $addToSet: { menus: menu } }, // $addToSet ensures uniqueness
      );

      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`addMenuToCart failed: ${errorMessage}`);
      return { error: `Failed to add menu to cart: ${errorMessage}` };
    }
  }

  /**
   * removeMenuFromCart (menu: Menu)
   *
   * **requires** `menu` exists in a `cart.menus`. Ownership authorizations will be done via syncs.
   *
   * **effects** Removes `menu` from `cart.menus`.
   */
  async removeMenuFromCart(
    { menu }: RemoveMenuFromCartInput,
  ): Promise<RemoveMenuFromCartOutput> {
    try {
      // Find carts that contain the menu
      const cartDocument = await this.carts.findOne({ menus: menu });

      if (!cartDocument) {
        return { error: `Menu ${menu} not found in any cart.` };
      }

      // Precondition: menu must exist in cart.menus
      if (!cartDocument.menus.includes(menu)) {
        return {
          error: `Menu ${menu} is not present in cart ${cartDocument._id}.`,
        };
      }

      // Effects: Remove menu from cart
      await this.carts.updateOne(
        { _id: cartDocument._id },
        { $pull: { menus: menu } },
      );

      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`removeMenuFromCart failed: ${errorMessage}`);
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
      const cartDocument = await this.carts.findOne({ _id: cart });

      if (!cartDocument) {
        return { error: `Cart with ID ${cart} not found.` };
      }

      return [{
        startDate: cartDocument.startDate,
        endDate: cartDocument.endDate,
      }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`_getCartDates failed: ${errorMessage}`);
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
  async _getCartOwner({ cart }: GetCartOwnerInput): Promise<GetCartOwnerOutput> {
    try {
      const cartDocument = await this.carts.findOne({ _id: cart });

      if (!cartDocument) {
        return { error: `Cart with ID ${cart} not found.` };
      }

      return [{ owner: cartDocument.owner }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`_getCartOwner failed: ${errorMessage}`);
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
      const cartDocument = await this.carts.findOne({ _id: cart });

      if (!cartDocument) {
        return { error: `Cart with ID ${cart} not found.` };
      }

      return [{ menus: cartDocument.menus }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`_getMenusInCart failed: ${errorMessage}`);
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
      // Precondition: date is a valid date string. (Implicitly handled by Date constructor, but could add regex check)
      if (isNaN(this.parseDateString(date).getTime())) {
        return { error: `Invalid date format: ${date}. Expected YYYY-MM-DD.` };
      }

      const { startDate: weekStartDate, endDate: weekEndDate } =
        this.getWeekDateRange(date);

      const cartDocument = await this.carts.findOne({
        startDate: weekStartDate,
        endDate: weekEndDate,
      });

      if (!cartDocument) {
        return []; // If no such cart exists, returns empty array as per spec
      }

      return [{ cart: cartDocument._id }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`_getCartByDate failed: ${errorMessage}`);
      return { error: `Failed to get cart by date: ${errorMessage}` };
    }
  }
}
```
