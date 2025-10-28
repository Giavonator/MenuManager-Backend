---
timestamp: 'Fri Oct 24 2025 08:48:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_084825.0c22db15.md]]'
content_id: 354e12dbda69a0549c16935a2d67b640268b238ee0f4ab93892a391ca2ccfa60
---

# response:

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "WeeklyCart" + ".";

// Generic types of this concept
type User = ID;
type Menu = ID;
type Cart = ID;

// --- Helper Functions for Date Logic ---
/**
 * Calculates the start (Sunday) and end (Saturday) dates of the week
 * containing the given date. Dates are returned as 'YYYY-MM-DD' strings.
 * All calculations are done in UTC to avoid timezone issues.
 */
function getWeekBounds(date: Date): { startDate: string; endDate: string } {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

  const dayOfWeek = d.getUTCDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

  // Calculate Sunday (start of week)
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - dayOfWeek);

  // Calculate Saturday (end of week)
  const saturday = new Date(d);
  saturday.setUTCDate(d.getUTCDate() + (6 - dayOfWeek));

  // Format dates as YYYY-MM-DD string
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    startDate: formatDate(sunday),
    endDate: formatDate(saturday),
  };
}

/**
 * Converts a Date object to a 'YYYY-MM-DD' string format, representing only the date in UTC.
 */
function toYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a 'YYYY-MM-DD' string into a Date object, representing the date in UTC.
 */
