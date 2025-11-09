import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "StoreCatalog" + ".";

// Generic types of this concept
type Item = ID;
type PurchaseOption = ID;

// --- Action Input/Output Types ---

// createItem (primaryName: String): (item: Item)
type CreateItemInput = { primaryName: string };
type CreateItemOutput = Result<{ item: Item }>;

// deleteItem (item: Item)
type DeleteItemInput = { item: Item };
type DeleteItemOutput = Result<{ success: true }>;

// addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
type AddPurchaseOptionInput = {
  item: Item;
  quantity: number;
  units: string;
  price: number;
  store: string;
};
type AddPurchaseOptionOutput = Result<{ purchaseOption: PurchaseOption }>;

// updatePurchaseOption - Overloaded inputs
// updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
type UpdatePurchaseOptionQuantityInput = {
  purchaseOption: PurchaseOption;
  quantity: number;
};
// updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
type UpdatePurchaseOptionUnitsInput = {
  purchaseOption: PurchaseOption;
  units: string;
};
// updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
type UpdatePurchaseOptionPriceInput = {
  purchaseOption: PurchaseOption;
  price: number;
};
// updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
type UpdatePurchaseOptionStoreInput = {
  purchaseOption: PurchaseOption;
  store: string;
};

type UpdatePurchaseOptionInput =
  | UpdatePurchaseOptionQuantityInput
  | UpdatePurchaseOptionUnitsInput
  | UpdatePurchaseOptionPriceInput
  | UpdatePurchaseOptionStoreInput;
type UpdatePurchaseOptionOutput = Result<{ success: true }>;

// removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
type RemovePurchaseOptionInput = { item: Item; purchaseOption: PurchaseOption };
type RemovePurchaseOptionOutput = Result<{ success: true }>;

// updateItemName (item: Item, name: String)
type UpdateItemNameInput = { item: Item; name: string };
type UpdateItemNameOutput = Result<{ success: true }>;

// confirmPurchaseOption (purchaseOption: PurchaseOption)
type ConfirmPurchaseOptionInput = { purchaseOption: PurchaseOption };
type ConfirmPurchaseOptionOutput = Result<{ success: true }>;

// --- Query Input/Output Types ---

// _getItemByName (name: String): (item: Item)
type GetItemByNameInput = { name: string };
type GetItemByNameOutput = Result<{ item: Item }[]>;

// _getItemName (item: Item): (name: String)
type GetItemNameInput = { item: Item };
type GetItemNameOutput = Result<{ name: string }[]>;

// _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
type GetItemByPurchaseOptionInput = { purchaseOption: PurchaseOption };
type GetItemByPurchaseOptionOutput = Result<{ item: Item }[]>;

// _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
type GetItemPurchaseOptionsInput = { item: Item };
type GetItemPurchaseOptionsOutput = Result<
  { purchaseOptions: PurchaseOption[] }[]
>;

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
type GetAllItemsInput = Empty; // Represents an empty dictionary input
type GetAllItemsOutput = Result<{ items: Item[] }[]>;

/**
 * a set of Item with
 *   a name String
 *   a purchaseOptions Set of PurchaseOption
 */
