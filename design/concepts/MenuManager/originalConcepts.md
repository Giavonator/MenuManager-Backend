
# Menu (Seperated Original)

## 1. ItemStore

**concept** ItemStore [User, Administrator]\
**purpose** store data regarding items necessary for purchase\
**principle** A user would like to purchase a new item that hasn't been purchased before. They can *enter* that new item into the system with sample data they find online. Later, the Administrator can *confirm* that new item and its data before being purchased. If the data of that item ever changes (cost, store no longer has it) the Administrator is able to *update* its data.\
**state**  
    a set of Item with\
        a name String\
        a price Float\
        a quantity Float // Ex. 3\
        a units String // Ex. "lbs"\
        a store String\
        a confirmed Bool

**actions**\
    enter (name: String, price: Float, quantity: Float, units: String, store: String): (item: Item)\
            **requires** no Item already exists with name\
            **effects** returns and stores new Item with all passed in data\
    confirm (name: String, price: Float, quantity: Float, units: String, store: String): (item: Item)\
            **requires** Item exists with name and hasn't been confirmed yet, called by Administrator\
            **effects** returned item is now confirmed\
    update (name: String, price: Float)\
    update (name: String, quanitity: Float)\
    update (name: String, units: String)\
    update (name: String, store: String)\
            **requires** Item exists with name, called by Administrator\
            **effects** update the given attribute\

Note: The quantity and units is the size of the item the store sells it by. The purpose of having users enter items is so that they are able to see an estimate of the cost, and then once the admin go in they can confirm and finalize everything associated with that item.

## 2. PlatMaison

**concept** PlatMaison [Item, User]\
**purpose** grouping of necessary items to make a particular dish \
**principle** A user would like to make a certain dish and needs the ingredients to make it. In order to purchase said ingredients they *create* a dish and then *updateIngredient* to add/update/remove ingredients as needed. They are able to *update* the attibutes to their recipe as needed afterwards as well. \
**state**  
    a set of Recipe with\
        a set of Item with\
              an amount Int\
        a name String\
        an instructions String\
        a dishPrice Float\
        a servingQuantity Int\
        a dishType String\
        an owner User

**actions**\
    create (name: String, instructions: String, servingQuantity: Int, dishType: String): (recipe: Recipe)\
            **effects** returns new empty recipe with name, instrucitons, and servingQuantity attributes that is owned by calling user\
    updateIngredient (recipe: Recipe, item: Item, amount: Int)\
            **requires** recipe exists, calling user owns recipe\
            **effects** recipe updated to contain item with set amoung, price of recipe updates appropriately\
    update (recipe: Recipe, instructions: String)\
    update (recipe: Recipe, servingQuantity: Int)\
    update (recipe: Recipe, dishType: Int)\
    update (recipe: Recipe, name: String)\
            **requires** recipe exists, calling user owns recipe\
            **effects** update the given attribute

## 3. MenuDuJour

**concept** MenuDuJour [Recipe, User]\
**purpose** organization of recipes necessary for a meal \
**principle** A user needs to plan a several course meal with a variety of dishes to eat. They can *createMenu* and then *addRecipe* with the necessary scaling factors to feed the amount of people they need to serve. If they so desire they can also *update* their menu's information.\
**state**  
    a set of Menu with\
        a set of Recipe with\
              an scalingFactor Int\
        a name String\
        an owner User\
        a menuCost Float\
        a date String\

**actions**\
    createMenu (name: String, date: String): (menu: Menu)\
            **effects** returns new empty menu that is owned by calling user, and has name/date attributes\
    addRecipe (menu: Menu, recipe: Recipe, scalingFactor: Int)\
            **requires** menu exists, recipe exists, calling user owns menu \
            **effects** adds recipe and scaling to menu, updates menuCost appropriately\
    updateRecipeScaling (menu: Menu, recipe: Recipe, scalingFactor: Int)\
            **requires** menu exists, recipe exists, calling user owns menu\
            **effects** adjusts recipe scaling to menu (removing from menu if zero), updates menuCost appropriately\
    update (menu: Menu, name: String)\
    update (menu: Menu, date: String)\
            **requires** menu exists, calling user owns menu\
            **effects** update the given attribute\

## 4. ShoppingCart

**concept** WeeklyShoppingCart [Menu, Recipe, Item, Administrator, User]\
**purpose** organization of menus for the week to buy all necessary ingredients \
**principle** An administrator must buy the ingredients for all of the menus for that week. As *addMenu* is passing in menus, all of their ingredients will be added to the cart for the week of that menu. Administrators can then see aggregation of ingredients and cost and determine whether they need to modify scaling of Menus or Recipes using *adjustRecipeScale* or *adjustItemScale*.\
**state**  
    a set of Cart with\
        a set of Menu\
        a cartCost Float\
        a startDate String\
        a endDate String\

**actions**\
    createCart (name: String, date: String): (cart: Cart)\
            **effects** returns new empty cart with the date range Sun-Sat of the date that was passed in\
    addMenu (cart: Cart, menu: Menu)\
            **requires** cart exists, menu exists, menu date falls within cart dateRange\
            **effects** menu along with all of its ingredients are added to the cart\
    deleteMenu (cart: Cart, menu: Menu)\
            **requires** cart exists, menu exists, menu is in cart\
            **effects** menu along with all of its ingredients are removed from the cart\
    adjustRecipeScale (cart: Cart, menu: Menu, recipe: recipe, scalingFactor: Int)\
            **requires** cart, menu, and recipe all exist, recipe in menu, menu in cart\
            **effects** within the cart adjusts to have the new scaling factor of specified recipe in menu, adjust cart price appropriately \
    adjustItemQuantity (cart: Cart, menu: Menu, item: Item, quantity: Int)\
            **requires** cart, menu, and item all exist, item in some recipe in menu, menu in cart\
            **effects** within the cart adjusts number of item purchased to quantity, adjust cart price appropriately \

Note: Administrators adjusting scaling will not directly alter menu or recipes, but rather just the cart.
