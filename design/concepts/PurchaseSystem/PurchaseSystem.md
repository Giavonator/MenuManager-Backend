
# PurchaseSystem

**concept** PurchaseSystem \[ID]

**purpose** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status and optimizing selections from available purchasing options.

**principle** When a user creates a 'Shopping Cart' as a `CompositeOrder`, then adds various items like 'Milk' and 'Bread' as `SelectOrder`s, providing multiple `AtomicOrder` options for each (e.g., different brands or package sizes), and associates these `SelectOrder`s with the 'Shopping Cart' via `addSelectOrderToCompositeOrder` with specified quantities, the system will `calculateOptimalPurchase` to automatically determine the most cost-effective combination of `AtomicOrder`s to fulfill all required quantities, enabling the user to `purchaseOrder` the entire cart with the optimized plan.

**state**\
  a set of AtomicOrder with\
    an associateID ID // Associate Order to external globally unique ID\
    a quantity Float // Ex. 3.0\
    a units String // Ex. "lbs", "oz", "count"\
    a price Float // Ex. 5.99 (cost for this specific quantity)\
    a parentOrder SelectOrder

  a set of SelectOrder with\
    an associateID ID // Associate Order to external globally unique ID\
    a baseQuantity Float // Ex. 1.0, (-1 if no childAtomicOrders yet, if so ignore it during calculations)\
    a baseUnits String // Ex. "lbs", internal unit conversion table if AtomicOrder has different units\
    a childAtomicOrders Set of AtomicOrder // AtomicOrder options available for *this* SelectOrder.\
    a parentOrders Set of CompositeOrder\

  a set of CompositeOrder with\
    an associateID ID // Associate Order to external globally unique ID\
    a childSelectOrders Map of SelectOrder to Float // Scale factor for purchasing calculations\
    a childCompositeOrders Map of CompositeOrder to Float // Scale factor for purchasing calculations\
    an optimalPurchase Map of AtomicOrder to Int // Calculated during calculateOptimalPurchase, must purchase whole AtomicOrders\
    a totalCost Float // Optimally calculated\
    a parentOrder CompositeOrder\
    a rootOrder CompositeOrder\
    a purchased Bool

