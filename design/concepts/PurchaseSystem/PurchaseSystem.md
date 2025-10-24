
## PurchaseSystem

**concept** PurchaseSystem \[PurchaseOption]

**purpose** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status.

**principle** An online optimizing purchasing system that first `createAtomicOrder` the different variants of something to purchase. That thing is then added as a `createSelectOrder`, where it is able to select any of its AtomicOrder in order to purchase the desired amount of that SelectOrder. A set of items are then composed into a `createCompositeOrder`, which starts from a base SelectOrder and its scaling. To this CompositeOrder we can `addSubOrder` which will add a scaling to either a different CompositeOrder or a SelectOrder. At any point for a CompositeOrder a `calculateOptimalPurchase` will calculate and update the cost for that CompositeOrder. Finally, a `purchaseOrder` can be placed on any head CompositeOrder (has no parents) and it will mark every SelectOrder and CompositeOrder in its subtree as purchased.

**state**\
  a set of AtomicOrder with\
    a purchaseOption PurchaseOption\
    a quantity Float // Ex. 3.0\
    a units String // Ex. "lbs", "oz", "count"\
    a price Float // Ex. 5.99 (cost for this specific quantity)\
    a parentSelectOrder SelectOrder

  a set of SelectOrder with\
    a desiredQuantity Float // Ex. 5.0\
    a desiredUnits String // Ex. "lbs"\
    a childAtomicOrders Set of AtomicOrder\
    a parentCompositeOrders Set of CompositeOrder\
    a purchased Bool

  a set of CompositeOrder with\
    a childOrders Map of (SelectOrder | CompositeOrder) to Float // Map from Order ID to its scale factor\
    a parentCompositeOrders Set of CompositeOrder\
    a totalCost Float // Optimally calculated\
    a purchased Bool\

**actions**\
  createAtomicOrder (purchaseOption: PurchaseOption, quantity: Float, units: String, price: Float): (atomicOrder: AtomicOrder)\
    **requires** `purchaseOption` exists.\
    **effects** Creates a new `AtomicOrder` with the given parameters. Its `parentSelectOrder` is initially null. Returns the new `AtomicOrder` ID.

  createSelectOrder (desiredQuantity: Float, desiredUnits: String): (selectOrder: SelectOrder)\
    **requires** `desiredQuantity` > 0.\
    **effects** Creates a new `SelectOrder` with `desiredQuantity`, `desiredUnits`. Initializes `purchased` to `false`. Returns the new `SelectOrder` ID.

  createCompositeOrder (): (compositeOrder: CompositeOrder)\
    **requires** true.\
    **effects** Creates a new `CompositeOrder`. Initializes `childOrders` to empty, `totalCost` to 0.0, and `purchased` to `false`. Returns the new `CompositeOrder` ID.

  addSelectSubOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)\
    **requires** `selectOrder` exists. `atomicOrder` exists. `atomicOrder` is not already in `selectOrder.childAtomicOrders`.\
    **effects** Adds `atomicOrder` to `selectOrder.childAtomicOrders`. Sets `atomicOrder.parentSelectOrder` to `selectOrder`. Triggers `calculateOptimalPurchase` for all `parentCompositeOrders` of `selectOrder`.

  removeSelectSubOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)\
    **requires** `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.\
    **effects** Removes `atomicOrder` from `selectOrder.childAtomicOrders`. Sets `atomicOrder.parentSelectOrder` to null. Triggers `calculateOptimalPurchase` for all `parentCompositeOrders` of `selectOrder`.

  addCompositeSubOrder (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), scaleFactor: Float)\
    **requires** `parentCompositeOrder` exists. `childOrder` exists. `scaleFactor` > 0. `childOrder` is not already a child order of `parentCompositeOrder`.\
    **effects** Adds `childOrder` to `parentCompositeOrder.childOrders` with the given `scaleFactor`. Adds `parentCompositeOrder` to `childOrder.parentCompositeOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  removeCompositeSubOrder (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder))\
    **requires** `parentCompositeOrder` exists. `childOrder` exists and is a child order of `parentCompositeOrder`.\
    **effects** Removes `childOrder` from `parentCompositeOrder.childOrders`. Removes `parentCompositeOrder` from `childOrder.parentCompositeOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  updateSubOrderScaleFactor (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), newScaleFactor: Float)\
    **requires** `parentCompositeOrder` exists. `childOrder` exists and is a child order of `parentCompositeOrder`. `newScaleFactor` > 0.\
    **effects** Updates the `scaleFactor` for `childOrder` in `parentCompositeOrder.childOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  calculateOptimalPurchase (compositeOrder: CompositeOrder)\
    **requires** `compositeOrder` exists. All `SelectOrder`s in its subtree have `childAtomicOrders` populated.\
    **effects** Recursively determines the optimal `AtomicOrder` for each `SelectOrder` in the `compositeOrder`'s subtree. Updates `compositeOrder.totalCost` and the `totalCost` of all its ancestor `CompositeOrder`s based on these optimal selections and scale factors. Sets `purchased` to `false` for `compositeOrder` and all parent `CompositeOrder`s if any optimal selection changes.

  purchaseOrder (compositeOrder: CompositeOrder)\
    **requires** `compositeOrder` exists and has an empty `parentCompositeOrders` set (it is a head node). All `SelectOrder`s nested under `compositeOrder` have an `optimalAtomicOrder` selected (implicitly, through calculation).\
    **effects** Recursively sets `purchased` to `true` for `compositeOrder` and all `SelectOrder`s and `CompositeOrder`s in its subtree.

  deleteOrder (order: (AtomicOrder | SelectOrder | CompositeOrder))\
    **requires** `order` exists.\
    **effects** Deletes the specified `order`.\\
