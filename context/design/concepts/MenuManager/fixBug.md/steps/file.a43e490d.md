---
timestamp: 'Thu Oct 16 2025 12:11:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_121117.fbe7f56c.md]]'
content_id: a43e490d427dbec9043c49e1ac341271088d514de799f6fdc572296db2de3739
---

# file: src/concepts/MenuManager/MenuManagerConcept.ts

```typescript
import { Collection, Db, MongoClient } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "MenuManager" + ".";

// Generic types of this concept
type User = ID;
type Menu = ID;
type Recipe = ID;
type Item = ID;
type Cart = ID;

/**
 * Interface for a Menu entity.
 * purpose: creating recipes for full course meals
 * state: a set of Menu with
 *   a name String
 *   an owner User
 *   a menuCost Float
 *   a date String
 *   a set of Recipe (these will be stored in a separate collection, linked by menuId)
 */
interface MenuDoc {
  _id: Menu;
  name: string;
  owner: User;
  menuCost: number; // Calculated, not fixed.
  date: string; // YYYY-MM-DD
}

/**
 * Interface for an ingredient within a Recipe.
 * state: a set of Item with an amount Int (part of Recipe)
 */
interface RecipeIngredient {
  itemId: Item;
  amount: number; // Amount needed for the recipe in its base serving quantity
}

/**
 * Interface for a Recipe entity.
 * state: a set of Recipe with
 *   a set of Item with an amount Int (RecipeIngredient)
 *   a name String
 *   an instructions String
 *   a dishPrice Float
 *   a servingQuantity Int
 *   a scalingFactor Float
 *   a dishType String
 *   an owner User (owner of the menu it belongs to)
 */
interface RecipeDoc {
  _id: Recipe;
  menuId: Menu; // Foreign key to MenuDoc
  name: string;
  instructions: string;
  dishPrice: number; // Calculated.
  servingQuantity: number;
  scalingFactor: number; // Multiplier for ingredients and price
  dishType: string;
  owner: User; // Inherited from menu owner
  ingredients: RecipeIngredient[];
}

/**
 * Interface for a global Item entity.
 * state: a set of Item with
 *   a Set of String names
 *   a price Float
 *   a quantity Float
 *   a units String
 *   a store String
 *   a confirmed Bool
 */
interface ItemDoc {
  _id: Item;
  names: string[]; // Ex. {'pepper', 'ground pepper', 'course pepper'}
  price: number; // Price for the 'quantity' in 'units' (e.g., $3.00 for 1.5 lbs)
  quantity: number; // Quantity available for 'price' (e.g., 1.5 lbs)
  units: string; // Ex. "lbs", "each", "pack"
  store: string;
  confirmed: boolean;
}

/**
 * Interface for a Cart entity.
 * state: a set of Cart with
 *   a startDate String
 *   an endDate String
 *   a set of Menu (linked by menuIds)
 *   a weeklyCost Float
 */
interface CartDoc {
  _id: Cart;
  startDate: string; // "YYYY-MM-DD", must be a Sunday
  endDate: string; // "YYYY-MM-DD", automatically Friday of the same week
  menuIds: Menu[]; // Array of foreign keys to MenuDoc
  weeklyCost: number; // Calculated
}

/**
 * Structure expected from LLM for a parsed recipe.
 */
interface ParsedRecipe {
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  ingredients: Array<{ name: string; amount: number }>;
}

// --- Action Input/Output Types ---

// createMenu (name: String, date: String): (menu: Menu)
type CreateMenuInput = { name: string; date: string; owner: User };
type CreateMenuOutput = { menu: Menu } | { error: string };

// updateMenu (menu: Menu, name: String)
type UpdateMenuNameInput = { menu: Menu; name: string };
type UpdateMenuNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateMenu (menu: Menu, date: String)
type UpdateMenuDateInput = { menu: Menu; date: string };
type UpdateMenuDateOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// pullRecipeFromWebsite(menu: Menu, recipeURL: String): (recipe: Recipe)
type PullRecipeFromWebsiteInput = {
  menu: Menu;
  recipeURL: string;
  owner: User;
};
type PullRecipeFromWebsiteOutput = { recipe: Recipe } | { error: string };

// createRecipe (menu: Menu, name: String, instructions: String, servingQuantity: Int, dishType: String, scalingFactor: Float): (recipe: Recipe)
type CreateRecipeInput = {
  menu: Menu;
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  scalingFactor: number;
  owner: User;
};
type CreateRecipeOutput = { recipe: Recipe } | { error: string };

// updateRecipeIngredient (menu: Menu, recipe: Recipe, item: Item, amount: Int)
type UpdateRecipeIngredientInput = {
  menu: Menu;
  recipe: Recipe;
  item: Item;
  amount: number;
};
type UpdateRecipeIngredientOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, instructions: String)
type UpdateRecipeInstructionsInput = {
  menu: Menu;
  recipe: Recipe;
  instructions: string;
};
type UpdateRecipeInstructionsOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, servingQuantity: Int)
type UpdateRecipeServingQuantityInput = {
  menu: Menu;
  recipe: Recipe;
  servingQuantity: number;
};
type UpdateRecipeServingQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)
type UpdateRecipeScalingFactorInput = {
  menu: Menu;
  recipe: Recipe;
  scalingFactor: number;
};
type UpdateRecipeScalingFactorOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, dishType: String)
type UpdateRecipeDishTypeInput = {
  menu: Menu;
  recipe: Recipe;
  dishType: string;
};
type UpdateRecipeDishTypeOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, name: String)
type UpdateRecipeNameInput = { menu: Menu; recipe: Recipe; name: string };
type UpdateRecipeNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// enterItem (name: String, price: Float, quantity: Float, units: String, store: String): (item: Item)
type EnterItemInput = {
  name: string;
  price: number;
  quantity: number;
  units: string;
  store: string;
};
type EnterItemOutput = { item: Item } | { error: string };

// confirmItem (item: Item): (item: Item)
type ConfirmItemInput = { item: Item };
type ConfirmItemOutput = { item: Item } | { error: string };

// updateItem (item: Item, price: Float)
type UpdateItemPriceInput = { item: Item; price: number };
type UpdateItemPriceOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, quantity: Float) - corrected typo from spec 'quanitity'
type UpdateItemQuantityInput = { item: Item; quantity: number };
type UpdateItemQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, units: String)
type UpdateItemUnitsInput = { item: Item; units: string };
type UpdateItemUnitsOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, store: String)
type UpdateItemStoreInput = { item: Item; store: string };
type UpdateItemStoreOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// addItemName (item: Item, name: String)
type AddItemNameInput = { item: Item; name: string };
type AddItemNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// removeItemName (item: Item, name: String)
type RemoveItemNameInput = { item: Item; name: string };
type RemoveItemNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// createCart (startDate: String)
type CreateCartInput = { startDate: string };
type CreateCartOutput = { cart: Cart } | { error: string };

// addMenuToCart (cart: Cart, menu: Menu)
type AddMenuToCartInput = { cart: Cart; menu: Menu };
type AddMenuToCartOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// adjustRecipeScale (cart: Cart, menu: Menu, recipe: Recipe, scalingFactor: Float) - corrected typos from spec
type AdjustRecipeScaleInput = {
  cart: Cart;
  menu: Menu;
  recipe: Recipe;
  scalingFactor: number;
};
type AdjustRecipeScaleOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// adjustItemQuantity (cart: Cart, menu: Menu, item: Item, quantity: Int)
type AdjustItemQuantityInput = {
  cart: Cart;
  menu: Menu;
  item: Item;
  quantity: number;
};
type AdjustItemQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// --- Query Input/Output Types ---

// _getMenusInCart (cart: Cart): (menus: Set of Menu)
type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = { menus: MenuDoc[] } | { error: string };

// _getRecipesInMenu (menu: Menu): (recipes: Set of Recipe)
type GetRecipesInMenuInput = { menu: Menu };
type GetRecipesInMenuOutput = { recipes: RecipeDoc[] } | { error: string };

// _getIngredientsInRecipe (recipe: Recipe): (ingredients: Map of Item to Float)
type GetIngredientsInRecipeInput = { recipe: Recipe };
type GetIngredientsInRecipeOutput =
  | { ingredients: Record<Item, { amount: number; units: string }> }
  | { error: string };

// _getIngredientsInMenu (menu: Menu): (ingredients: Map of Item to Float)
type GetIngredientsInMenuInput = { menu: Menu };
type GetIngredientsInMenuOutput =
  | { ingredients: Record<Item, { amount: number; units: string }> }
  | { error: string };

// _getListOfItems (): (items: Set of Item)
type GetListOfItemsInput = Empty; // No specific input, but actions/queries expect an object
type GetListOfItemsOutput = { items: ItemDoc[] }; // Does not return error per current implementation

// _getIngredientsPerStore (menus: Set of Menu): (storeShoppingList: Map of String to (Map of Item to Float))
type GetIngredientsPerStoreInput = { menus: Menu[] };
type GetIngredientsPerStoreOutput = {
  storeShoppingList: Record<
    string,
    Record<Item, { amount: number; units: string }>
  >;
}; // Does not return error per current implementation, handles missing menus internally

// _getMenuByDate (date: String): (menu: Menu)
type GetMenuByDateInput = { date: string };
type GetMenuByDateOutput = { menu: MenuDoc } | { error: string };

// _getMenusOwnedByUser (user: User): (menus: Set of Menu)
type GetMenusOwnedByUserInput = { user: User };
type GetMenusOwnedByUserOutput = { menus: MenuDoc[] }; // Does not return error per current implementation

/**
 * @concept MenuManager
 * @purpose creating recipes for full course meals
 * @principle A friendly chef embarks on their journey of creating a delicious five course menu with amazing different recipes. They *createMenu* with the specific date of the event and starts by adding their first recipe. Luckily a NEW LLM feature has been added that allows the chef to directly *pullRecipeFromWebsite* using website URL. The LLM is able to parse a good amount of the recipe, but the chef must *updateRecipeIngredient* and *updateRecipe* for a couple things. Unfortunately for the chefs second recipe they have it on paper, but they are still able to enter it in manually. They start by adding their second recipe: *createRecipe*. As they are about to *updateRecipeIngredient* they realize that pumpernickel is not registered as an item they've cooked with before. They then *enterItem* into the system with appropriate price and quantity information, allowing them to *updateRecipeIngredient* to their recipe with the appropriate amount of the ingredient they want have for their recipe. They continue finishing up the recipe when they realize they put the wrong recipe name, and change it via *updateRecipe*. A couple days later once our chef is done adding recipes to their menu, the administrator comes in and sees they added the new pumpernickel ingredient. The administrator figures out what the cost and where to purchase the item and *updateItem* in the system. Finally, the menu is all done and confirmed!
 */
export default class MenuManagerConcept {
  private menus: Collection<MenuDoc>;
  private recipes: Collection<RecipeDoc>;
  private items: Collection<ItemDoc>;
  private carts: Collection<CartDoc>;
  private llm: GeminiLLM; // LLM instance for recipe parsing

  constructor(private readonly db: Db, llmConfig: { apiKey: string }) {
    this.menus = this.db.collection(PREFIX + "menus");
    this.recipes = this.db.collection(PREFIX + "recipes");
    this.items = this.db.collection(PREFIX + "items");
    this.carts = this.db.collection(PREFIX + "carts");
    this.llm = new GeminiLLM(llmConfig);
  }

  // --- Internal Helper Functions ---

  /**
   * Helper to find an item by any of its names.
   * @param name The name to search for.
   * @returns The ItemDoc if found, otherwise null.
   */
  private async findItemByName(name: string): Promise<ItemDoc | null> {
    const item = await this.items.findOne({ names: name });
    return item;
  }

  /**
   * Helper to calculate the price of a single dish, considering its ingredients and scaling factor.
   * @param recipe The recipe document.
   * @returns The calculated dish price.
   */
  private async calculateDishPrice(recipe: RecipeDoc): Promise<number> {
    let price = 0;
    for (const ingredient of recipe.ingredients) {
      const itemDoc = await this.items.findOne({ _id: ingredient.itemId });
      if (itemDoc && itemDoc.quantity > 0) {
        // Price per unit * amount needed
        price += (itemDoc.price / itemDoc.quantity) * ingredient.amount;
      } else if (!itemDoc) {
        console.warn(
          `Ingredient item ${ingredient.itemId} not found for recipe ${recipe._id}`,
        );
      }
    }
    return price * recipe.scalingFactor;
  }

  /**
   * Helper to calculate the total cost of all recipes in a menu.
   * @param menu The menu document.
   * @returns The calculated menu cost.
   */
  private async calculateMenuCost(menu: MenuDoc): Promise<number> {
    const recipesInMenu = await this.recipes.find({ menuId: menu._id })
      .toArray();
    let totalCost = 0;
    for (const recipe of recipesInMenu) {
      totalCost += await this.calculateDishPrice(recipe);
    }
    return totalCost;
  }

  /**
   * Helper to update a menu's stored cost after changes.
   * @param menuId The ID of the menu to update.
   */
  private async updateMenuCost(menuId: Menu): Promise<void> {
    const menu = await this.menus.findOne({ _id: menuId });
    if (menu) {
      const newCost = await this.calculateMenuCost(menu);
      await this.menus.updateOne({ _id: menuId }, {
        $set: { menuCost: newCost },
      });
    }
  }

  /**
   * Helper to calculate the total cost of all menus in a cart.
   * @param cart The cart document.
   * @returns The calculated weekly cost.
   */
  private async calculateCartWeeklyCost(cart: CartDoc): Promise<number> {
    let totalCost = 0;
    for (const menuId of cart.menuIds) {
      const menu = await this.menus.findOne({ _id: menuId });
      if (menu) {
        totalCost += await this.calculateMenuCost(menu);
      }
    }
    return totalCost;
  }

  /**
   * Helper to update a cart's stored weekly cost after changes.
   * @param cartId The ID of the cart to update.
   */
  private async updateCartWeeklyCost(cartId: Cart): Promise<void> {
    const cart = await this.carts.findOne({ _id: cartId });
    if (cart) {
      const newCost = await this.calculateCartWeeklyCost(cart);
      await this.carts.updateOne({ _id: cartId }, {
        $set: { weeklyCost: newCost },
      });
    }
  }

  /**
   * Helper to recalculate all costs (dish, menu, cart) when an item's base properties change.
   * @param itemId The ID of the item that was updated.
   */
  private async recalculateAllCostsForItem(itemId: Item): Promise<void> {
    const recipesUsingItem = await this.recipes.find({
      "ingredients.itemId": itemId,
    }).toArray();
    for (const recipe of recipesUsingItem) {
      // Update dish price for each affected recipe
      await this.recipes.updateOne(
        { _id: recipe._id },
        { $set: { dishPrice: await this.calculateDishPrice(recipe) } },
      );
      // Update menu cost for the menu this recipe belongs to
      await this.updateMenuCost(recipe.menuId);
      // Update cart costs for any carts containing this menu
      const cartsContainingMenu = await this.carts.find({
        menuIds: recipe.menuId,
      }).toArray();
      for (const cart of cartsContainingMenu) {
        await this.updateCartWeeklyCost(cart._id);
      }
    }
  }

  // --- Actions ---

  /**
   * @action createMenu
   * @effects returns new empty menu that is owned by calling user, and has name/date attributes
   */
  async createMenu(input: CreateMenuInput): Promise<CreateMenuOutput> {
    const { name, date, owner } = input;
    const newMenuId = freshID();
    const newMenu: MenuDoc = {
      _id: newMenuId,
      name,
      owner,
      menuCost: 0,
      date,
    };
    await this.menus.insertOne(newMenu);
    return { menu: newMenuId };
  }

  /**
   * @action updateMenu (name)
   * @requires menu exists, calling user owns menu
   * @effects update the given attribute
   */
  async updateMenuName(
    input: UpdateMenuNameInput,
  ): Promise<UpdateMenuNameOutput> {
    const { menu: menuId, name } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    await this.menus.updateOne({ _id: menuId }, { $set: { name } });
    return { success: true };
  }

  /**
   * @action updateMenu (date)
   * @requires menu exists, calling user owns menu
   * @effects update the given attribute
   */
  async updateMenuDate(
    input: UpdateMenuDateInput,
  ): Promise<UpdateMenuDateOutput> {
    const { menu: menuId, date } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    // Basic date format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: `Invalid date format "${date}". Expected YYYY-MM-DD.` };
    }
    await this.menus.updateOne({ _id: menuId }, { $set: { date } });
    return { success: true };
  }

  /**
   * @action pullRecipeFromWebsite
   * @requires menu exists, calling user owns menu, recipeURL is a valid URL
   * @effects Using an LLM prompt to parse through the online recipeURL, creates recipe with all the information that it was able to parse and user can *updateIngredient* as necessary
   */
  async pullRecipeFromWebsite(
    input: PullRecipeFromWebsiteInput,
  ): Promise<PullRecipeFromWebsiteOutput> {
    const { menu: menuId, recipeURL, owner } = input;
    const menu = await this.menus.findOne({ _id: menuId, owner });
    if (!menu) {
      return {
        error: `Menu with ID "${menuId}" not found or not owned by user.`,
      };
    }

    // Basic URL validation
    try {
      new URL(recipeURL);
    } catch {
      return { error: "Invalid recipeURL provided." };
    }

    console.log(`🤖 Requesting recipe parse for URL: ${recipeURL}`);
    const prompt = this.createPullRecipePrompt(recipeURL);
    let responseText: string;
    try {
      responseText = await this.llm.executeLLM(prompt);
      console.log("✅ Received response from Gemini AI!");
    } catch (llmError) {
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "No JSON object found in the LLM response." };
      }

      const parsed: ParsedRecipe = JSON.parse(jsonMatch[0]);
      if (
        !parsed.name || !parsed.instructions || !parsed.servingQuantity ||
        !parsed.dishType || !parsed.ingredients
      ) {
        return { error: "The parsed JSON is missing required fields." };
      }

      // Semantic validation: check if ingredients are mentioned in instructions
      let mentionedIngredients = 0;
      const instructionsText = parsed.instructions.toLowerCase();
      for (const ing of parsed.ingredients) {
        const coreName = ing.name.split(" ").pop()?.toLowerCase() ?? ""; // Get last word for simpler match
        if (coreName && instructionsText.includes(coreName)) {
          mentionedIngredients++;
        }
      }

      const mentionedPercentage = (parsed.ingredients.length > 0)
        ? (mentionedIngredients / parsed.ingredients.length) * 100
        : 100;
      if (parsed.ingredients.length > 0 && mentionedPercentage < 75) {
        console.warn(
          `⚠️ Semantic Validation Failed: Only ${
            mentionedPercentage.toFixed(0)
          }% of ingredients are mentioned in the instructions. This might indicate a poor parse or mismatched data.`,
        );
        // For now, allow it but log a warning. Could be a hard error depending on business logic.
      } else if (parsed.ingredients.length > 0) {
        console.log(
          `✅ Instructions: ${
            mentionedPercentage.toFixed(0)
          }% of ingredients are mentioned, likely matching.`,
        );
      }

      // Create the recipe document
      const newRecipeId = freshID();
      const newRecipeDoc: RecipeDoc = {
        _id: newRecipeId,
        menuId: menuId,
        name: parsed.name,
        instructions: parsed.instructions,
        dishPrice: 0, // Will be calculated after ingredients are added and persisted
        servingQuantity: parsed.servingQuantity,
        scalingFactor: 1.0, // Default scaling factor
        dishType: parsed.dishType,
        owner: owner,
        ingredients: [], // Initialize empty, then add
      };
      await this.recipes.insertOne(newRecipeDoc);

      // Add ingredients from the parsed recipe, creating placeholder items if necessary
      const recipeIngredients: RecipeIngredient[] = [];
      for (const ing of parsed.ingredients) {
        let itemDoc = await this.findItemByName(ing.name);
        if (!itemDoc) {
          // Create a placeholder item. 'owner' is not specified for enterItem as per instructions to ignore.
          const placeholderItemResult = await this.enterItem({
            name: ing.name,
            price: 0, // Placeholder price
            quantity: 1, // Placeholder quantity
            units: "unknown", // Placeholder units
            store: "unknown", // Placeholder store
          });
          if ("error" in placeholderItemResult) {
            console.warn(
              `Could not create placeholder item "${ing.name}": ${placeholderItemResult.error}. Skipping this ingredient.`,
            );
            continue;
          }
          itemDoc = await this.items.findOne({
            _id: placeholderItemResult.item,
          });
          if (!itemDoc) {
            console.error(
              `Failed to retrieve newly created placeholder item ${placeholderItemResult.item}. This should not happen.`,
            );
            continue;
          }
        }
        recipeIngredients.push({ itemId: itemDoc._id, amount: ing.amount });
      }

      // Update recipe with all collected ingredients
      await this.recipes.updateOne(
        { _id: newRecipeId },
        { $set: { ingredients: recipeIngredients } },
      );

      // Recalculate dish and menu costs
      const updatedRecipeDoc = {
        ...newRecipeDoc,
        ingredients: recipeIngredients,
      }; // Temporary for calculation
      updatedRecipeDoc.dishPrice = await this.calculateDishPrice(
        updatedRecipeDoc,
      );
      await this.recipes.updateOne({ _id: newRecipeId }, {
        $set: { dishPrice: updatedRecipeDoc.dishPrice },
      });
      await this.updateMenuCost(menuId);

      // Also update cart cost if this menu is in any cart
      const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
        .toArray();
      for (const cart of cartsContainingMenu) {
        await this.updateCartWeeklyCost(cart._id);
      }

      console.log(
        `✅ Successfully parsed and stored recipe: "${updatedRecipeDoc.name}"`,
      );
      return { recipe: newRecipeId };
    } catch (parseError) {
      console.error(
        "❌ Error parsing LLM response or adding recipe:",
        (parseError as Error).message,
      );
      return {
        error: `Failed to process LLM response: ${
          (parseError as Error).message
        }`,
      };
    }
  }

  /**
   * Helper for LLM prompt generation.
   * @param url The URL to parse.
   * @returns The prompt string for the LLM.
   */
  private createPullRecipePrompt(url: string): string {
    return `Analyze the recipe content from the provided URL and extract the recipe details into a structured JSON format.

    **Recipe URL to analyze:** ${url}

    **CRITICAL OUTPUT REQUIREMENTS:**
    *   Return ONLY a single JSON object. Do not include any surrounding text, explanations, or markdown formatting.
    *   The JSON must follow this exact structure. Omit any fields where a value cannot be found or is irrelevant. Ensure ingredient amounts are numerical (float or int).

    {
      "name": "The Exact Recipe Name",
      "instructions": "1. First step from the recipe. 2. Second step from the recipe.",
      "servingQuantity": 8,
      "dishType": "Main Course",
      "ingredients": [
        { "name": "boneless skinless chicken breasts", "amount": 1.5 },
        { "name": "olive oil", "amount": 1 },
        { "name": "salt", "amount": 0.5 },
        { "name": "black pepper", "amount": 0.25 }
      ]
    }`;
  }

  /**
   * @action createRecipe
   * @requires menu exists, calling user owns menu
   * @effects adds recipe with no ingredients to the menu
   */
  async createRecipe(input: CreateRecipeInput): Promise<CreateRecipeOutput> {
    const {
      menu: menuId,
      name,
      instructions,
      servingQuantity,
      dishType,
      scalingFactor,
      owner,
    } = input;
    const menu = await this.menus.findOne({ _id: menuId, owner });
    if (!menu) {
      return {
        error: `Menu with ID "${menuId}" not found or not owned by user.`,
      };
    }
    if (servingQuantity <= 0) {
      return { error: `Serving quantity must be a positive number.` };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }

    const newRecipeId = freshID();
    const newRecipe: RecipeDoc = {
      _id: newRecipeId,
      menuId,
      name,
      instructions,
      servingQuantity,
      dishType,
      scalingFactor,
      owner,
      dishPrice: 0, // Will be calculated after ingredients are added
      ingredients: [],
    };
    await this.recipes.insertOne(newRecipe);

    // Recalculate menu cost and then cart cost
    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }

    return { recipe: newRecipeId };
  }

  /**
   * @action updateRecipeIngredient
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects recipe updated to have appropriate scaling of item; dishPrice and menuCost reflect new change
   */
  async updateRecipeIngredient(
    input: UpdateRecipeIngredientInput,
  ): Promise<UpdateRecipeIngredientOutput> {
    const { menu: menuId, recipe: recipeId, item: itemId, amount } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (amount < 0) {
      return { error: `Ingredient amount cannot be negative.` };
    }

    // Check if item exists in global item list
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return { error: `Item with ID "${itemId}" not found.` };
    }

    const existingIngredientIndex = recipe.ingredients.findIndex(
      (ing) => ing.itemId === itemId,
    );

    if (amount === 0) {
      // If amount is 0, remove the ingredient
      if (existingIngredientIndex !== -1) {
        recipe.ingredients.splice(existingIngredientIndex, 1);
      }
    } else {
      if (existingIngredientIndex !== -1) {
        recipe.ingredients[existingIngredientIndex].amount = amount;
      } else {
        recipe.ingredients.push({ itemId, amount });
      }
    }

    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { ingredients: recipe.ingredients },
    });

    // Recalculate dish price
    recipe.dishPrice = await this.calculateDishPrice(recipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: recipe.dishPrice },
    });

    // Recalculate menu cost and then cart cost
    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }

    return { success: true };
  }

  /**
   * @action updateRecipe (instructions)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeInstructions(
    input: UpdateRecipeInstructionsInput,
  ): Promise<UpdateRecipeInstructionsOutput> {
    const { menu: menuId, recipe: recipeId, instructions } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { instructions } });
    return { success: true };
  }

  /**
   * @action updateRecipe (servingQuantity)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeServingQuantity(
    input: UpdateRecipeServingQuantityInput,
  ): Promise<UpdateRecipeServingQuantityOutput> {
    const { menu: menuId, recipe: recipeId, servingQuantity } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (servingQuantity <= 0) {
      return { error: `Serving quantity must be a positive number.` };
    }
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { servingQuantity },
    });
    // Note: Changing servingQuantity directly does not change ingredient amounts in this model,
    // as 'amount' in RecipeIngredient is for the base serving quantity. Scaling is handled by scalingFactor.
    // Therefore, no cost recalculation is needed here.
    return { success: true };
  }

  /**
   * @action updateRecipe (scalingFactor)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeScalingFactor(
    input: UpdateRecipeScalingFactorInput,
  ): Promise<UpdateRecipeScalingFactorOutput> {
    const { menu: menuId, recipe: recipeId, scalingFactor } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { scalingFactor },
    });

    // Recalculate dish, menu, and cart costs
    const updatedRecipe = { ...recipe, scalingFactor }; // Create temporary updated recipe for calculation
    updatedRecipe.dishPrice = await this.calculateDishPrice(updatedRecipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: updatedRecipe.dishPrice },
    });

    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }
    return { success: true };
  }

  /**
   * @action updateRecipe (dishType)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeDishType(
    input: UpdateRecipeDishTypeInput,
  ): Promise<UpdateRecipeDishTypeOutput> {
    const { menu: menuId, recipe: recipeId, dishType } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { dishType } });
    return { success: true };
  }

  /**
   * @action updateRecipe (name)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeName(
    input: UpdateRecipeNameInput,
  ): Promise<UpdateRecipeNameOutput> {
    const { menu: menuId, recipe: recipeId, name } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { name } });
    return { success: true };
  }

  /**
   * @action enterItem
   * @requires no Item already exists with name
   * @effects returns and stores new item, confirmed flag set to false
   */
  async enterItem(input: EnterItemInput): Promise<EnterItemOutput> {
    const { name, price, quantity, units, store } = input;
    // Check if an item with this specific name already exists
    const existingItem = await this.items.findOne({ names: name });
    if (existingItem) {
      return {
        error:
          `An item already exists with the name "${name}". Use addItemName to add an alias.`,
      };
    }
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }
    if (quantity <= 0) {
      return { error: "Quantity must be positive." };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [name], // Start with the primary name
      price,
      quantity,
      units,
      store,
      confirmed: false,
    };
    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * @action confirmItem
   * @requires item exists, item hasn't been confirmed yet, called by Administrator
   * @effects returned item is now confirmed
   */
  async confirmItem(input: ConfirmItemInput): Promise<ConfirmItemOutput> {
    const { item: itemId } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (item.confirmed) {
      return { error: `Item with ID "${itemId}" is already confirmed.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { confirmed: true } });
    return { item: itemId };
  }

  /**
   * @action updateItem (price)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemPrice(
    input: UpdateItemPriceInput,
  ): Promise<UpdateItemPriceOutput> {
    const { item: itemId, price } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (price < 0) {
      return { error: `Price cannot be negative.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { price } });
    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs
    return { success: true };
  }

  /**
   * @action updateItem (quantity)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemQuantity(
    input: UpdateItemQuantityInput,
  ): Promise<UpdateItemQuantityOutput> {
    const { item: itemId, quantity } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (quantity <= 0) {
      return { error: `Quantity must be positive.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { quantity } });
    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs
    return { success: true };
  }

  /**
   * @action updateItem (units)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemUnits(
    input: UpdateItemUnitsInput,
  ): Promise<UpdateItemUnitsOutput> {
    const { item: itemId, units } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { units } });
    return { success: true };
  }

  /**
   * @action updateItem (store)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemStore(
    input: UpdateItemStoreInput,
  ): Promise<UpdateItemStoreOutput> {
    const { item: itemId, store } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { store } });
    return { success: true };
  }

  /**
   * @action addItemName
   * @requires item exists, called by Administrator
   * @effects item now has new name that it can be referenced by
   */
  async addItemName(input: AddItemNameInput): Promise<AddItemNameOutput> {
    const { item: itemId, name } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (item.names.includes(name)) {
      return { error: `Item "${itemId}" already has name "${name}".` };
    }
    // Check if this new name is already used by another item
    const existingItemWithSameName = await this.items.findOne({
      _id: { $ne: itemId },
      names: name,
    });
    if (existingItemWithSameName) {
      return { error: `Name "${name}" is already used by another item.` };
    }
    await this.items.updateOne({ _id: itemId }, { $push: { names: name } });
    return { success: true };
  }

  /**
   * @action removeItemName
   * @requires item exists, item has name, called by Administrator
   * @effects item can no longer be referenced by name
   */
  async removeItemName(
    input: RemoveItemNameInput,
  ): Promise<RemoveItemNameOutput> {
    const { item: itemId, name } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (!item.names.includes(name)) {
      return { error: `Item "${itemId}" does not have name "${name}".` };
    }
    if (item.names.length === 1) {
      return { error: `Cannot remove the last name of an item.` };
    }
    await this.items.updateOne({ _id: itemId }, { $pull: { names: name } });
    return { success: true };
  }

  /**
   * @action createCart
   * @requires startDate is a Sunday, no cart already exists with startDate
   * @effects creates empty cart with startDate and endDate that Friday
   */
  async createCart(input: CreateCartInput): Promise<CreateCartOutput> {
    const { startDate } = input;
    // Validate startDate is a Sunday
    const dateObj = new Date(startDate + "T00:00:00Z"); // Ensure UTC to avoid timezone issues for date only string
    if (isNaN(dateObj.getTime())) {
      return { error: "Invalid startDate format. Expected YYYY-MM-DD." };
    }
    if (dateObj.getUTCDay() !== 0) { // Sunday is 0 (0-6 for Sun-Sat)
      return { error: `startDate "${startDate}" is not a Sunday.` };
    }

    // Check if cart already exists for this startDate
    const existingCart = await this.carts.findOne({ startDate });
    if (existingCart) {
      return { error: `A cart already exists for startDate "${startDate}".` };
    }

    // Calculate endDate (Friday of the same week)
    const endDateObj = new Date(dateObj);
    endDateObj.setUTCDate(dateObj.getUTCDate() + 5); // Add 5 days to get to Friday
    const endDate = endDateObj.toISOString().split("T")[0];

    const newCartId = freshID();
    const newCart: CartDoc = {
      _id: newCartId,
      startDate,
      endDate,
      menuIds: [],
      weeklyCost: 0,
    };
    await this.carts.insertOne(newCart);
    return { cart: newCartId };
  }

  /**
   * @action addMenuToCart
   * @requires cart exists, menu exists, cart doesn't already have a menu for that menus date
   * @effects adds menu to the cart and appropriately adjusts cart price
   */
  async addMenuToCart(input: AddMenuToCartInput): Promise<AddMenuToCartOutput> {
    const { cart: cartId, menu: menuId } = input;
    const cart = await this.carts.findOne({ _id: cartId });
    if (!cart) {
      return { error: `Cart with ID "${cartId}" not found.` };
    }
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }

    // Check if a menu for that date already exists in the cart
    const menusInCart = await this.menus.find({ _id: { $in: cart.menuIds } })
      .toArray();
    if (menusInCart.some((m) => m.date === menu.date)) {
      return {
        error:
          `Cart "${cartId}" already contains a menu for date "${menu.date}".`,
      };
    }

    await this.carts.updateOne({ _id: cartId }, { $push: { menuIds: menuId } });
    await this.updateCartWeeklyCost(cartId); // Recalculate weekly cost

    return { success: true };
  }

  /**
   * @action adjustRecipeScale
   * @requires cart, menu, and recipe all exist, recipe in menu, menu in cart
   * @effects within the cart adjusts to have the new scaling factor of specified recipe in menu, adjust cart price appropriately
   */
  async adjustRecipeScale(
    input: AdjustRecipeScaleInput,
  ): Promise<AdjustRecipeScaleOutput> {
    const { cart: cartId, menu: menuId, recipe: recipeId, scalingFactor } =
      input;
    const cart = await this.carts.findOne({ _id: cartId, menuIds: menuId }); // Verify cart contains menu
    if (!cart) {
      return {
        error:
          `Cart "${cartId}" does not exist or does not contain menu "${menuId}".`,
      };
    }
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId }); // Verify recipe is in menu
    if (!recipe) {
      return { error: `Recipe "${recipeId}" not found in menu "${menuId}".` };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }

    // Update the recipe's scaling factor directly
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { scalingFactor },
    });

    // Recalculate costs: dish, menu, and then cart
    const updatedRecipe = { ...recipe, scalingFactor }; // Create temporary updated recipe for calculation
    updatedRecipe.dishPrice = await this.calculateDishPrice(updatedRecipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: updatedRecipe.dishPrice },
    });

    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }
    return { success: true };
  }

  /**
   * @action adjustItemQuantity
   * @requires cart, menu, and item all exist, item in some recipe in menu, menu in cart
   * @effects within the cart adjusts number of item purchased to quantity, adjust cart price appropriately
   */
  async adjustItemQuantity(
    input: AdjustItemQuantityInput,
  ): Promise<AdjustItemQuantityOutput> {
    const { cart: cartId, menu: menuId, item: itemId, quantity } = input;
    const cart = await this.carts.findOne({ _id: cartId, menuIds: menuId });
    if (!cart) {
      return {
        error:
          `Cart "${cartId}" does not exist or does not contain menu "${menuId}".`,
      };
    }
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu "${menuId}" not found.` };
    }
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (quantity <= 0) {
      return { error: `Quantity must be positive.` };
    }

    // Verify the item is actually used in a recipe within this menu
    const recipesUsingItemInMenu = await this.recipes.countDocuments({
      menuId: menuId,
      "ingredients.itemId": itemId,
    });
    if (recipesUsingItemInMenu === 0) {
      return {
        error:
          `Item "${itemId}" is not used in any recipe within menu "${menuId}".`,
      };
    }

    // As per interpretation, this action updates the global `ItemDoc.quantity`.
    // The "adjusts number of item purchased to quantity" implies changing the fundamental quantity
    // associated with an item's price, thereby affecting how costs are calculated for all uses.
    const updateResult = await this.items.updateOne({ _id: itemId }, {
      $set: { quantity },
    });
    if (updateResult.modifiedCount === 0) {
      return { error: `Failed to update item "${itemId}" quantity.` };
    }

    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs, including cart
    await this.updateCartWeeklyCost(cartId); // Explicitly update this specific cart
    return { success: true };
  }

  // --- Queries ---

  /**
   * @query _getMenusInCart
   * @requires cart exists
   * @effects returns the set of all Menu entities associated with the given cart.
   */
  async _getMenusInCart(
    input: GetMenusInCartInput,
  ): Promise<GetMenusInCartOutput> {
    const { cart: cartId } = input;
    const cart = await this.carts.findOne({ _id: cartId });
    if (!cart) {
      return { error: `Cart with ID "${cartId}" not found.` };
    }
    const menus = await this.menus.find({ _id: { $in: cart.menuIds } })
      .toArray();
    return { menus };
  }

  /**
   * @query _getRecipesInMenu
   * @requires menu exists
   * @effects returns the set of all Recipe entities associated with the given menu.
   */
  async _getRecipesInMenu(
    input: GetRecipesInMenuInput,
  ): Promise<GetRecipesInMenuOutput> {
    const { menu: menuId } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    const recipes = await this.recipes.find({ menuId }).toArray();
    return { recipes };
  }

  /**
   * @query _getIngredientsInRecipe
   * @requires recipe exists
   * @effects returns a map where each key is an Item and the value is the total scaled quantity (Float) of that item needed for the given recipe, calculated as `item.amount * recipe.scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsInRecipe(
    input: GetIngredientsInRecipeInput,
  ): Promise<GetIngredientsInRecipeOutput> {
    const { recipe: recipeId } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId });
    if (!recipe) {
      return { error: `Recipe with ID "${recipeId}" not found.` };
    }

    const ingredientsMap: Record<Item, { amount: number; units: string }> = {};
    for (const ing of recipe.ingredients) {
      const item = await this.items.findOne({ _id: ing.itemId });
      if (item) {
        ingredientsMap[item._id] = {
          amount: ing.amount * recipe.scalingFactor,
          units: item.units,
        };
      } else {
        console.warn(`Item ${ing.itemId} not found for recipe ${recipeId}`);
      }
    }
    return { ingredients: ingredientsMap };
  }

  /**
   * @query _getIngredientsInMenu
   * @requires menu exists
   * @effects returns a map where each key is an Item and the value is the total aggregated quantity (Float) of that item needed across all recipes within the given menu, considering each recipe's `scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsInMenu(
    input: GetIngredientsInMenuInput,
  ): Promise<GetIngredientsInMenuOutput> {
    const { menu: menuId } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }

    const recipesInMenu = await this.recipes.find({ menuId }).toArray();
    const aggregatedIngredients: Record<
      Item,
      { amount: number; units: string }
    > = {};

    for (const recipe of recipesInMenu) {
      for (const ing of recipe.ingredients) {
        const item = await this.items.findOne({ _id: ing.itemId });
        if (item) {
          const scaledAmount = ing.amount * recipe.scalingFactor;
          if (aggregatedIngredients[item._id]) {
            aggregatedIngredients[item._id].amount += scaledAmount;
          } else {
            aggregatedIngredients[item._id] = {
              amount: scaledAmount,
              units: item.units,
            };
          }
        } else {
          console.warn(
            `Item ${ing.itemId} not found for recipe ${recipe._id} in menu ${menuId}`,
          );
        }
      }
    }
    return { ingredients: aggregatedIngredients };
  }

  /**
   * @query _getListOfItems
   * @requires nothing
   * @effects returns a set of all items stored within the application.
   */
  async _getListOfItems(
    input: GetListOfItemsInput = {},
  ): Promise<GetListOfItemsOutput> {
    // Input is technically Empty, so it can be an empty object
    const items = await this.items.find({}).toArray();
    return { items };
  }

  /**
   * @query _getIngredientsPerStore
   * @requires all menus in the input set exist
   * @effects returns a map where each key is a `store` name (String) and the value is another map. This inner map has `Item` keys and their total aggregated quantity (Float) values, representing the total amount of each item needed from that store across all specified menus, considering recipe scaling factors. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsPerStore(
    input: GetIngredientsPerStoreInput,
  ): Promise<GetIngredientsPerStoreOutput> {
    const { menus: menuIds } = input;
    const storeShoppingList: Record<
      string,
      Record<Item, { amount: number; units: string }>
    > = {};

    for (const menuId of menuIds) {
      const menu = await this.menus.findOne({ _id: menuId });
      if (!menu) {
        console.warn(`Menu ${menuId} not found, skipping.`);
        continue;
      }

      const menuIngredientsResult = await this._getIngredientsInMenu({
        menu: menuId,
      });
      if ("error" in menuIngredientsResult) {
        console.warn(
          `Error getting ingredients for menu ${menuId}: ${menuIngredientsResult.error}`,
        );
        continue;
      }
      const menuIngredients = menuIngredientsResult.ingredients;

      for (const key of Object.keys(menuIngredients)) { // Fix for Line 829
        const itemId = key as Item; // Explicitly cast the string key to Item
        // BUG FIX: Added explicit type annotation for destructuring.
        // This is largely a redundant type assertion to appease a potentially
        // overzealous or misinformed linter/compiler, as the types are already
        // correctly inferred from `menuIngredients[itemId]`. This might resolve
        // the "implicit any" error if it's a false positive or related to a
        // context where the type was less certain previously.
        const { amount, units }: { amount: number; units: string } =
          menuIngredients[itemId];

        const item = await this.items.findOne({ _id: itemId }); // Fix for Line 834 - `itemId` is now correctly typed
        if (item) {
          if (!storeShoppingList[item.store]) {
            storeShoppingList[item.store] = {};
          }
          if (storeShoppingList[item.store][item._id]) {
            storeShoppingList[item.store][item._id].amount += amount;
          } else {
            storeShoppingList[item.store][item._id] = { amount, units };
          }
        } else {
          console.warn(`Item ${itemId} not found when aggregating for stores.`);
        }
      }
    }
    return { storeShoppingList };
  }

  /**
   * @query _getMenuByDate
   * @requires menu exists for date
   * @effects returns the menu associated with that date.
   */
  async _getMenuByDate(
    input: GetMenuByDateInput,
  ): Promise<GetMenuByDateOutput> {
    const { date } = input;
    const menu = await this.menus.findOne({ date });
    if (!menu) {
      return { error: `Menu for date "${date}" not found.` };
    }
    return { menu };
  }

  /**
   * @query _getMenusOwnedByUser
   * @requires user exists
   * @effects returns the set of all Menu entities where the `owner` attribute matches the given user.
   */
  async _getMenusOwnedByUser(
    input: GetMenusOwnedByUserInput,
  ): Promise<GetMenusOwnedByUserOutput> {
    const { user: ownerId } = input;
    const menus = await this.menus.find({ owner: ownerId }).toArray();
    return { menus };
  }
}

```

Goal: Fix MenuManagerConcept.test.ts

Bug: Started test step while another test step with sanitizers was running:

* MenuManagerConcept - Full Lifecycle Test ... Part Four: Item Confirmation and Cart Management

Description: Each sub part is within the overarching test creating a system like below:

```typescript
  await t.step("Part 2: Create and add manual recipes", async () => {
    printStepHeader("Part 2: Create and add manual recipes");
    let checkIndex = 0; // Reset checkIndex for this major step
    ///...

    // --- Sub-step 2.1: Register items with conversion factors ---
    await t.step("2.1 Register global items", async () => {
      //....
    }

    /// Other sub-steps
  }
```

Goal: Flatten testing system to structure below:

```typescript
    printStepHeader("Part 2: Create and add manual recipes");

    // --- Sub-step 2.1: Register items with conversion factors ---
    await t.step("2.1 Register global items", async () => {
      //....
    }

    // --- Sub-step 2.2: ... ---
    await t.step("2.2 ... ", async () => {
      //....
    }

    /// Other sub-steps
  }
```