**actions**\

  createSelectOrder (associateID: ID): (selectOrder: SelectOrder)\
    **requires** No order already exists for `associateID` within this `PurchaseSystem` concept.\
    **effects** Creates a new `SelectOrder` with `associateID`. Initializes `childAtomicOrders` to empty, `baseQuantity` to -1.0, `baseUnits` to "" (ie. no units yet), `parentOrders` to empty. Returns new `selectOrder` ID.

  createAtomicOrder (selectOrder: SelectOrder, associateID: ID, quantity: Float, units: String, price: Float): (atomicOrder: AtomicOrder)\
    **requires** `selectOrder` exists. No order already exists for `associateID` within this `PurchaseSystem` concept.\
    **effects** Creates `atomicOrder` with `associateID`, `quantity`, `units`, `price` as arguments and `parentOrder` set to `selectOrder`. Adds `atomicOrder` to `selectOrder.childAtomicOrders`. If this is the first AtomicOrder option for `selectOrder` sets `selectOrder.baseUnits` and `selectOrder.baseQuantity` to `units` and `quantity` respectively, if its a subsequent then no modification to `selectOrder.baseUnits` and `selectOrder.baseQuantity` is necessary. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

  deleteAtomicOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)\
    **requires** `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.\
    **effects** Removes `atomicOrder` from `selectOrder.childAtomicOrders`. Delete `atomicOrder`. If `atomicOrder` was the last AtomicOrder in `selectOrder.childAtomicOrders` then sets `selectOrder.baseQuantity` to -1 and `selectOrder.baseUnits` to "". Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

  updateAtomicOrder (atomicOrder: AtomicOrder, quantity: Float)\
  updateAtomicOrder (atomicOrder: AtomicOrder, units: String)\
  updateAtomicOrder (atomicOrder: AtomicOrder, price: Float)\
    **requires** `atomicOrder` exists.\
    **effects** Updates the respective attribute withing `atomicOrder`. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `atomicOrder.parentOrder.parentOrders`.

  createCompositeOrder (associateID: ID): (compositeOrder: CompositeOrder)\
    **requires** No order already exists for `associateID` within this `PurchaseSystem` concept.\
    **effects** Creates a new `CompositeOrder` with `associateID`. Initializes `childSelectOrders` to empty, `childCompositeOrders` to empty, optimalPurchase to empty, `totalCost` to 0.0, `purchased` to `false`, `parentOrder` to itself (if `parentOrder` is istelf then we know we are at root), and `rootOrder` to itself. Returns the new `CompositeOrder` ID.

  addSelectOrderToCompositeOrder (compositeOrder: CompositeOrder, selectOrder: SelectOrder, scaleFactor: Float)\
    **requires** `compositeOrder` exists. `selectOrder` exists. `scaleFactor` > 0.\
    **effects** Maps `selectOrder` within `compositeOrder.childSelectOrders` to the given `scaleFactor`. Adds `compositeOrder` to the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

  removeSelectOrderFromCompositeOrder (compositeOrder: CompositeOrder, selectOrder: SelectOrder)\
    **requires** `compositeOrder` exists. `selectOrder` exists. `selectOrder` is within `compositeOrder.childSelectOrders`.\
    **effects** Removes `selectOrder` from `compositeOrder.childSelectOrders`. Removes `compositeOrder` from the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

  addCompositeSubOrder (parentOrder: CompositeOrder, childOrder: CompositeOrder)\
    **requires** `parentOrder` exists. `childOrder` exists. For all `childOrder.childCompositeOrders` and the subsequent CompositeOrder children, none of which are within `parentOrder.childCompositeOrders` or its subsequent children (Essentially requires no cycle to be formed). \
    **effects** Adds `childOrder` to `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` to `parentOrder` and `childOrder.rootOrder` to `parentOrder.rootOrder`. Sets all `childOrder.childCompositeOrders` and their subsequent CompositeOrder children to have new root `parentOrder.rootOrder`. Lastly, calls `calculateOptimalPurchase` for one `parentOrder.rootOrder` afterwards.

  removeCompositeSubOrder (parentOrder: CompositeOrder, childOrder: CompositeOrder)\
    **requires** `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders`.\
    **effects** Removes `childOrder` from `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` and `childOrder.rootOrder` to `childOrder` (itself). Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder` and `childOrder`.

  updateSubOrderScaleFactor (parentOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), newScaleFactor: Float)\
    **requires** `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders` or in `parentOrder.childSelectOrders`. `newScaleFactor` > 0.\
    **effects** Maps `childOrder` within `parentOrder.childCompositeOrders` or `parentOrder.childSelectOrders` (depending on what type child is) to `newScaleFactor`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder`.

  deleteCompositeOrder (compositeOrder: CompositeOrder)\
    **requires** `compositeOrder` exists.\
    **effects** Calls removeSelectOrderFromCompositeOrder for every SelectOrder in `compositeOrder.childSelectOrders`. Calls with parent being `compositeOrder.parentOrder`. Recursively calls deleteCompositeOrder for every CompositeOrder in `compositeOrder.childCompositeOrders`. Calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`. Finally, removes `compositeOrder` from the state.

  calculateOptimalPurchase (compositeOrders: Set of CompositeOrder)\
    **requires** Every CompositeOrder in `compositeOrder` exists.\
    **effects** Don't add to state but for this action keep track of `processedRootNodes`. For each `compositeOrder` in the passed in set of `compositeOrders`: If `compositeOrder.purchased`, skip it. If `compositeOrder.rootOrder` is in `processedRootNodes`, skip it. Now knowing we have a tree that has not been purchased or already calculated during this action, we continue. From the `compositeOrder.rootOrder` we propagate down multiplying the scaling factors, until we have gone through every CompositeOrder in the tree and now have a map of SelectOrder to Float for every SelectOrder we need to purchase for this `compositeOrder.rootOrder` (if SelectOrder doesn't have an AtomicOrder option, have cost for this SelectOrder during calculations be zero). For each individual SelectOrder now knowing its total scale factor, we select the optimal AtomicOrder that when purchased in multiples can buy at least the necessary quantity for the least amount of money. Now knowing all of the optimal AtomicOrders, we use those to propagate up from the leaf CompositeOrders calculating their costs and setting the `compositeOrder.totalCost` and `compositeOrder.optimalPurchase` map for every CompositeOrder.

  purchaseOrder (compositeOrder: CompositeOrder)\
    **requires** `compositeOrder` exists. `compositeOrder.rootOrder` is itself. `compositeOrder.purchased` is false. All `SelectOrder`s within the tree have at least one AtomicOrder option.\
    **effects** Recursively sets `purchased` to `true` for all CompositeOrders rooted from `compositeOrder`.

**queries**\
  \_getOrderByAssociateID (associateID: ID): (order: (AtomicOrder | SelectOrder | CompositeOrder))\
    **requires** Order exists with `associateID`.\
    **effects** Returns the `order` associated with that ID.

  \_getOptimalPurchase (compositeOrder: CompositeOrder): (optimalPurchase: Map of AtomicOrder to Int)\
    **requires** `compositeOrder` exists.\
    **effects** Returns `compositeOrder.optimalPurchase`.

  \_getOrderCost (compositeOrder: CompositeOrder): (totalCost: Float)\
    **requires** `compositeOrder` exists.\
    **effects** Returns the `totalCost` of the `compositeOrder`.