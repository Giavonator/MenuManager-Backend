---
timestamp: 'Thu Oct 23 2025 17:29:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_172911.280180a3.md]]'
content_id: 2ac1f21c9b6869a5d348e0997189e26bb853d438320aec5e3ed9ed588c6eb78a
---

# file: src/utils/gemini-llm.ts

```typescript
/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai";

/**
 * Configuration for API access
 */
export interface Config {
  apiKey: string;
}

export class GeminiLLM {
  private apiKey: string;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
  }

  async executeLLM(prompt: string): Promise<string> {
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      // Execute the LLM
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }
}

```

Example of how it can be used:

```typescript

    /**
     * Uses an LLM to parse a recipe from a URL and add it to a menu.
     */
    async pullRecipeFromWebsite(menuId: string, url: string, llm: GeminiLLM): Promise<Recipe> {
        const menu = this.findMenuById(menuId);
        if (!menu) {
            throw new Error(`Menu with ID "${menuId}" not found.`);
        }

        console.log(`🤖 Requesting recipe parse for URL: ${url}`);
        const prompt = this.createPullRecipePrompt(url);
        const responseText = await llm.executeLLM(prompt);
        console.log('✅ Received response from Gemini AI!');

        return this.parseAndAddRecipe(menu, responseText);
    }


    private createPullRecipePrompt(url: string): string {
        return ` INSERT APPROPRIATE PROMPT
        **CRITICAL OUTPUT REQUIREMENTS:**
        *   Return ONLY a single JSON object. Do not include any surrounding text, explanations, or markdown formatting.
        *   The JSON must follow this exact structure. Omit any fields where a value cannot be found.

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
        }

        Now, analyze the URL and provide the JSON object.`;
    }
  
    private parseAndAddRecipe(menu: Menu, responseText: string): Recipe {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON object found in the LLM response.');
            
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.name || !parsed.instructions || !parsed.servingQuantity || !parsed.dishType || !parsed.ingredients) {
                throw new Error('The parsed JSON is missing required fields.');
            }

            let mentionedIngredients = 0;
            const instructionsText = parsed.instructions.toLowerCase();
            for (const ing of parsed.ingredients) {
                // Check for the core part of the ingredient name.
                const coreName = ing.name.split(' ').pop()?.toLowerCase() ?? '';
                if (coreName && instructionsText.includes(coreName)) {
                    mentionedIngredients++;
                }
            }

            const mentionedPercentage = (mentionedIngredients / parsed.ingredients.length) * 100;
            // If less than 75% of ingredients are mentioned, it's suspicious.
            if (mentionedPercentage < 75) {
                throw new Error(`Semantic Validation Failed: Only ${mentionedPercentage.toFixed(0)}% of ingredients are mentioned in the instructions. The instructions and ingredients may not match.`);
            } else {
                console.log(`✅ Instructions: ${mentionedPercentage.toFixed(0)}% of ingredients are mentioned in the instructions which means the instructions likely match the ingredients.`);
            }

            const newRecipe = this.createRecipe(
                menu.id,
                parsed.name,
                parsed.instructions,
                parsed.servingQuantity,
                parsed.dishType
            );

            for (const ing of parsed.ingredients) {
                try {
                    this.updateIngredient(menu.id, newRecipe.id, ing.name, ing.amount);
                } catch (error) {
                    console.warn(`⚠️ Could not add ingredient "${ing.name}": ${(error as Error).message}. Please enter it and add it manually.`);
                }
            }

            console.log(`✅ Successfully parsed and stored recipe: "${newRecipe.name}"`);
            return newRecipe;
        } catch (error) {
            console.error('❌ Error parsing LLM response:', (error as Error).message);
            throw error;
        }
    }
```

## StoreCatalog

**concept** StoreCatalog \[Order]

**purpose** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.

**principle** An administrator `createItem` for a new ingredient like "ground pepper". They then discover multiple `PurchaseOption`s for it, such as "3 lbs for $5.99 at Sprout's" and "1 lb for $2.50 at Trader Joe's", and `addPurchaseOption` for each. Later, another user refers to "pepper", so the administrator `addItemName` "pepper" as an alias. Once verified, the administrator `confirmItem` so it can be used in orders.

**state**\
  a set of Item with\
    a names Set of String // Ex. {'pepper', 'ground pepper', 'course pepper'}\
    a set of PurchaseOption\
  a set of PurchaseOption with\
    a store String // Ex. "Sprout's"\
    a quantity Float // Ex. 3.0\
    a units String // Ex. "lbs", "oz", "count"\
    a price Float // Ex. 5.99\
    a confirmed Bool\
    a purchase Order\\

**actions**\
  createItem (primaryName: String): (item: Item)\
    **requires** no Item already exists with `primaryName` in its names set.\
    **effects** Creates a new `Item` with `primaryName` in its `names` set, `confirmed` set to `false`, and no `PurchaseOption`s. Returns the new `Item` ID.

  deleteItem (item: Item)\
    **requires** `item` exists.\
    **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

  addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)\
    **requires** `item` exists. `quantity` > 0, `price` >= 0.\
    **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.

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

  addItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).\
    **effects** Adds `name` to the `names` set of `item`.

  removeItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.\
    **effects** Removes `name` from the `names` set of `item`.

  confirmItem (item: Item)\
    **requires** `item` exists, `item` is not already `confirmed`.\
    **effects** Sets `item.confirmed` to `true`.

  addOrderToPurchaseOption (purchaseOption: PurchaseOption, order: Order)\
    **requires** `purchaseOption` exists. `order` exists. `purchaseOption` does not already have an associated order.\
    **effects** Sets `PurchaseOption.order` to `order`.

**queries**
  \_getItemByName (name: String): (item: Item)\
    **requires** An item exists with `name` in its `names` set.\
    **effects** Returns the `Item` ID with the given name.

  \_getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)\
    **requires** An item exists with `purchaseOption` in its `purchaseOption` set.\
    **effects** Returns the `Item` ID with the given purchaseOption.

  \_getItemByDetails (item: Item): (name: String, confirmed: Bool, purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the associated details of the item.

  \_getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the set of all `PurchaseOption`s for the given `item`.

  \_getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String)\
    **requires** `purchaseOption` exists.\
    **effects** Returns the set of details given `purchaseOption`.

  \_getAllItems (): (items: Set of Item)\
    **requires** nothing.\
    **effects** Returns a set of all `Item` entity IDs.
