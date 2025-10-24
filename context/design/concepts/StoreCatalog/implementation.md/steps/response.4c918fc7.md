---
timestamp: 'Thu Oct 23 2025 19:04:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_190406.78e809e8.md]]'
content_id: 4c918fc72f7b374e25e54e00d65a34496d67341ecd13a4ef3c94ab0bc9aad2e2
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "StoreCatalog" + ".";

// Generic types of this concept
type Item = ID;
type PurchaseOption = ID;
type AtomicOrder = ID; // From Concept Spec state
type SelectOrder = ID; // From Concept Spec state

// --- Action Input/Output Types ---

// createItem (primaryName: String): (item: Item)
type CreateItemInput = { primaryName: string };
type CreateItemOutput = Result<{ item: Item }>;

// deleteItem (item: Item)
type DeleteItemInput = { item: Item };
type DeleteItemOutput = Result<Empty>;

// addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
type AddPurchaseOptionInput = {
  item: Item;
  quantity: number;
  units: string;
  price: number;
  store: string;
};
type AddPurchaseOptionOutput = Result<{ purchaseOption: PurchaseOption }>;

// updatePurchaseOption (purchaseOption: PurchaseOption, ...)
type UpdatePurchaseOptionInput =
  & { purchaseOption: PurchaseOption }
  & (
    | { quantity: number }
    | { units: string }
    | { price: number }
    | { store: string }
    | { atomicOrder: AtomicOrder } // Corresponding to purchase AtomicOrder in state
  );
type UpdatePurchaseOptionOutput = Result<Empty>;

// removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
type RemovePurchaseOptionInput = { item: Item; purchaseOption: PurchaseOption };
type RemovePurchaseOptionOutput = Result<Empty>;

// addItemName (item: Item, name: String)
type AddItemNameInput = { item: Item; name: string };
type AddItemNameOutput = Result<Empty>;

// removeItemName (item: Item, name: String)
type RemoveItemNameInput = { item: Item; name: string };
type RemoveItemNameOutput = Result<Empty>;

// confirmPurchaseOption (purchaseOption: PurchaseOption)
type ConfirmPurchaseOptionInput = { purchaseOption: PurchaseOption };
type ConfirmPurchaseOptionOutput = Result<Empty>;

// Add action to set atomicOrder on PurchaseOption (derived from state structure)
// This action was found in the provided implementation but not explicitly in the spec's actions list.
type AddPurchaseOptionOrderInput = {
  purchaseOption: PurchaseOption;
  atomicOrder: AtomicOrder;
};
type AddPurchaseOptionOrderOutput = Result<Empty>;

// Add action to set selectOrder on Item (derived from state structure)
// This action was found in the provided implementation but not explicitly in the spec's actions list.
type AddItemOrderInput = { item: Item; selectOrder: SelectOrder };
type AddItemOrderOutput = Result<Empty>;

// --- Query Input/Output Types ---
// Queries always return an array of results or an array of error objects, as per "Inputs/Outputs Specification".

// _getItemByName (name: String): (item: Item)
type GetItemByNameInput = { name: string };
type GetItemByNameOutput = Result<{ item: Item }[]>;

// _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
type GetItemByPurchaseOptionInput = { purchaseOption: PurchaseOption };
type GetItemByPurchaseOptionOutput = Result<{ item: Item }[]>;

// _getItemNames (item: Item): (names: Set of String)
type GetItemNamesInput = { item: Item };
type GetItemNamesOutput = Result<{ names: string[] }[]>;

// _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
type GetItemPurchaseOptionsInput = { item: Item };
type GetItemPurchaseOptionsOutput = Result<{ purchaseOptions: PurchaseOption[] }[]>;

// _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
type GetPurchaseOptionDetailsInput = { purchaseOption: PurchaseOption };
type GetPurchaseOptionDetailsOutput = Result<
  {
    quantity: number;
    units: string;
    price: number;
    store: string;
    confirmed: boolean;
  }[]
>;

// _getAllItems (): (items: Set of Item)
type GetAllItemsInput = Empty;
type GetAllItemsOutput = Result<{ items: Item[] }[]>;

/**
 * a set of Item with
 *   a names Set of String
 *   a purchaseOptions Set of PurchaseOption
 *   a purchase SelectOrder
 */
interface ItemDoc {
  _id: Item;
  names: string[];
  purchaseOptions: PurchaseOption[];
  selectOrderId?: SelectOrder;
}

/**
 * a set of PurchaseOption with
 *   a store String
 *   a quantity Float
 *   a units String
 *   a price Float
 *   a confirmed Bool
 *   a purchase AtomicOrder
 */
interface PurchaseOptionDoc {
  _id: PurchaseOption;
  itemId: Item;
  store: string;
  quantity: number;
  units: string;
  price: number;
  confirmed: boolean;
  atomicOrderId?: AtomicOrder;
}

