## CartOrder

**concept** CartOrder [Menu, Recipe, Item, PurchaseOption]

**purpose** Organize menus for a specific week and act as the single source of truth for aggregated ingredients and optimally calculated grocery costs.

**principle** A user `createCart` for the week starting "Sunday, Jan 1". They `addMenuToCart` for "Monday Spaghetti". The system eagerly triggers an aggregation pipeline and uses `saveCalculation` to store the flattened ingredient list and the optimally distributed costs (total, per menu, and per recipe). If a user modifies a menu or recipe, the system immediately recalculates the optimal grocery list and updates the cart's ledger.

**state**
  a set of Cart with // must be no overlap in cart dates
    a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday
    a endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday
    a menus Set of Menu
    // --- Calculation Storage ---
    a totalCost Float // Bottom-line optimized cost for the entire cart
    a menuCosts Map of Menu to Float // Proportional cost per menu based on shared ingredients
    a recipeCostsByMenu Map of Menu to (Map of Recipe to Float) // Proportional cost per recipe within a specific menu
    a aggregatedItems Set of Object // Stores the finalized grocery list snapshot (item, required qty, mapped purchase options)
    a lastCalculatedAt Date // Timestamp of the last successful aggregation pipeline run

**actions**
  createCart (dateInWeek: Date): (cart: Cart)
    **requires** the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.
    **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with empty menus, 0 costs, empty `aggregatedItems`, and a null `lastCalculatedAt`.

  deleteCart (dateInWeek: Date): (cart: Cart)
    **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.
    **effects** Deletes `cart`.

  addMenuToCart (menu: Menu, menuDate: Date): (cart: Cart)
    **requires** `menu` exists and a `cart` exists whose `startDate` and `endDate` range *contains* `menuDate`.
    **effects** Adds `menu` to `cart`. Return `cart` menu was added to.

  removeMenuFromCart (menu: Menu): (cart: Cart)
    **requires** `menu` exists in a `cart.menus`.
    **effects** Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.

  saveCalculation (cart: Cart, totalCost: Float, menuCosts: Map, recipeCostsByMenu: Map, aggregatedItems: Set): (cart: Cart)
    **requires** `cart` exists.
    **effects** Updates `cart.totalCost`, `cart.menuCosts`, `cart.recipeCostsByMenu`, and `cart.aggregatedItems` with the provided calculated values. Updates `cart.lastCalculatedAt` to the current system time. Return updated `cart`.

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