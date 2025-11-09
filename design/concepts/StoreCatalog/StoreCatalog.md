
# StoreCatalog

**concept** StoreCatalog [AtomicOrder, SelectOrder]

**purpose** Manage a comprehensive catalog of purchasable ingredients, their names, and available purchase options across different stores.

**principle** An administrator `createItem` for a new ingredient like "ground pepper". They then discover multiple `PurchaseOption`s for it, such as "3 lbs for $5.99 at Sprout's" and "1 lb for $2.50 at Trader Joe's", and `addPurchaseOption` for each. Later, if the name needs to be changed, the administrator `updateItemName` to update it. Once verified, the administrator `confirmPurchaseOption` to mark that it is official.

**state**\
  a set of Item with\
    a name String // Ex. "ground pepper"\
    a purchaseOptions Set of PurchaseOption\
  a set of PurchaseOption with\
    a store String // Ex. "Sprout's"\
    a quantity Float // Ex. 3.0\
    a units String // Ex. "lbs", "oz", "count"\
    a price Float // Ex. 5.99\
    a confirmed Bool\

**actions**\
  createItem (primaryName: String): (item: Item)\
    **requires** no Item already exists with `primaryName` as its name.\
    **effects** Creates a new `Item` with `primaryName` as its `name` and an empty `purchaseOptions` set. Returns the new `Item` ID.

  deleteItem (item: Item)\
    **requires** `item` exists.\
    **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

  addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)\
    **requires** `item` exists. `quantity` > 0, `price` >= 0.\
    **effects** Adds a new `purchaseOption` to `item.purchaseOptions` set with the specified details. Returns the new `PurchaseOption` ID.

  updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, units: String)\
  updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, store: String)\
  updatePurchaseOption (purchaseOption: PurchaseOption, order: Order)\
    **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.\
    **effects** Updates the specified attribute of the `purchaseOption`.

  removePurchaseOption (item: Item, purchaseOption: PurchaseOption)\
    **requires** `item` exists, `purchaseOption` is associated with `item`.\
    **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.

  updateItemName (item: Item, name: String)\
    **requires** `item` exists, no other Item already exists with `name` as its name.\
    **effects** Updates the `name` of `item` to the specified `name`.

  confirmPurchaseOption (purchaseOption: PurchaseOption)\
    **requires** `purchaseOption` exists, `purchaseOption` is not already `confirmed`.\
    **effects** Sets `purchaseOption.confirmed` to `true`.

**queries**
  _getItemByName (name: String): (item: Item)\
    **requires** An item exists with `name` as its name.\
    **effects** Returns the `Item` ID with the given name.

  _getItemName (item: Item): (name: String)\
    **requires** `item` exists.\
    **effects** Returns the `name` of the given `item`.

  _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)\
    **requires** An item exists with `purchaseOption` in its `purchaseOption` set.\
    **effects** Returns the `Item` ID with the given purchaseOption.

  _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the set of all `PurchaseOption`s for the given `item`.

  _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)\
    **requires** `purchaseOption` exists.\
    **effects** Returns the set of details given `purchaseOption`.

  _getAllItems (): (items: Set of Item)\
    **requires** nothing.\
    **effects** Returns a set of all `Item` entity IDs.