export default class StoreCatalogConcept {
  items: Collection<ItemDoc>;
  purchaseOptions: Collection<PurchaseOptionDoc>;

  constructor(private readonly db: Db) {
    this.items = this.db.collection(PREFIX + "items");
    this.purchaseOptions = this.db.collection(PREFIX + "purchaseOptions");
  }

  /**
   * createItem (primaryName: String): (item: Item)
   * **requires** no Item already exists with `primaryName` in its names set.
   * **effects** Creates a new `Item` with `primaryName` in its `names` set and an empty `purchaseOptions` set. Returns the new `Item` ID.
   */
  async createItem(input: CreateItemInput): Promise<CreateItemOutput> {
    const { primaryName } = input;
    const existingItem = await this.items.findOne({ names: primaryName });
    if (existingItem) {
      return {
        error: `An item with the name "${primaryName}" already exists.`,
      };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [primaryName],
      purchaseOptions: [], // Initialize empty
      // selectOrderId is optional, not set on creation
    };

    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * deleteItem (item: Item)
   * **requires** `item` exists.
   * **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.
   */
  async deleteItem(input: DeleteItemInput): Promise<DeleteItemOutput> {
    const { item } = input;
    const result = await this.items.deleteOne({ _id: item });
    if (result.deletedCount === 0) {
      return { error: `Item with ID "${item}" not found.` };
    }

    // Delete associated purchase options from their own collection
    await this.purchaseOptions.deleteMany({ itemId: item });

    return {};
  }

  /**
   * addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
   * **requires** `item` exists. `quantity` > 0, `price` >= 0.
   * **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.
   */
  async addPurchaseOption(
    input: AddPurchaseOptionInput,
  ): Promise<AddPurchaseOptionOutput> {
    const { item, quantity, units, price, store } = input;
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (quantity <= 0) {
      return { error: "Quantity must be greater than 0." };
    }
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }

    const newPurchaseOptionId = freshID();
    const newPurchaseOption: PurchaseOptionDoc = {
      _id: newPurchaseOptionId,
      itemId: item,
      store,
      quantity,
      units,
      price,
      confirmed: false, // PurchaseOption always starts unconfirmed
      // atomicOrderId is optional, not set on creation
    };

    await this.purchaseOptions.insertOne(newPurchaseOption);

    await this.items.updateOne(
      { _id: item },
      { $addToSet: { purchaseOptions: newPurchaseOptionId } },
    );

    return { purchaseOption: newPurchaseOptionId };
  }

  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
   * updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
   * updatePurchaseOption (purchaseOption: PurchaseOption, atomicOrder: AtomicOrder)
   * **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    input: UpdatePurchaseOptionInput,
  ): Promise<UpdatePurchaseOptionOutput> {
    const { purchaseOption } = input;
    const update: Partial<PurchaseOptionDoc> = {};

    if ("quantity" in input) {
      if (input.quantity <= 0) {
        return { error: "Quantity must be greater than 0." };
      }
      update.quantity = input.quantity;
    } else if ("units" in input) {
      update.units = input.units;
    } else if ("price" in input) {
      if (input.price < 0) {
        return { error: "Price cannot be negative." };
      }
      update.price = input.price;
    } else if ("store" in input) {
      update.store = input.store;
    } else if ("atomicOrder" in input) {
      update.atomicOrderId = input.atomicOrder;
    }

    const result = await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    return {};
  }

  /**
   * removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
   * **requires** `item` exists, `purchaseOption` is associated with `item`.
   * **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.
   */
  async removePurchaseOption(
    input: RemovePurchaseOptionInput,
  ): Promise<RemovePurchaseOptionOutput> {
    const { item, purchaseOption } = input;
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    const result = await this.purchaseOptions.deleteOne({
      _id: purchaseOption,
      itemId: item,
    });
    if (result.deletedCount === 0) {
      return {
        error:
          `PurchaseOption with ID "${purchaseOption}" not found or not associated with Item "${item}".`,
      };
    }

    // Also remove the purchaseOption ID from the ItemDoc
    await this.items.updateOne(
      { _id: item },
      { $pull: { purchaseOptions: purchaseOption } },
    );

    return {};
  }

  /**
   * addItemName (item: Item, name: String)
   * **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).
   * **effects** Adds `name` to the `names` set of `item`.
   */
  async addItemName(input: AddItemNameInput): Promise<AddItemNameOutput> {
    const { item, name } = input;
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (existingItem.names.includes(name)) {
      return {
        error: `Name "${name}" is already an alias for Item "${item}".`,
      };
    }

    await this.items.updateOne(
      { _id: item },
      { $addToSet: { names: name } },
    );
    return {};
  }

  /**
   * removeItemName (item: Item, name: String)
   * **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.
   * **effects** Removes `name` from the `names` set of `item`.
   */
  async removeItemName(input: RemoveItemNameInput): Promise<RemoveItemNameOutput> {
    const { item, name } = input;
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (!existingItem.names.includes(name)) {
      return { error: `Name "${name}" is not an alias for Item "${item}".` };
    }
    if (existingItem.names.length === 1) {
      return { error: `Cannot remove the only name for Item "${item}".` };
    }

    await this.items.updateOne(
      { _id: item },
      { $pull: { names: name } },
    );
    return {};
  }

  /**
   * confirmPurchaseOption (purchaseOption: PurchaseOption)
   * **requires** `purchaseOption` exists, `purchaseOption` is not already `confirmed`.
   * **effects** Sets `purchaseOption.confirmed` to `true`.
   */
  async confirmPurchaseOption(
    input: ConfirmPurchaseOptionInput,
  ): Promise<ConfirmPurchaseOptionOutput> {
    const { purchaseOption } = input;
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    if (existingPurchaseOption.confirmed) {
      return {
        error:
          `PurchaseOption with ID "${purchaseOption}" is already confirmed.`,
      };
    }

    await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: { confirmed: true } },
    );
    return {};
  }

  /**
   * addPurchaseOptionOrder (purchaseOption: PurchaseOption, atomicOrder: AtomicOrder)
   * **requires** `purchaseOption` exists.
   * **effects** Sets `purchaseOption.atomicOrderId` to `atomicOrder`.
   */
  async addPurchaseOptionOrder(
    input: AddPurchaseOptionOrderInput,
  ): Promise<AddPurchaseOptionOrderOutput> {
    const { purchaseOption, atomicOrder } = input;
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }

    await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: { atomicOrderId: atomicOrder } },
    );
    return {};
  }

  /**
   * addItemOrder (item: Item, selectOrder: SelectOrder)
   * **requires** `item` exists.
   * **effects** Sets `item.selectOrderId` to `selectOrder`.
   */
  async addItemOrder(input: AddItemOrderInput): Promise<AddItemOrderOutput> {
    const { item, selectOrder } = input;
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    await this.items.updateOne(
      { _id: item },
      { $set: { selectOrderId: selectOrder } },
    );
    return {};
  }

  /**
   * _getItemByName (name: String): (item: Item)
   * **requires** An item exists with `name` in its `names` set.
   * **effects** Returns the `Item` ID with the given name.
   */
  async _getItemByName(input: GetItemByNameInput): Promise<GetItemByNameOutput> {
    const { name } = input;
    const itemDoc = await this.items.findOne({ names: name });
    if (!itemDoc) {
      return [{ error: `Item with name "${name}" not found.` }];
    }
    return [{ item: itemDoc._id }];
  }

  /**
   * _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
   * **requires** An item exists with `purchaseOption` in its `purchaseOption` set.
   * **effects** Returns the `Item` ID with the given purchaseOption.
   */
  async _getItemByPurchaseOption(
    input: GetItemByPurchaseOptionInput,
  ): Promise<GetItemByPurchaseOptionOutput> {
    const { purchaseOption } = input;
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
      }];
    }
    return [{ item: poDoc.itemId }];
  }

  /**
   * _getItemNames (item: Item): (names: Set of String)
   * **requires** `item` exists.
   * **effects** Returns the associated names of the item.
   */
  async _getItemNames(input: GetItemNamesInput): Promise<GetItemNamesOutput> {
    const { item } = input;
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }
    return [{ names: itemDoc.names }];
  }

  /**
   * _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
   * **requires** `item` exists.
   * **effects** Returns the set of all `PurchaseOption`s for the given `item`.
   */
  async _getItemPurchaseOptions(
    input: GetItemPurchaseOptionsInput,
  ): Promise<GetItemPurchaseOptionsOutput> {
    const { item } = input;
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }
    return [{ purchaseOptions: itemDoc.purchaseOptions }];
  }

  /**
   * _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
   * **requires** `purchaseOption` exists.
   * **effects** Returns the set of details given `purchaseOption`.
   */
  async _getPurchaseOptionDetails(
    input: GetPurchaseOptionDetailsInput,
  ): Promise<GetPurchaseOptionDetailsOutput> {
    const { purchaseOption } = input;
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
      }];
    }
    return [{
      quantity: poDoc.quantity,
      units: poDoc.units,
      price: poDoc.price,
      store: poDoc.store,
      confirmed: poDoc.confirmed,
    }];
  }

  /**
   * _getAllItems (): (items: Set of Item)
   * **requires** nothing.
   * **effects** Returns a set of all `Item` entity IDs.
   */
  async _getAllItems(): Promise<GetAllItemsOutput> {
    const allItems = await this.items.find({}).toArray();
    return [{ items: allItems.map((item) => item._id) }];
  }
}
```