function parseYYYYMMDD(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
// --- End Helper Functions ---


// --- Input/Output Types for Actions ---
type CreateCartInput = { dateInWeek: Date; owner: User };
type CreateCartOutput = Result<{ cart: Cart }>;

// Added owner to deleteCart for robust filtering; syncs would manage authorization.
type DeleteCartInput = { dateInWeek: Date; owner: User };
type DeleteCartOutput = Result<{ cart: Cart }>;

// Added owner to addMenuToCart input as a cart might need to be created if it doesn't exist.
type AddMenuToCartInput = { menu: Menu; menuDate: Date; owner: User };
type AddMenuToCartOutput = Result<Empty>;

// Added owner to removeMenuFromCart for robust filtering; syncs would manage authorization.
type RemoveMenuFromCartInput = { menu: Menu; owner: User };
type RemoveMenuFromCartOutput = Result<Empty>;
// --- End Input/Output Types for Actions ---


// --- Input/Output Types for Queries ---
type GetCartDatesInput = { cart: Cart };
// Dates returned as strings as per 'YYYY-MM-DD' format spec.
type GetCartDatesOutput = Result<{ startDate: string; endDate: string }[]>;

type GetCartOwnerInput = { cart: Cart };
type GetCartOwnerOutput = Result<{ owner: User }[]>;

type GetMenusInCartInput = { cart: Cart };
// Set of Menu is represented as Menu[] in TypeScript/JSON.
type GetMenusInCartOutput = Result<{ menus: Menu[] }[]>;

type GetCartByDateInput = { date: Date };
type GetCartByDateOutput = Result<{ cart: Cart }[]>;
// --- End Input/Output Types for Queries ---


// --- State Interfaces ---
/**
 * A concept for organizing menus for a specific week into a coherent cart for a user.
 *
 * `CartDocument` represents a single cart in the database.
 *   - `_id`: The unique identifier for the cart (type `Cart`).
 *   - `startDate`: The start date (Sunday) of the week the cart represents, in 'YYYY-MM-DD' format.
 *   - `endDate`: The end date (Saturday) of the week the cart represents, in 'YYYY-MM-DD' format.
 *   - `owner`: Reference to an external User entity (type `User`).
 *   - `menus`: An array of Menu IDs associated with this cart (type `Menu[]`).
 */
interface CartDocument {
  _id: Cart;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  owner: User;
  menus: Menu[];
}
// --- End State Interfaces ---


export default class WeeklyCartConcept {
  private carts: Collection<CartDocument>;

  constructor(private readonly db: Db) {
    this.carts = this.db.collection(PREFIX + "carts");
  }

  // --- Actions ---

  /**
   * createCart (dateInWeek: Date, owner: User): (cart: Cart)
   *
   * **purpose** Organize menus for a specific week into a coherent cart for a user.
   *
   * **principle** A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2".
   *
   * **requires**
   *   1. The current system date is before `dateInWeek`.
   *   2. `owner` exists (i.e., is a valid ID).
   *   3. No other `Cart` exists for this `owner` for the week containing `dateInWeek`.
   *
   * **effects**
   *   1. Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week.
   *   2. Creates a new `Cart` with this `startDate`, `endDate`, and `owner`.
   *   3. The new cart will have an empty set of `menus`.
   *   4. Returns the ID of the newly created `cart`.
   */
  async createCart({ dateInWeek, owner }: CreateCartInput): Promise<CreateCartOutput> {
    try {
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0); // Normalize current date to UTC midnight for comparison
      const providedDateInWeek = new Date(dateInWeek);
      providedDateInWeek.setUTCHours(0, 0, 0, 0); // Normalize input date

      // **requires** the current system date is before `dateInWeek`
      if (currentDate.getTime() >= providedDateInWeek.getTime()) {
        return { error: "Cannot create a cart for a week that has already started or passed." };
      }

      // **requires** `owner` exists. (Assumed as ID type, just check it's not null/undefined/empty string)
      if (!owner) {
        return { error: "Owner ID must be provided." };
      }

      const { startDate, endDate } = getWeekBounds(dateInWeek);

      // **requires** No other `Cart` exists for this `owner` for the week containing `dateInWeek`.
      const existingCart = await this.carts.findOne({ owner, startDate, endDate });
      if (existingCart) {
        return { error: `A cart already exists for owner '${owner}' for the week ${startDate} - ${endDate}.` };
      }

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
      console.error(`Error creating cart: ${errorMessage}`);
      return { error: `Failed to create cart: ${errorMessage}` };
    }
  }

  /**
   * deleteCart (dateInWeek: Date, owner: User): (cart: Cart)
   *
   * **requires**
   *   1. There exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.
   *   2. The found cart belongs to the specified `owner`.
   *
   * **effects** Deletes the matching `cart` and returns its ID.
   */
  async deleteCart({ dateInWeek, owner }: DeleteCartInput): Promise<DeleteCartOutput> {
    try {
      if (!owner) {
        return { error: "Owner ID must be provided for deleting a cart." };
      }

      const { startDate, endDate } = getWeekBounds(dateInWeek);

      // Find and delete the cart belonging to the owner for the specified week
      const filter = { owner, startDate, endDate };
      const deletedCart = await this.carts.findOneAndDelete(filter);

      if (!deletedCart.value) {
        // If not found, check if a cart exists for the week but with a different owner
        const existingCartForWeek = await this.carts.findOne({ startDate, endDate });
        if (existingCartForWeek) {
          return { error: `No cart found for owner '${owner}' for the week ${startDate} - ${endDate}. (Cart exists for a different owner: '${existingCartForWeek.owner}'.)` };
        }
        return { error: `No cart found for the week ${startDate} - ${endDate} for owner '${owner}'.` };
      }

      return { cart: deletedCart.value._id };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error deleting cart: ${errorMessage}`);
      return { error: `Failed to delete cart: ${errorMessage}` };
    }
  }

  /**
   * addMenuToCart (menu: Menu, menuDate: Date, owner: User)
   *
   * **principle** ... They then `addMenuToCart` for "Monday Dinner" and "Wednesday Lunch".
   *
   * **requires** `menu` exists (i.e., is a valid ID).
   *
   * **effects**
   *   1. Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate` and belongs to `owner`.
   *   2. If no such cart exists, a new cart will be created for the `owner` for that week before adding the menu.
   *   3. If the menu is already in the cart, no change occurs.
   */
  async addMenuToCart({ menu, menuDate, owner }: AddMenuToCartInput): Promise<AddMenuToCartOutput> {
    try {
      // **requires** `menu` exists. (Assumed as ID type, just check it's not null/undefined/empty string)
      if (!menu) {
        return { error: "Menu ID must be provided." };
      }
      if (!owner) {
        return { error: "Owner ID must be provided." };
      }

      const { startDate, endDate } = getWeekBounds(menuDate);

      let cartDocument = await this.carts.findOne({ owner, startDate, endDate });

      if (!cartDocument) {
        // If such a cart doesn't exist, a new cart will be created.
        const newCartId = freshID() as Cart;
        cartDocument = {
          _id: newCartId,
          startDate,
          endDate,
          owner,
          menus: [],
        };
        await this.carts.insertOne(cartDocument);
      }

      // **effects** Adds `menu` to `cart`...
      if (!cartDocument.menus.includes(menu)) {
        await this.carts.updateOne(
          { _id: cartDocument._id },
          { $addToSet: { menus: menu } } // $addToSet ensures uniqueness and atomic update
        );
      }
      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error adding menu to cart: ${errorMessage}`);
      return { error: `Failed to add menu to cart: ${errorMessage}` };
    }
  }

  /**
   * removeMenuFromCart (menu: Menu, owner: User)
   *
   * **principle** ... If "Wednesday Lunch" menu is later removed (e.g., due to cancellation), they `removeMenuFromCart`.
   *
   * **requires** `menu` exists in a `cart.menus` owned by the specified `owner`.
   *
   * **effects** Removes `menu` from the `menus` set of the relevant cart.
   */
  async removeMenuFromCart({ menu, owner }: RemoveMenuFromCartInput): Promise<RemoveMenuFromCartOutput> {
    try {
      if (!menu) {
        return { error: "Menu ID must be provided." };
      }
      if (!owner) {
        return { error: "Owner ID must be provided." };
      }

      // Find a cart by owner that contains the menu and remove it
      const result = await this.carts.updateOne(
        { owner, menus: menu },
        { $pull: { menus: menu } }
      );

      if (result.matchedCount === 0) {
        return { error: `No cart found for owner '${owner}' containing menu '${menu}'.` };
      }

      return {}; // Empty dictionary for successful completion
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error removing menu from cart: ${errorMessage}`);
      return { error: `Failed to remove menu from cart: ${errorMessage}` };
    }
  }

  // --- Queries ---

  /**
   * _getCartDates (cart: Cart): (startDate: Date, endDate: Date)
   *
   * **requires** `cart` exists.
   *
   * **effects** Returns `cart` `startDate` and `endDate` as 'YYYY-MM-DD' strings.
   */
  async _getCartDates({ cart }: GetCartDatesInput): Promise<GetCartDatesOutput> {
    try {
      const cartDocument = await this.carts.findOne({ _id: cart });
      if (!cartDocument) {
        return { error: `Cart with ID '${cart}' not found.` };
      }
      return [{ startDate: cartDocument.startDate, endDate: cartDocument.endDate }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart dates for cart '${cart}': ${errorMessage}`);
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
        return { error: `Cart with ID '${cart}' not found.` };
      }
      return [{ owner: cartDocument.owner }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart owner for cart '${cart}': ${errorMessage}`);
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
  async _getMenusInCart({ cart }: GetMenusInCartInput): Promise<GetMenusInCartOutput> {
    try {
      const cartDocument = await this.carts.findOne({ _id: cart });
      if (!cartDocument) {
        return { error: `Cart with ID '${cart}' not found.` };
      }
      return [{ menus: cartDocument.menus }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting menus in cart for cart '${cart}': ${errorMessage}`);
      return { error: `Failed to get menus in cart: ${errorMessage}` };
    }
  }

  /**
   * _getCartByDate (date: Date): (cart: Cart)
   *
   * **requires** `date` is a valid date.
   *
   * **effects** Returns the `cart` ID that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists, returns an empty array.
   */
  async _getCartByDate({ date }: GetCartByDateInput): Promise<GetCartByDateOutput> {
    try {
      // Input `date` is a Date object, calculate its week bounds.
      const { startDate, endDate } = getWeekBounds(date); 
      // Find cart where its startDate and endDate match the calculated week.
      const cartDocument = await this.carts.findOne({ startDate, endDate }); 

      if (!cartDocument) {
        return []; // As per spec, "If no such cart exists returns empty."
      }
      return [{ cart: cartDocument._id }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting cart by date '${toYYYYMMDD(date)}': ${errorMessage}`);
      return { error: `Failed to get cart by date: ${errorMessage}` };
    }
  }
}
```
