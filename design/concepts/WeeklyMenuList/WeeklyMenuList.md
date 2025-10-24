
## WeeklyMenuList

**concept** WeeklyMenuList [User, Menu, Order]

**purpose** Organize menus into weekly shopping lists, grouping them by a specific date range for consolidated purchasing.

**principle** A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2". They then `addMenuToCart` for "Monday Dinner" and "Wednesday Lunch". If "Wednesday Lunch" menu is later removed (e.g., due to cancellation), they `removeMenuFromCart`. An `Order` is automatically created (in PurchaseSystem) for this cart, aggregating all menu orders within it.

**state**\
  a set of Cart with\
    a startDate String // Ex. "YYYY-MM-DD", always a Sunday for the week the cart represents\
    an endDate String // Ex. "YYYY-MM-DD", always the Friday of the same week as startDate\
    an owner User // Reference to an external User entity (should be an admin)\
    a menus Set of Menu // Set of MenuIDs (from MenuCollection)\
    an order Order // Reference to an external Order entity (from PurchaseSystem) representing this cart's total order\

**actions**\
  createCart (dateInWeek: String, owner: User): (cart: Cart)\
    **requires** `dateInWeek` is a valid date (e.g., "YYYY-MM-DD" format), `owner` exists. No other `Cart` exists for this `owner` for the week containing `dateInWeek`.\
    **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Friday of the same week. Creates a new `Cart` with this `startDate`, `endDate`, and `owner`. It will have an empty set of `menus`. An associated `Order` is expected to be created in `PurchaseSystem` (via syncs) and its ID stored in `cart.order`. Returns the new `Cart` ID.

  addMenuToCart (cart: Cart, menu: Menu)\
    **requires** `cart` exists, `menu` exists (in MenuCollection). The `date` of `menu` (obtained from MenuCollection via syncs/queries) must fall within `cart.startDate` and `cart.endDate`. `cart` must not already contain a menu whose date matches `menu`'s date.\
    **effects** Adds `menu` to `cart.menus`. This will trigger an `addSubOrder` action in `PurchaseSystem` (via syncs) to link `menu`'s order to `cart`'s order.

  removeMenuFromCart (cart: Cart, menu: Menu)\
    **requires** `cart` exists, `menu` exists in `cart.menus`.\
    **effects** Removes `menu` from `cart.menus`. This will trigger a `removeSubOrder` action in `PurchaseSystem` (via syncs) to unlink `menu`'s order from `cart`'s order.

  addOrderToCart (cart: Cart, order: Order)\
    **requires** `cart` exists. `order` exists. `cart` does not already have an associated order.\
    **effects** Sets `cart.order` to `order`.

**queries**\
  _getCartDetails (cart: Cart): (startDate: String, endDate: String, owner: User, orderID: Order)\
    **requires** `cart` exists.\
    **effects** Returns details about the `cart` and its associated `order` ID.

  _getMenusInCart (cart: Cart): (menus: Set of Menu)\
    **requires** `cart` exists.\
    **effects** Returns the set of all `Menu` IDs associated with the given `cart`.

  _getCartByDate (date: String, owner: User): (cart: Cart)\
    **requires** `date` is a valid date, `owner` exists.\
    **effects** Returns the `Cart` for the `owner` whose `startDate` (the Sunday of the week it represents) corresponds to the Sunday of the week containing the input `date`. Returns null if no such cart exists.