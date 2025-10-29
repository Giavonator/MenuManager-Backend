---
timestamp: 'Tue Oct 28 2025 20:36:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203600.f16db608.md]]'
content_id: 63f5b1876fda683915cb03c3b3dbfb101fb93a785d099be1c1c0d0d35f1eb23b
---

# file: src/concepts/MenuCollection/MenuCollectionConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "MenuCollection" + ".";

// Generic types of this concept
type User = ID;
type Recipe = ID;

// Utility for date-only string comparison and normalization
const toDateOnlyString = (date: Date): string =>
  date.toISOString().split("T")[0];

// --- Input/Output Types for Actions ---

type CreateMenuInput = { name: string; date: Date; actingUser: User };
type CreateMenuOutput = Result<{ menu: ID }>;

type UpdateMenuInput = { menu: ID; name?: string; date?: Date };
type UpdateMenuOutput = Result<Empty>;

type AddRecipeInput = { menu: ID; recipe: Recipe; scalingFactor: number };
type AddRecipeOutput = Result<Empty>;

type RemoveRecipeInput = { menu: ID; recipe: Recipe };
type RemoveRecipeOutput = Result<Empty>;

type ChangeRecipeScalingInput = {
  menu: ID;
  recipe: Recipe;
  newScalingFactor: number;
};
type ChangeRecipeScalingOutput = Result<Empty>;

// --- Input/Output Types for Queries ---

type GetMenuDetailsInput = { menu: ID };
type GetMenuDetailsOutput = Result<{ name: string; date: Date; owner: User }[]>;

type GetRecipesInMenuInput = { menu: ID };
type GetRecipesInMenuOutput = Result<{ menuRecipes: Record<Recipe, number> }[]>;

type GetMenusOwnedByUserInput = { user: User };
type GetMenusOwnedByUserOutput = Result<{ menus: ID }[]>;

type GetMenuByDateInput = { date: Date; owner: User };
type GetMenuByDateOutput = Result<{ menu: ID }[]>;

/**
 * a set of Menu with
 *   a name String
 *   a date Date // Conform to 'YYYY-MM-DD', date-only type no time
 *   an owner User // Reference to an external User entity
 *   a menuRecipes Map of Recipe to Float // Map of RecipeID (from CookBook) to its specific scaling factor within this menu
 */
interface MenuDoc {
  _id: ID;
  name: string;
  date: Date; // Stored as ISODate in MongoDB, but logically represents YYYY-MM-DD
  owner: User;
  menuRecipes: Record<Recipe, number>; // Stored as an object in MongoDB
}

/**
 * MenuCollection
 *
 * **purpose** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.
 *
 * **principle** A user `createMenu` for their "Christmas Dinner" on "Dec 25, 2024". They then `addRecipe` "Turkey" and "Gravy" from the `CookBook`, setting scaling factors for each. Later, realizing they need more gravy, they `changeRecipeScaling` for "Gravy". Afterwards the user determines they want "Ham" instead of "Turkey", they can `removeRecipe` for "Turkey" and then `addRecipe` for "Ham`.
 */
export default class MenuCollectionConcept {
  private menus: Collection<MenuDoc>;

  constructor(private readonly db: Db) {
    this.menus = this.db.collection<MenuDoc>(PREFIX + "menus");
  }

