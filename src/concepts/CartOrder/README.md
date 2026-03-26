# CartOrder

**concept** CartOrder [Menu, Recipe, Item, PurchaseOption]

**purpose** Organize menus for a specific week and act as the single source of truth for aggregated ingredients and optimally calculated grocery costs.

**principle** A user `createCart` for the week starting "Sunday, Jan 1". They `addMenuToCart` for "Monday Spaghetti". Mutations in related concepts do not eagerly recalculate; they only mark affected carts dirty via `bumpCartVersion` (`dataVersion++`) (including past/current/future carts). When frontend calls `_getCartDetailsBundle`, CartOrder checks freshness (`dataVersion === calculatedVersion`). If stale, it runs `recalculateCart` inline, persists via `saveCalculation`, and then returns a fresh bundle.

**state**
  a set of Cart with // must be no overlap in cart dates
    a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday
    a endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday
    a menus Set of Menu
    // --- Calculation Storage ---
    a totalCost Float // Bottom-line optimized cost for the entire cart
    a menuCosts Map of Menu to Float // Proportional cost per menu based on shared ingredients
    a recipeCostsByMenu Map of Menu to (Map of Recipe to Float) // Proportional cost per recipe within a specific menu
    a aggregatedItems Set of Object // Stores the finalized grocery list snapshot (item, required qty in normalized base units, one chosen purchaseOption object)
    a dataVersion Int // Increments by 1 for each relevant trigger action affecting this cart
    a calculatedVersion Int // Version of the currently stored calculation snapshot

**actions**
  createCart (dateInWeek: Date): (cart: Cart)
    **requires** the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.
    **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with empty menus, 0 costs, empty `aggregatedItems`, and versions initialized to `dataVersion=0`, `calculatedVersion=0`.

  deleteCart (dateInWeek: Date): (cart: Cart)
    **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.
    **effects** Deletes `cart`.

  addMenuToCart (menu: Menu, menuDate: Date): (cart: Cart)
    **requires** `menu` exists and a `cart` exists whose `startDate` and `endDate` range *contains* `menuDate`.
    **effects** Adds `menu` to `cart`. Return `cart` menu was added to.

  removeMenuFromCart (menu: Menu): (cart: Cart)
    **requires** `menu` exists in a `cart.menus`.
    **effects** Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.

  bumpCartVersion (cart: Cart): (cart: Cart, dataVersion: Int)
    **requires** `cart` exists.
    **effects** Increments `cart.dataVersion` by 1 and returns the new `dataVersion`.

  saveCalculation (cart: Cart, totalCost: Float, menuCosts: Map, recipeCostsByMenu: Map, aggregatedItems: Set): (cart: Cart)
    **requires** `cart` exists.
    **effects** Updates `cart.totalCost`, `cart.menuCosts`, `cart.recipeCostsByMenu`, and `cart.aggregatedItems` with the provided calculated values. Sets `cart.calculatedVersion = cart.dataVersion`. Return updated `cart`.

  recalculateCart (cart: Cart): (success: Bool)
    **requires** `cart` exists.
    **effects** Runs a full recalculation for one cart using a lookup-based aggregation flow: cart->menus->recipes->ingredients->items->purchaseOptions. Aggregates item demand, selects one optimal purchase option per item using whole-package rounding (`ceil(totalRequired / option.quantity)`), normalizes quantities to the winning option's units, prorates item costs into `menuCosts` and `recipeCostsByMenu`, then persists via `saveCalculation`.

**queries**
  _getCartDates (cart: Cart): (startDate: Date, endDate: Date)
    **requires** `cart` exists.
    **effects** Returns `cart` `startDate` and `endDate`.

  _getMenusInCart (cart: Cart): (menus: Set of Menu)
    **requires** `cart` exists.
    **effects** Returns the set of all `Menu` IDs associated with the given `cart`.

  _getCartByDate (date: Date): (cart: Cart)
    **requires** true.
    **effects** Returns the `cart` that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.

  _getCartWithMenu (menu: Menu): (cart: Cart)
    **requires** true.
    **effects** Returns the `cart` that contains `menu` in its `menus` array. If no such cart exists, returns empty.

  _getCartCosts (cart: Cart): (totalCost: Float, menuCosts: Map, recipeCostsByMenu: Map)
    **requires** `cart` exists.
    **effects** Returns the complete pricing breakdown stored in the cart.

  _getCartDetailsBundle (weekStart: Date): (cart: Object, menus: Set of Object, aggregatedItems: Set of Object)
    **requires** A `cart` exists whose `startDate` is `weekStart`.
    **effects** Returns one hydrated payload for frontend consumption. It includes:
      - cart metadata (`id`, `startDate`, `endDate`, `totalCost`, `dataVersion`, `calculatedVersion`)
      - menu list with menu `ownerId` and `ownerName` (from `UserAuthentication.username`, fallback `"USER_NOT_FOUND"`), name/date/cost, recipe list, and menu-level `aggregatedItems` sourcing payload
      - per-recipe details (`name`, `scalingFactor`, `cost`) and scaled ingredient display rows
      - top-level `aggregatedItems` using the stored cart snapshot, with a single `purchaseOption` mapped to UI-minimal fields (`store`, `quantityToBuy`, `cost`, `confirmed`).
      - menu-level `aggregatedItems` are also returned with a single UI-minimal `purchaseOption` for ingredient sourcing by menu.
        - `confirmed` comes from `StoreCatalog.purchaseOptions.confirmed` for the chosen purchase option.
      Before hydration, if `dataVersion !== calculatedVersion`, query runs `recalculateCart` inline and only then returns.
