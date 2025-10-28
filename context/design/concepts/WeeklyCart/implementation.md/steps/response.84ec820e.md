---
timestamp: 'Mon Oct 27 2025 14:13:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_141323.b47f290e.md]]'
content_id: 84ec820e50c36395ea8137278f5a91584426c44dcf993c59e10cf82b82aaef73
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
type Cart = ID; // The concept itself also introduces a Cart ID

/**
 * Helper functions for date calculations, ensuring YYYY-MM-DD format.
 * All dates are treated as UTC to avoid timezone issues affecting day calculations.
 * The `WeeklyCart` concept explicitly asks for 'YYYY-MM-DD' date-only strings,
 * which is represented by `string` in TypeScript for `startDate` and `endDate`
 * within the `CartDocument` to prevent time component issues with MongoDB's Date type.
 */
function formatDate(date: Date): string {
  // Returns 'YYYY-MM-DD' from a Date object in UTC
  return date.toISOString().split("T")[0];
}

function parseDate(dateString: string): Date {
  // Parses 'YYYY-MM-DD' string into a UTC Date object (at midnight UTC)
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

type AddMenuToCartInput = { menu: Menu; menuDate: string; owner: User };
type AddMenuToCartOutput = Result<{ cart: Cart }>;

type RemoveMenuFromCartInput = { menu: Menu; owner: User };
type RemoveMenuFromCartOutput = Result<{ cart: Cart }>;

// Input and Output types for queries
type GetCartDatesInput = { cart: Cart };
type GetCartDatesOutput = Result<{ startDate: string; endDate: string }[]>;

type GetCartOwnerInput = { cart: Cart };
type GetCartOwnerOutput = Result<{ owner: User }[]>;

type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: string; owner: User };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;

/**
 * a set of Cart with
 *   a startDate string // 'YYYY-MM-DD', always a Sunday for the week
 *   an endDate string // 'YYYY-MM-DD', always a Saturday of the same week
 *   an owner User // The user who owns this cart
 *   a menus Set of Menu // Set of Menu IDs
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
 * They then `addMenuToCart` for "Monday Spaghetti", "Wednesday Pizza", and "Friday Tacos" enabling a comprehensive grouping of the week's meals.
 * User can then `removeMenuFromCart` "Wednesday Pizza" when they decide it is not needed anymore.
 */
export default class WeeklyCartConcept {
  carts: Collection<CartDocument>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection(PREFIX + "carts");
  }

  /**
   * createCart (dateInWeek: string, owner: User): (cart: Cart)
   *
   * **requires** The current system date is before `dateInWeek`. `owner` exists. No other `Cart` exists for this `owner` for the week containing `dateInWeek`.
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
   * deleteCart (dateInWeek: string, owner: User): (cart: Cart)
   *
   * **requires** There exists a cart for `owner` whose `startDate` and `endDate` range *contains* `dateInWeek`. Ownership authorizations will be done via syncs.
   *
   * **effects** Deletes `cart`.
   */
  async deleteCart(
    { dateInWeek, owner }: DeleteCartInput,
  ): Promise<DeleteCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(dateInWeek);

      // Precondition: there exists a cart for `owner` whose `startDate` and `endDate` range *contains* `dateInWeek`.
      const cartToDelete = await this.carts.findOne({
        owner: owner,
        startDate: startDate,
        endDate: endDate,
      });

      if (!cartToDelete) {
        return {
          error:
            `No cart found for owner ${owner} for the week containing ${dateInWeek}.`,
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
   * addMenuToCart (menu: Menu, menuDate: string, owner: User): (cart: Cart)
   *
   * **requires** `menu` exists. `owner` exists. Ownership authorizations will be done via syncs.
   *
   * **effects** Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate` and is owned by `owner`.
   * If such a cart for `owner` doesn't exist, a `createCart` for that `menuDate` and `owner` is called,
   * and then `menu` is added to the new cart.
   * Returns `cart` menu was added to.
   */
  async addMenuToCart(
    { menu, menuDate, owner }: AddMenuToCartInput,
  ): Promise<AddMenuToCartOutput> {
    try {
      const { startDate, endDate } = getWeekStartAndEndDate(menuDate);

      // Find existing cart for the owner and week
      let targetCart = await this.carts.findOne({ owner, startDate, endDate });

      // Effect: If such a cart doesn't exist for the owner, createCart for that date and owner.
      if (!targetCart) {
        console.log(
          `No cart found for owner ${owner} for week of ${menuDate}. Creating a new one.`,
        );
        const createCartResult = await this.createCart({
          dateInWeek: menuDate,
          owner: owner,
        });

        if (createCartResult.error) {
          return {
            error:
              `Failed to implicitly create cart for owner ${owner}: ${createCartResult.error}`,
          };
        }
        // Retrieve the newly created cart to proceed
        targetCart = await this.carts.findOne({
          _id: createCartResult.cart,
        });
        if (!targetCart) {
          // This should ideally not happen if createCart succeeded
          return { error: "Failed to retrieve newly created cart." };
        }
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
   * removeMenuFromCart (menu: Menu, owner: User): (cart: Cart)
   *
   * **requires** `menu` exists in a `cart.menus` owned by `owner`. Ownership authorizations will be done via syncs.
   *
   * **effects** Removes `menu` from `cart.menus` of the cart owned by `owner`. Returns `cart` that menu was removed from.
   */
  async removeMenuFromCart(
    { menu, owner }: RemoveMenuFromCartInput,
  ): Promise<RemoveMenuFromCartOutput> {
    try {
      // Find the cart owned by `owner` that contains this menu
      const targetCart = await this.carts.findOne({ owner: owner, menus: menu });

      // Precondition: `menu` exists in a `cart.menus` owned by `owner`.
      if (!targetCart) {
        return { error: `Menu ${menu} not found in any cart for owner ${owner}.` };
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
   * _getCartDates (cart: Cart): (startDate: string, endDate: string)
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
   * _getCartByDate (date: string, owner: User): (cart: Cart)
   *
   * **requires** `date` is a valid date string. `owner` exists.
   *
   * **effects** Returns the `cart` for `owner` that contains `date` between `cart.startDate` and `cart.endDate`.
   * If no such cart exists returns empty array.
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