  /**
   * createMenu (name: String, date: Date, actingUser: User): (menu: Menu)
   *
   * **requires** `name` is not empty, `date` is in the future, `actingUser` exists. No other `Menu` exists for this `actingUser` on this `date`.
   *
   * **effects** Creates a new `Menu` with the given `name`, `date`, and `owner`=`actingUser`. It will have an empty set of `menuRecipes`. Returns the new `Menu` ID.
   */
  async createMenu(
    { name, date, actingUser }: CreateMenuInput,
  ): Promise<CreateMenuOutput> {
    try {
      // Precondition 1: `name` is not empty
      if (!name || name.trim() === "") {
        return { error: "Menu name cannot be empty." };
      }

      // Precondition 2: `date` is in the future (compare date-only)
      const today = new Date();
      // Normalize today to start of day for comparison
      today.setHours(0, 0, 0, 0);
      today.setMilliseconds(0);
      today.setSeconds(0);
      today.setMinutes(0);

      const menuDate = new Date(date);
      menuDate.setHours(0, 0, 0, 0); // Normalize menuDate to start of day
      menuDate.setMilliseconds(0);
      menuDate.setSeconds(0);
      menuDate.setMinutes(0);

      if (menuDate < today) {
        return { error: "Menu date must be in the future." };
      }

      // Precondition 3: `actingUser` exists (assuming ID is sufficient for existence check from external system)
      if (!actingUser) {
        return { error: "Acting user must be provided." };
      }

      // Precondition 4: No other `Menu` exists for this `actingUser` on this `date`.
      const existingMenu = await this.menus.findOne({
        owner: actingUser,
        date: menuDate, // Direct Date object comparison will work for start-of-day normalized dates
      });

      if (existingMenu) {
        return {
          error: `A menu already exists for user ${actingUser} on ${
            toDateOnlyString(date)
          }.`,
        };
      }

      const newMenuId = freshID();
      const newMenu: MenuDoc = {
        _id: newMenuId,
        name: name.trim(),
        date: menuDate,
        owner: actingUser,
        menuRecipes: {},
      };

      await this.menus.insertOne(newMenu);
      return { menu: newMenuId };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error creating menu: ${errorMessage}`);
      return { error: `Failed to create menu: ${errorMessage}` };
    }
  }

  /**
   * updateMenu (menu: Menu, name: String)
   * updateMenu (menu: Menu, date: Date)
   *
   * **requires** `menu` exists. If `date` is updated, no `otherMenu` on date has the same `menu.user` for new date.
   *
   * **effects** Updates the specified attribute (`name` or `date`) of the `menu`.
   */
  async updateMenu(
    { menu, name, date }: UpdateMenuInput,
  ): Promise<UpdateMenuOutput> {
    try {
      // Precondition 1: `menu` exists
      const existingMenu = await this.menus.findOne({ _id: menu });
      if (!existingMenu) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      const updateFields: Partial<MenuDoc> = {};

      if (name !== undefined) {
        // Precondition: `name` is not empty
        if (!name || name.trim() === "") {
          return { error: "Menu name cannot be empty." };
        }
        updateFields.name = name.trim();
      }

      if (date !== undefined) {
        // Normalize new date to start of day
        const newMenuDate = new Date(date);
        newMenuDate.setHours(0, 0, 0, 0);
        newMenuDate.setMilliseconds(0);
        newMenuDate.setSeconds(0);
        newMenuDate.setMinutes(0);

        // Precondition 2: no `otherMenu` on date has the same `menu.user` for new date.
        // Check if another menu by the same owner already exists for the new date
        const conflictMenu = await this.menus.findOne({
          _id: { $ne: menu }, // Exclude the current menu being updated
          owner: existingMenu.owner,
          date: newMenuDate, // Direct Date object comparison for normalized dates
        });

        if (conflictMenu) {
          return {
            error:
              `Another menu already exists for user ${existingMenu.owner} on ${
                toDateOnlyString(date)
              }.`,
          };
        }
        updateFields.date = newMenuDate;
      }

      // If no valid fields to update are provided
      if (Object.keys(updateFields).length === 0) {
        return {
          error: "No valid fields provided for menu update (name or date).",
        };
      }

      await this.menus.updateOne(
        { _id: menu },
        { $set: updateFields },
      );
      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error updating menu ${menu}: ${errorMessage}`);
      return { error: `Failed to update menu: ${errorMessage}` };
    }
  }

  /**
   * addRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)
   *
   * **requires** `menu` exists, `recipe` exists. `scalingFactor` > 0. `menu` does not already contain `recipe`.
   *
   * **effects** Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`.
   */
  async addRecipe(
    { menu, recipe, scalingFactor }: AddRecipeInput,
  ): Promise<AddRecipeOutput> {
    try {
      // Precondition 1: `menu` exists
      const existingMenu = await this.menus.findOne({ _id: menu });
      if (!existingMenu) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      // Precondition 2: `recipe` exists (assuming ID is sufficient for existence check from external system)
      if (!recipe) {
        return { error: "Recipe ID must be provided." };
      }

      // Precondition 3: `scalingFactor` > 0
      if (scalingFactor <= 0) {
        return { error: "Scaling factor must be greater than 0." };
      }

      // Precondition 4: `menu` does not already contain `recipe`.
      if (existingMenu.menuRecipes[recipe] !== undefined) {
        return { error: `Recipe ${recipe} already exists in menu ${menu}.` };
      }

      await this.menus.updateOne(
        { _id: menu },
        { $set: { [`menuRecipes.${recipe}`]: scalingFactor } },
      );
      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error adding recipe ${recipe} to menu ${menu}: ${errorMessage}`,
      );
      return { error: `Failed to add recipe: ${errorMessage}` };
    }
  }

  /**
   * removeRecipe (menu: Menu, recipe: Recipe)
   *
   * **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`.
   *
   * **effects** Removes `recipe` from `menu.menuRecipes`.
   */
  async removeRecipe(
    { menu, recipe }: RemoveRecipeInput,
  ): Promise<RemoveRecipeOutput> {
    try {
      // Precondition 1: `menu` exists
      const existingMenu = await this.menus.findOne({ _id: menu });
      if (!existingMenu) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      // Precondition 2: `recipe` exists in `menu.menuRecipes`.
      if (existingMenu.menuRecipes[recipe] === undefined) {
        return { error: `Recipe ${recipe} not found in menu ${menu}.` };
      }

      await this.menus.updateOne(
        { _id: menu },
        { $unset: { [`menuRecipes.${recipe}`]: "" } },
      );
      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error removing recipe ${recipe} from menu ${menu}: ${errorMessage}`,
      );
      return { error: `Failed to remove recipe: ${errorMessage}` };
    }
  }

  /**
   * changeRecipeScaling (menu: Menu, recipe: Recipe, newScalingFactor: Float)
   *
   * **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.
   *
   * **effects** Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`.
   */
  async changeRecipeScaling(
    { menu, recipe, newScalingFactor }: ChangeRecipeScalingInput,
  ): Promise<ChangeRecipeScalingOutput> {
    try {
      // Precondition 1: `menu` exists
      const existingMenu = await this.menus.findOne({ _id: menu });
      if (!existingMenu) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      // Precondition 2: `recipe` exists in `menu.menuRecipes`.
      if (existingMenu.menuRecipes[recipe] === undefined) {
        return { error: `Recipe ${recipe} not found in menu ${menu}.` };
      }

      // Precondition 3: `newScalingFactor` > 0
      if (newScalingFactor <= 0) {
        return { error: "New scaling factor must be greater than 0." };
      }

      await this.menus.updateOne(
        { _id: menu },
        { $set: { [`menuRecipes.${recipe}`]: newScalingFactor } },
      );
      return {};
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error changing scaling for recipe ${recipe} in menu ${menu}: ${errorMessage}`,
      );
      return { error: `Failed to change recipe scaling: ${errorMessage}` };
    }
  }

  // --- Queries ---

  /**
   * _getMenuDetails (menu: Menu): (name: String, date: Date, owner: User)
   *
   * **requires** `menu` exists.
   *
   * **effects** Returns details about the `menu`.
   */
  async _getMenuDetails(
    { menu }: GetMenuDetailsInput,
  ): Promise<GetMenuDetailsOutput> {
    try {
      // Precondition: `menu` exists.
      const menuDoc = await this.menus.findOne({ _id: menu });
      if (!menuDoc) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      return [{
        name: menuDoc.name,
        date: menuDoc.date,
        owner: menuDoc.owner,
      }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting menu details for ${menu}: ${errorMessage}`);
      return { error: `Failed to get menu details: ${errorMessage}` };
    }
  }

  /**
   * _getRecipesInMenu (menu: Menu): (menuRecipes: Map of Recipe to Float)
   *
   * **requires** `menu` exists.
   *
   * **effects** Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.
   */
  async _getRecipesInMenu(
    { menu }: GetRecipesInMenuInput,
  ): Promise<GetRecipesInMenuOutput> {
    try {
      // Precondition: `menu` exists.
      const menuDoc = await this.menus.findOne({ _id: menu });
      if (!menuDoc) {
        return { error: `Menu with ID ${menu} not found.` };
      }

      return [{ menuRecipes: menuDoc.menuRecipes }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error getting recipes in menu ${menu}: ${errorMessage}`,
      );
      return { error: `Failed to get recipes in menu: ${errorMessage}` };
    }
  }

  /**
   * _getMenusOwnedByUser (user: User): (menus: Set of Menu)
   *
   * **requires** `user` exists.
   *
   * **effects** Returns the set of all `Menu` entities where the `owner` attribute matches the given user.
   */
  async _getMenusOwnedByUser(
    { user }: GetMenusOwnedByUserInput,
  ): Promise<GetMenusOwnedByUserOutput> {
    try {
      // Precondition: `user` exists. (Assumed by `ID` type for now, actual existence check via syncs/auth)
      if (!user) {
        return { error: "User ID must be provided." };
      }

      const userMenus = await this.menus.find({ owner: user }).toArray();

      // The query returns a Set of Menu IDs, so we map them
      return userMenus.map((menuDoc) => ({ menus: menuDoc._id }));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error getting menus owned by user ${user}: ${errorMessage}`,
      );
      return { error: `Failed to get menus owned by user: ${errorMessage}` };
    }
  }

  /**
   * _getMenuByDate (date: Date, owner: User): (menu: Menu)
   *
   * **requires** A menu exists for `date` owned by `owner`.
   *
   * **effects** Returns the `Menu` ID associated with that `date` and `owner`.
   */
  async _getMenuByDate(
    { date, owner }: GetMenuByDateInput,
  ): Promise<GetMenuByDateOutput> {
    try {
      // Precondition: A menu exists for `date` owned by `owner`.
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0); // Normalize for date-only comparison
      searchDate.setMilliseconds(0);
      searchDate.setSeconds(0);
      searchDate.setMinutes(0);

      const menuDoc = await this.menus.findOne({
        date: searchDate,
        owner: owner,
      });

      if (!menuDoc) {
        return {
          error: `No menu found for user ${owner} on date ${
            toDateOnlyString(date)
          }.`,
        };
      }

      return [{ menu: menuDoc._id }];
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `Error getting menu by date ${
          toDateOnlyString(date)
        } for owner ${owner}: ${errorMessage}`,
      );
      return { error: `Failed to get menu by date: ${errorMessage}` };
    }
  }
}

```
