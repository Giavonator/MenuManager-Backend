
# MenuManager (AI Augmentation)

**concept** Menu [User]

**purpose** creating recipes for full course meals

**principle** A friendly chef embarks on their journey of creating a delicious five course menu with amazing different recipes. They *createMenu* with the specific date of the event and starts by adding their first recipe. Creating their first recipe: *createRecipe*. As they are adding ingredients they realize that most of them haven't been used before. They then *enterItem* into the system with appropriate price and quantity information for each new ingredient, allowing them to *updateRecipeIngredient* to their recipe with the appropriate amount of the ingredient they want have for their recipe. They continue finishing up the recipe with additional *updateRecipeIngredient* when they realize they put the wrong recipe name, and change it via *updateRecipe*. Luckily a NEW LLM feature has been added that allows the chef to directly *pullRecipeFromWebsite* using website URL. The LLM is able to parse a good amount of the recipe, but the chef must *updateRecipeIngredient* and *updateRecipe* for a couple things. If the LLM is also unable to add a couple items, thats okay, the chef will simply *updateRecipeIngredient* to add new ingredients. Unfortunately for the chefs second recipe they have it on paper, but they are still able to enter it in manually. A couple days later once our chef is done adding recipes to their menu, the administrator comes in and sees they added the new pumpernickel ingredient. The administrator figures out what the cost and where to purchase the item and *updateItem* in the system. Finally, the menu is all done and confirmed!

**state**  
    a set of Menu with\
            a set of Recipe with\
                     a set of Item with\
                              an amount Int\
                     a name String\
                     an instructions String\
                     a dishPrice Float\
                     a servingQuantity Int\
                     a scalingFactor Float\
                     a dishType String\
                     an owner User\
            a name String\
            an owner User\
            a menuCost Float\
            a date String\
.\
    a set of Item with\
            a Set of String names\ // Ex. {'pepper', 'ground pepper', 'course pepper'}
            a price Float\
            a quantity Float // Ex. 3\
            a units String // Ex. "lbs"\
            a store String\
            a confirmed Bool
.\
    a set of Cart with\
            a startDate String\
            an endDate String\
            a set of Menu\
            a weeklyCost Float\

**actions**\
    createMenu (name: String, date: String): (menu: Menu)\
            **effects** returns new empty menu that is owned by calling user, and has name/date attributes\
    updateMenu (menu: Menu, name: String)\
    updateMenu (menu: Menu, date: String)\
            **requires** menu exists, calling user owns menu\
            **effects** update the given attribute\
.\
    pullRecipeFromWebsite(menu: Menu, recipeURL: String): (recipe: Recipe)\
            **requires** menu exists, calling user owns menu, recipeURL is a valid URL\
            **effects** Using an LLM prompt to parse through the online recipeURL, creates recipe with all the ingredients it was able to parse, it will not add new ingredients that haven't been added to the system before \
    createRecipe (menu: Menu, name: String, instructions: String, servingQuantity: Int, dishType: String, scalingFactor: Float): (recipe: Recipe)\
            **requires** menu exists, calling user owns menu \
            **effects** adds recipe with no ingredients to the menu\
    updateRecipeIngredient (menu: Menu, recipe: Recipe, item: Item, amount: Int)\
            **requires** menu exists, recipe exists in menu, calling user owns menu\
            **effects** recipe updated to have appropriate scaling of item; dishPrice and menuCost reflect new change\
    updateRecipe (menu: Menu, recipe: Recipe, instructions: String)\
    updateRecipe (menu: Menu, recipe: Recipe, servingQuantity: Int)\
    updateRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)\
    updateRecipe (menu: Menu, recipe: Recipe, dishType: String)\
    updateRecipe (menu: Menu, recipe: Recipe, name: String)\
            **requires** menu exists, recipe exists in menu, calling user owns menu\
            **effects** update the given attribute\
.\
    enterItem (name: String, price: Float, quantity: Float, units: String, store: String): (item: Item)\
            **requires** no Item already exists with name\
            **effects** returns and stores new item, confirmed flag set to false\
    confirmItem (item: Item): (item: Item)\
            **requires** item exists, item hasn't been confirmed yet, called by Administrator\
            **effects** returned item is now confirmed\
    updateItem (item: Item, price: Float)\
    updateItem (item: Item, quanitity: Float)\
    updateItem (item: Item, units: String)\
    updateItem (item: Item, store: String)\
            **requires** item exists, called by Administrator\
            **effects** update the given attribute\
    addItemName (item: Item, name: String)\
            **requires** item exists, called by Administrator\
            **effects** item now has new name that it can be referenced by\
    removeItemName (item: Item, name: String)\
            **requires** item exists, item has name, called by Administrator\
            **effects** item can no longer be referenced by name\
.\
    createCart (startDate: String)\
            **requires** startDate is a Sunday, no cart already exists with startDate\
            **effects** creates empty cart with startDate and endDate that Friday\
    addMenuToCart (cart: Cart, menu: Menu)\
            **requires** cart exists, menu exists, cart doesn't already have a menu for that menus date\
            **effects** adds menu to the cart and appropriately adjusts cart price\
    adjustRecipeScale (cart: Cart, menu: Menu, recipe: recipe, scalingFactor: Int)\
            **requires** cart, menu, and recipe all exist, recipe in menu, menu in cart\
            **effects** within the cart adjusts to have the new scaling factor of specified recipe in menu, adjust cart price appropriately \
    adjustItemQuantity (cart: Cart, menu: Menu, item: Item, quantity: Int)\
            **requires** cart, menu, and item all exist, item in some recipe in menu, menu in cart\
            **effects** within the cart adjusts number of item purchased to quantity, adjust cart price appropriately \

**queries**\
    _getMenusInCart (cart: Cart): (menus: Set of Menu)\
            **requires** cart exists\
            **effects** returns the set of all Menu entities associated with the given cart.

    _getRecipesInMenu (menu: Menu): (recipes: Set of Recipe)\
            **requires** menu exists\
            **effects** returns the set of all Recipe entities associated with the given menu.

    _getIngredientsInRecipe (recipe: Recipe): (ingredients: Map of Item to Float)\
            **requires** recipe exists\
            **effects** returns a map where each key is an Item and the value is the total scaled quantity (Float) of that item needed for the given recipe, calculated as `item.amount * recipe.scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.

    _getIngredientsInMenu (menu: Menu): (ingredients: Map of Item to Float)\
            **requires** menu exists\
            **effects** returns a map where each key is an Item and the value is the total aggregated quantity (Float) of that item needed across all recipes within the given menu, considering each recipe's `scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.

    _getListOfItems (): (items: Set of Item)\
            **requires** nothing\
            **effects** returns a set of all items stored within the application.

    _getIngredientsPerStore (menus: Set of Menu): (storeShoppingList: Map of String to (Map of Item to Float))\
            **requires** all menus in the input set exist\
            **effects** returns a map where each key is a `store` name (String) and the value is another map. This inner map has `Item` keys and their total aggregated quantity (Float) values, representing the total amount of each item needed from that store across all specified menus, considering recipe scaling factors. The `Item`'s `units` property indicates the unit of the quantity.

    _getMenuByDate (date: String): (menu: Menu)\
            **requires** menu exists for date\
            **effects** returns the menu associated with that date.

    _getMenusOwnedByUser (user: User): (menus: Set of Menu)\
            **requires** user exists\
            **effects** returns the set of all Menu entities where the `owner` attribute matches the given user.
