[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@StoreCatalog](./StoreCatalog.md)

List of modifications:
1. Each Item should have a set of Store, where each Store has a set of PurchaseOption.
2. Create a deleteItem action that removes it completely from the catalog.

# Please apply modifications. Only output new StoreCatalog.md. Please follow the space convention and include the \ in every line but the last for each connected portion.

# response:

```
**concept** StoreCatalog

**purpose** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.

**principle** An administrator `createItem` for a new ingredient like "ground pepper". They then discover multiple `PurchaseOption`s for it, such as "3 lbs for $5.99 at Sprout's" and "1 lb for $2.50 at Trader Joe's", and `addPurchaseOption` for each. Later, another user refers to "pepper", so the administrator `addItemName` "pepper" as an alias. Once verified, the administrator `confirmItem` so it can be used in orders.

**state**
  a set of Item with\
    a names Set of String // Ex. {'pepper', 'ground pepper', 'course pepper'}\
    a confirmed Bool // false if unverified, true if verified by administrator\
a set of Store with\
    a name String // Ex. "Sprout's"\
a set of PurchaseOption with\
    an item Item // Reference to the Item entity\
    a store Store // Reference to the Store entity\
    a quantity Float // Ex. 3.0\
    a units String // Ex. "lbs", "oz", "count"\
    a price Float // Ex. 5.99

**actions**\
  createItem (primaryName: String): (item: Item)\
    **requires** no Item already exists with `primaryName` in its `names` set.\
    **effects** Creates a new `Item` with `primaryName` in its `names` set, `confirmed` set to `false`. Returns the new `Item` ID.

  deleteItem (item: Item)\
    **requires** `item` exists.\
    **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

  addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, storeName: String): (purchaseOption: PurchaseOption)\
    **requires** `item` exists. `quantity` > 0, `price` >= 0.\
    **effects**
      If no `Store` exists with `storeName` as its name, a new `Store` is created with `storeName`.\
      Let `s` be the `Store` entity with `storeName`.\
      Creates a new `PurchaseOption` linking `item` to `s` with the specified `quantity`, `units`, and `price`.\
      Returns the new `PurchaseOption` ID.

  updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, units: String)\
  updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, store: Store)\
    **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.\
    **effects** Updates the specified attribute of the `purchaseOption`.

  removePurchaseOption (item: Item, purchaseOption: PurchaseOption)\
    **requires** `item` exists, `purchaseOption` exists, and `purchaseOption.item` is `item`.\
    **effects** Removes `purchaseOption` from the catalog.

  addItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).\
    **effects** Adds `name` to the `names` set of `item`.

  removeItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.\
    **effects** Removes `name` from the `names` set of `item`.

  confirmItem (item: Item)\
    **requires** `item` exists, `item` is not already `confirmed`.\
    **effects** Sets `item.confirmed` to `true`.

**queries**
  \_getItemByName (name: String): (item: Item)\
    **requires** An item exists with `name` in its `names` set.\
    **effects** Returns the `Item` ID with the given name.

  \_getPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the set of all `PurchaseOption`s where `purchaseOption.item` is `item`.

  \_getAllItems (): (items: Set of Item)\
    **requires** nothing.\
    **effects** Returns a set of all `Item` entities.
```