* If `order` is an `AtomicOrder`:
    * If `order.parentSelectOrder` is not null: removes `order` from `order.parentSelectOrder.childAtomicOrders`. Triggers `calculateOptimalPurchase` for all `parentCompositeOrders` of `order.parentSelectOrder`.
    * Sets `atomicOrder.parentSelectOrder` to null.
* If `order` is a `SelectOrder`:
    * For each `pco` in `order.parentCompositeOrders`: removes `order` from `pco.childOrders`. Triggers `calculateOptimalPurchase` for `pco` and its ancestors.
    * For each `ao` in `order.childAtomicOrders`: deletes `ao`.
* If `order` is a `CompositeOrder`:
    * For each `pco` in `order.parentCompositeOrders`: removes `order` from `pco.childOrders`. Triggers `calculateOptimalPurchase` for `pco` and its ancestors.
    * Removes references to its own `childOrders`.

**queries**\
  \_getAtomicOrderDetails (atomicOrder: AtomicOrder): (purchaseOption: PurchaseOption, quantity: Float, units: String, price: Float, parentSelectOrder: SelectOrder)\
    **requires** `atomicOrder` exists.\
    **effects** Returns the `purchaseOption`, `quantity`, `units`, `price`, and `parentSelectOrder` of the `atomicOrder`.

  \_getSelectOrderDetails (selectOrder: SelectOrder): (desiredQuantity: Float, desiredUnits: String, childAtomicOrders: Set of AtomicOrder, purchased: Bool, parentCompositeOrders: Set of CompositeOrder)\
    **requires** `selectOrder` exists.\
    **effects** Returns the `desiredQuantity`, `desiredUnits`, `childAtomicOrders`, `purchased`, and `parentCompositeOrders` of the `selectOrder`.

  \_getCompositeOrderDetails (compositeOrder: CompositeOrder): (childOrders: Map of (SelectOrder | CompositeOrder) to Float, totalCost: Float, purchased: Bool, parentCompositeOrders: Set of CompositeOrder)\
    **requires** `compositeOrder` exists.\
    **effects** Returns the `childOrders`, `totalCost`, `purchased`, and `parentCompositeOrders` of the `compositeOrder`.

  \_getOptimalPurchase (compositeOrder: CompositeOrder): (optimalCost: Float, selectedAtomicOrders: Map of SelectOrder to AtomicOrder)\
    **requires** `compositeOrder` exists. `calculateOptimalPurchase` has been run for this `compositeOrder` and its sub-tree.\
    **effects** Returns the calculated `compositeOrder.totalCost` and a map of each `SelectOrder` in its subtree to the `AtomicOrder` that was optimally selected for it during the last `calculateOptimalPurchase` operation.

  \_getOrderCost (compositeOrder: CompositeOrder): (totalCost: Float)\
    **requires** `compositeOrder` exists.\
    **effects** Returns the `totalCost` of the `compositeOrder`.