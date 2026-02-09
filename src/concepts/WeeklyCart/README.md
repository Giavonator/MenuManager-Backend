
## WeeklyCart

**concept** WeeklyCart [Menu]

**purpose** Organize menus for a specific week into a coherent cart for ease of organization.

**principle** A user `createCart` for the week starting "Sunday, Jan 1" by providing any day within that week, e.g., "Monday, Jan 2". They then `addMenuToCart` for "Monday Spaghetti", "Wednesday Pizza", and "Friday Tacos" enabling a comprehensive grouping of the week's meals. User can then `removeMenuFromCart` "Wednesday Pizza" when they decide it is not needed anymore.

**state**\
  a set of Cart with // must be no overlap in cart dates\
    a startDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always a Sunday for the week the cart represents\
    an endDate Date // Conform to 'YYYY-MM-DD', date-only type no time, always the Saturday of the same week as startDate\
    a menus Set of Menu\

**actions**\
  createCart (dateInWeek: Date): (cart: Cart)\
    **requires** the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.\
    **effects** Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with this `startDate` and `endDate`. It will have an empty set of `menus`.

  deleteCart (dateInWeek: Date): (cart: Cart)\
    **requires** there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.\
    **effects** Deletes `cart`.

  addMenuToCart (menu: Menu, menuDate: Date): (cart: Cart)\
    **requires** `menu` exists and a `cart` exists whose `startDate` and `endDate` range *contains* `menuDate`.\
    **effects** Adds `menu` to `cart`. Return `cart` menu was added to.

  removeMenuFromCart (menu: Menu): (cart: Cart)\
    **requires** `menu` exists in a `cart.menus`.\
    **effects** Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.

**queries**\
  _getCartDates (cart: Cart): (startDate: Date, endDate: Date)\
    **requires** `cart` exists.\
    **effects** Returns `cart` `startDate` and `endDate`.

  _getMenusInCart (cart: Cart): (menus: Set of Menu)\
    **requires** `cart` exists.\
    **effects** Returns the set of all `Menu` IDs associated with the given `cart`.

  _getCartByDate (date: Date): (cart: Cart)\
    **requires** true.\
    **effects** Returns the `cart` for that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.

  _getCartWithMenu (menu: Menu): (cart: Cart)\
    **requires** true.\
    **effects** Returns the `cart` that contains `menu` in its `menus` array. If no such cart exists, returns empty.