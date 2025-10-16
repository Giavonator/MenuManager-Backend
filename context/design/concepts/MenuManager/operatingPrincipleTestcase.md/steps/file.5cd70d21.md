---
timestamp: 'Wed Oct 15 2025 20:16:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_201656.028a962e.md]]'
content_id: 5cd70d2133fe66a647caa9019ac11d89c7e770ae668c349fecd494437c851e7f
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