interface ItemDoc {
  _id: Item;
  name: string;
  purchaseOptions: PurchaseOption[];
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
   * **requires** no Item already exists with `primaryName` as its name.
   * **effects** Creates a new `Item` with `primaryName` as its `name` and an empty `purchaseOptions` set. Returns the new `Item` ID.
   */
  async createItem(
    { primaryName }: CreateItemInput,
  ): Promise<CreateItemOutput> {
    const existingItem = await this.items.findOne({ name: primaryName });
    if (existingItem) {
      return {
        error: `An item with the name "${primaryName}" already exists.`,
      };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      name: primaryName,
      purchaseOptions: [], // Initialize empty
    };

    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * deleteItem (item: Item)
   * **requires** `item` exists.
   * **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.
   */
  async deleteItem({ item }: DeleteItemInput): Promise<DeleteItemOutput> {
    const result = await this.items.deleteOne({ _id: item });
    if (result.deletedCount === 0) {
      return { error: `Item with ID "${item}" not found.` };
    }

    // Delete associated purchase options from their own collection
    await this.purchaseOptions.deleteMany({ itemId: item });

    return { success: true };
  }

  /**
   * addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
   * **requires** `item` exists. `quantity` > 0, `price` >= 0.
   * **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.
   */
  async addPurchaseOption(
    { item, quantity, units, price, store }: AddPurchaseOptionInput,
  ): Promise<AddPurchaseOptionOutput> {
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
   * updatePurchaseOption (purchaseOption: PurchaseOption, order: Order)
   * **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    args: UpdatePurchaseOptionInput,
  ): Promise<UpdatePurchaseOptionOutput> {
    const { purchaseOption } = args;
    const update: Partial<PurchaseOptionDoc> = {};

    if ("quantity" in args) {
      if (args.quantity <= 0) {
        return { error: "Quantity must be greater than 0." };
      }
      update.quantity = args.quantity;
    } else if ("units" in args) {
      update.units = args.units;
    } else if ("price" in args) {
      if (args.price < 0) {
        return { error: "Price cannot be negative." };
      }
      update.price = args.price;
    } else if ("store" in args) {
      update.store = args.store;
    }

    const result = await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    return { success: true };
  }

  /**
   * removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
   * **requires** `item` exists, `purchaseOption` is associated with `item`.
   * **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.
   */
  async removePurchaseOption(
    { item, purchaseOption }: RemovePurchaseOptionInput,
  ): Promise<RemovePurchaseOptionOutput> {
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

    return { success: true };
  }

  /**
   * updateItemName (item: Item, name: String)
   * **requires** `item` exists, no other Item already exists with `name` as its name.
   * **effects** Updates the `name` of `item` to the specified `name`.
   */
  async updateItemName(
    { item, name }: UpdateItemNameInput,
  ): Promise<UpdateItemNameOutput> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    // Check if another item already has this name
    const itemWithName = await this.items.findOne({ name: name });
    if (itemWithName && itemWithName._id !== item) {
      return {
        error: `An item with the name "${name}" already exists.`,
      };
    }

    await this.items.updateOne(
      { _id: item },
      { $set: { name: name } },
    );
    return { success: true };
  }

  /**
   * confirmPurchaseOption (purchaseOption: PurchaseOption)
   * **requires** `purchaseOption` exists, `purchaseOption` is not already `confirmed`.
   * **effects** Sets `purchaseOption.confirmed` to `true`.
   */
  async confirmPurchaseOption(
    { purchaseOption }: ConfirmPurchaseOptionInput,
  ): Promise<ConfirmPurchaseOptionOutput> {
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
    return { success: true };
  }

  /**
   * _getItemByName (name: String): (item: Item)
   * **requires** An item exists with `name` as its name.
   * **effects** Returns the `Item` ID with the given name.
   */
  async _getItemByName(
    { name }: GetItemByNameInput,
  ): Promise<GetItemByNameOutput> {
    const itemDoc = await this.items.findOne({ name: name });
    if (!itemDoc) {
      return { error: `Item with name "${name}" not found.` };
    }
    return [{ item: itemDoc._id }];
  }

  /**
   * _getItemName (item: Item): (name: String)
   * **requires** `item` exists.
   * **effects** Returns the `name` of the given `item`.
   */
  async _getItemName(
    { item }: GetItemNameInput,
  ): Promise<GetItemNameOutput> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item with ID "${item}" not found.` };
    }
    return [{ name: itemDoc.name }];
  }

  /**
   * _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
   * **requires** An item exists with `purchaseOption` in its `purchaseOption` set.
   * **effects** Returns the `Item` ID with the given purchaseOption.
   */
  async _getItemByPurchaseOption(
    { purchaseOption }: GetItemByPurchaseOptionInput,
  ): Promise<GetItemByPurchaseOptionOutput> {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return {
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
      };
    }
    return [{ item: poDoc.itemId }];
  }

  /**
   * _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
   * **requires** `item` exists.
   * **effects** Returns the set of all `PurchaseOption`s for the given `item`.
   */
  async _getItemPurchaseOptions(
    { item }: GetItemPurchaseOptionsInput,
  ): Promise<GetItemPurchaseOptionsOutput> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item with ID "${item}" not found.` };
    }
    return [{ purchaseOptions: itemDoc.purchaseOptions }];
  }

  /**
   * _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
   * **requires** `purchaseOption` exists.
   * **effects** Returns the set of details given `purchaseOption`.
   */
  async _getPurchaseOptionDetails(
    { purchaseOption }: GetPurchaseOptionDetailsInput,
  ): Promise<GetPurchaseOptionDetailsOutput> {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return {
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
      };
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
  async _getAllItems({}: GetAllItemsInput): Promise<GetAllItemsOutput> {
    const allItems = await this.items.find({}).toArray();
    return [{ items: allItems.map((item) => item._id) }];
  }
}
