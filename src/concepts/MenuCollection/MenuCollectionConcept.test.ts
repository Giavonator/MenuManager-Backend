import { ID } from "@utils/types.ts";
import { freshID, testDb } from "@utils/database.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";
import MenuCollectionConcept from "./MenuCollectionConcept.ts";

// Generic types for the concept
type User = ID;
type Recipe = ID;

// Utility for consistent date generation and normalization
const getNormalizedDate = (
  year: number,
  month: number,
  day: number,
): Date => {
  const date = new Date(year, month - 1, day); // Month is 0-indexed
  date.setHours(0, 0, 0, 0);
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setMinutes(0);
  return date;
};

const getFutureDate = (daysInFuture: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysInFuture);
  return getNormalizedDate(
    date.getFullYear(),
    date.getMonth() + 1, // Adjust for 0-indexed month in Date constructor
    date.getDate(),
  );
};

// Test users and recipes (using branded IDs)
const TEST_USER_ALICE = "user:Alice" as User;
const TEST_USER_BOB = "user:Bob" as User;
const RECIPE_TURKEY = "recipe:Turkey" as Recipe;
const RECIPE_GRAVY = "recipe:Gravy" as Recipe;
const RECIPE_HAM = "recipe:Ham" as Recipe;
const RECIPE_POTATOES = "recipe:MashedPotatoes" as Recipe;
const RECIPE_VEGGIES = "recipe:RoastedVeggies" as Recipe;

Deno.test("MenuCollectionConcept - Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "Principle Test";

  try {
    const christmas4025 = getNormalizedDate(4025, 12, 25);
    let menuId: ID;

    await t.step(
      "1. User Alice creates 'Christmas Dinner' menu for Dec 25, 4025",
      async () => {
        const currentStepMsg =
          "1. User Alice creates 'Christmas Dinner' menu for Dec 25, 4025";
        printStepHeader(currentStepMsg);

        const createResult = await menuCollection.createMenu({
          name: "Christmas Dinner",
          date: christmas4025,
          actingUser: TEST_USER_ALICE,
        });

        assertAndLog(
          "menu" in createResult,
          true,
          "Menu creation should succeed",
          stepMessagePrefix,
          ++checkIndex,
        );
        menuId = (createResult as { menu: ID }).menu;
        assertExistsAndLog(
          menuId,
          "Created menu ID should exist",
          stepMessagePrefix,
          ++checkIndex,
        );

        const menuDetails = await menuCollection._getMenuDetails({
          menu: menuId,
        });
        assertAndLog(
          "error" in menuDetails,
          false,
          "Query menu details should not return error",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (menuDetails as { name: string }[]).length,
          1,
          "Should find one menu detail",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (menuDetails as { name: string }[])[0].name,
          "Christmas Dinner",
          "Menu name should match",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (menuDetails as { date: Date }[])[0].date.toISOString().split("T")[0],
          christmas4025.toISOString().split("T")[0],
          "Menu date should match",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (menuDetails as { owner: User }[])[0].owner,
          TEST_USER_ALICE,
          "Menu owner should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step(
      "2. Add 'Turkey' and 'Gravy' recipes with scaling factors",
      async () => {
        const currentStepMsg =
          "2. Add 'Turkey' and 'Gravy' recipes with scaling factors";
        printStepHeader(currentStepMsg);

        const addTurkeyResult = await menuCollection.addRecipe({
          menu: menuId,
          recipe: RECIPE_TURKEY,
          scalingFactor: 1.0,
        });
        assertAndLog(
          "error" in addTurkeyResult,
          false,
          "Adding Turkey should succeed",
          stepMessagePrefix,
          ++checkIndex,
        );

        const addGravyResult = await menuCollection.addRecipe({
          menu: menuId,
          recipe: RECIPE_GRAVY,
          scalingFactor: 0.5,
        });
        assertAndLog(
          "error" in addGravyResult,
          false,
          "Adding Gravy should succeed",
          stepMessagePrefix,
          ++checkIndex,
        );

        const recipesInMenu = await menuCollection._getRecipesInMenu({
          menu: menuId,
        });
        assertAndLog(
          "error" in recipesInMenu,
          false,
          "Query recipes in menu should not return error",
          stepMessagePrefix,
          ++checkIndex,
        );
        const menuRecipes =
          (recipesInMenu as { menuRecipes: Record<Recipe, number> }[])[0]
            .menuRecipes;
        assertAndLog(
          Object.keys(menuRecipes).length,
          2,
          "Menu should contain 2 recipes",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          menuRecipes[RECIPE_TURKEY],
          1.0,
          "Turkey scaling factor should be 1.0",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          menuRecipes[RECIPE_GRAVY],
          0.5,
          "Gravy scaling factor should be 0.5",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step("3. Change 'Gravy' scaling factor to 1.5", async () => {
      const currentStepMsg = "3. Change 'Gravy' scaling factor to 1.5";
      printStepHeader(currentStepMsg);

      const changeScalingResult = await menuCollection.changeRecipeScaling({
        menu: menuId,
        recipe: RECIPE_GRAVY,
        newScalingFactor: 1.5,
      });
      assertAndLog(
        "error" in changeScalingResult,
        false,
        "Changing Gravy scaling should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const recipesInMenu = await menuCollection._getRecipesInMenu({
        menu: menuId,
      });
      assertAndLog(
        "error" in recipesInMenu,
        false,
        "Query recipes in menu should not return error",
        stepMessagePrefix,
        ++checkIndex,
      );
      const menuRecipes =
        (recipesInMenu as { menuRecipes: Record<Recipe, number> }[])[0]
          .menuRecipes;
      assertAndLog(
        Object.keys(menuRecipes).length,
        2,
        "Menu should still contain 2 recipes",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        menuRecipes[RECIPE_GRAVY],
        1.5,
        "Gravy scaling factor should be 1.5",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("4. Remove 'Turkey' and add 'Ham'", async () => {
      const currentStepMsg = "4. Remove 'Turkey' and add 'Ham'";
      printStepHeader(currentStepMsg);

      const removeTurkeyResult = await menuCollection.removeRecipe({
        menu: menuId,
        recipe: RECIPE_TURKEY,
      });
      assertAndLog(
        "error" in removeTurkeyResult,
        false,
        "Removing Turkey should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const addHamResult = await menuCollection.addRecipe({
        menu: menuId,
        recipe: RECIPE_HAM,
        scalingFactor: 1.2,
      });
      assertAndLog(
        "error" in addHamResult,
        false,
        "Adding Ham should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const recipesInMenu = await menuCollection._getRecipesInMenu({
        menu: menuId,
      });
      assertAndLog(
        "error" in recipesInMenu,
        false,
        "Query recipes in menu should not return error",
        stepMessagePrefix,
        ++checkIndex,
      );
      const menuRecipes =
        (recipesInMenu as { menuRecipes: Record<Recipe, number> }[])[0]
          .menuRecipes;
      assertAndLog(
        Object.keys(menuRecipes).length,
        2,
        "Menu should still contain 2 recipes (Gravy & Ham)",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        RECIPE_TURKEY in menuRecipes,
        false,
        "Turkey should no longer be in menuRecipes",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        menuRecipes[RECIPE_HAM],
        1.2,
        "Ham scaling factor should be 1.2",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        menuRecipes[RECIPE_GRAVY],
        1.5,
        "Gravy scaling factor should remain 1.5",
        stepMessagePrefix,
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - createMenu Action", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "createMenu Action Test";

  try {
    const futureDate = getFutureDate(7);

    await t.step("1. Successfully create a menu", async () => {
      const currentStepMsg = "1. Successfully create a menu";
      printStepHeader(currentStepMsg);
      const result = await menuCollection.createMenu({
        name: "Dinner Party",
        date: futureDate,
        actingUser: TEST_USER_ALICE,
      });
      assertAndLog(
        "menu" in result,
        true,
        "Should return a menu ID on success",
        stepMessagePrefix,
        ++checkIndex,
      );
      const menuId = (result as { menu: ID }).menu;
      assertExistsAndLog(
        menuId,
        "Menu ID should not be null/undefined",
        stepMessagePrefix,
        ++checkIndex,
      );

      const queriedMenu = await menuCollection._getMenuDetails({
        menu: menuId,
      });
      assertAndLog(
        "error" in queriedMenu,
        false,
        "Query should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (queriedMenu as { name: string }[])[0].name,
        "Dinner Party",
        "Menu name should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("2. Fail to create menu with empty name", async () => {
      const currentStepMsg = "2. Fail to create menu with empty name";
      printStepHeader(currentStepMsg);
      const result = await menuCollection.createMenu({
        name: "",
        date: getFutureDate(8),
        actingUser: TEST_USER_ALICE,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for empty name",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        "Menu name cannot be empty.",
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("3. Fail to create menu with date in the past", async () => {
      const currentStepMsg = "3. Fail to create menu with date in the past";
      printStepHeader(currentStepMsg);
      const pastDate = getNormalizedDate(2020, 1, 1);
      const result = await menuCollection.createMenu({
        name: "Past Dinner",
        date: pastDate,
        actingUser: TEST_USER_ALICE,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for past date",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        "Menu date must be in the future.",
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "4. Fail to create menu when one already exists for user on same date",
      async () => {
        const currentStepMsg =
          "4. Fail to create menu when one already exists for user on same date";
        printStepHeader(currentStepMsg);
        const sharedDate = getFutureDate(9);
        await menuCollection.createMenu({
          name: "Original Menu",
          date: sharedDate,
          actingUser: TEST_USER_BOB,
        });

        const result = await menuCollection.createMenu({
          name: "Duplicate Menu",
          date: sharedDate,
          actingUser: TEST_USER_BOB,
        });
        assertAndLog(
          "error" in result,
          true,
          "Should return an error for duplicate menu on same date",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (result as { error: string }).error,
          `A menu already exists for user ${TEST_USER_BOB} on ${
            sharedDate.toISOString().split("T")[0]
          }.`,
          "Error message should match for duplicate menu",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - updateMenu Action", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "updateMenu Action Test";

  try {
    const initialDate = getFutureDate(10);
    const createResult = await menuCollection.createMenu({
      name: "Old Name",
      date: initialDate,
      actingUser: TEST_USER_ALICE,
    });
    const menuId = (createResult as { menu: ID }).menu;

    await t.step("1. Successfully update menu name", async () => {
      const currentStepMsg = "1. Successfully update menu name";
      printStepHeader(currentStepMsg);
      const updateResult = await menuCollection.updateMenu({
        menu: menuId,
        name: "New Name",
      });
      assertAndLog(
        "error" in updateResult,
        false,
        "Should not return an error on successful name update",
        stepMessagePrefix,
        ++checkIndex,
      );

      const queriedMenu = await menuCollection._getMenuDetails({
        menu: menuId,
      });
      assertAndLog(
        (queriedMenu as { name: string }[])[0].name,
        "New Name",
        "Menu name should be updated",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("2. Successfully update menu date", async () => {
      const currentStepMsg = "2. Successfully update menu date";
      printStepHeader(currentStepMsg);
      const newDate = getFutureDate(15);
      const updateResult = await menuCollection.updateMenu({
        menu: menuId,
        date: newDate,
      });
      assertAndLog(
        "error" in updateResult,
        false,
        "Should not return an error on successful date update",
        stepMessagePrefix,
        ++checkIndex,
      );

      const queriedMenu = await menuCollection._getMenuDetails({
        menu: menuId,
      });
      assertAndLog(
        (queriedMenu as { date: Date }[])[0].date.toISOString().split("T")[0],
        newDate.toISOString().split("T")[0],
        "Menu date should be updated",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("3. Fail to update non-existent menu", async () => {
      const currentStepMsg = "3. Fail to update non-existent menu";
      printStepHeader(currentStepMsg);
      const nonExistentMenu = freshID();
      const updateResult = await menuCollection.updateMenu({
        menu: nonExistentMenu,
        name: "Non Existent",
      });
      assertAndLog(
        "error" in updateResult,
        true,
        "Should return an error for non-existent menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (updateResult as { error: string }).error,
        `Menu with ID ${nonExistentMenu} not found.`,
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("4. Fail to update menu with empty name", async () => {
      const currentStepMsg = "4. Fail to update menu with empty name";
      printStepHeader(currentStepMsg);
      const updateResult = await menuCollection.updateMenu({
        menu: menuId,
        name: "",
      });
      assertAndLog(
        "error" in updateResult,
        true,
        "Should return an error for empty name update",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (updateResult as { error: string }).error,
        "Menu name cannot be empty.",
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "5. Fail to update menu date to a conflicting date for the same user",
      async () => {
        const currentStepMsg =
          "5. Fail to update menu date to a conflicting date for the same user";
        printStepHeader(currentStepMsg);
        const conflictDate = getFutureDate(20);
        await menuCollection.createMenu({
          name: "Conflict Menu",
          date: conflictDate,
          actingUser: TEST_USER_ALICE,
        }); // Create a second menu for Alice on `conflictDate`

        const updateResult = await menuCollection.updateMenu({
          menu: menuId,
          date: conflictDate, // Try to update Alice's first menu to this date
        });
        assertAndLog(
          "error" in updateResult,
          true,
          "Should return an error for date conflict",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (updateResult as { error: string }).error,
          `Another menu already exists for user ${TEST_USER_ALICE} on ${
            conflictDate.toISOString().split("T")[0]
          }.`,
          "Error message should match for date conflict",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step("6. Fail to update menu with no valid fields", async () => {
      const currentStepMsg = "6. Fail to update menu with no valid fields";
      printStepHeader(currentStepMsg);
      const updateResult = await menuCollection.updateMenu({ menu: menuId }); // No name or date provided
      assertAndLog(
        "error" in updateResult,
        true,
        "Should return an error for no valid fields",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (updateResult as { error: string }).error,
        "No valid fields provided for menu update (name or date).",
        "Error message should match for no valid fields",
        stepMessagePrefix,
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - addRecipe Action", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "addRecipe Action Test";

  try {
    const futureDate = getFutureDate(1);
    const createResult = await menuCollection.createMenu({
      name: "Test Menu",
      date: futureDate,
      actingUser: TEST_USER_ALICE,
    });
    const menuId = (createResult as { menu: ID }).menu;

    await t.step("1. Successfully add a recipe to a menu", async () => {
      const currentStepMsg = "1. Successfully add a recipe to a menu";
      printStepHeader(currentStepMsg);
      const addResult = await menuCollection.addRecipe({
        menu: menuId,
        recipe: RECIPE_POTATOES,
        scalingFactor: 2.0,
      });
      assertAndLog(
        "error" in addResult,
        false,
        "Adding recipe should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const recipes = await menuCollection._getRecipesInMenu({ menu: menuId });
      const menuRecipes =
        (recipes as { menuRecipes: Record<Recipe, number> }[])[0].menuRecipes;
      assertAndLog(
        menuRecipes[RECIPE_POTATOES],
        2.0,
        "Recipe scaling factor should be 2.0",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("2. Fail to add recipe to a non-existent menu", async () => {
      const currentStepMsg = "2. Fail to add recipe to a non-existent menu";
      printStepHeader(currentStepMsg);
      const nonExistentMenu = freshID();
      const addResult = await menuCollection.addRecipe({
        menu: nonExistentMenu,
        recipe: RECIPE_VEGGIES,
        scalingFactor: 1.0,
      });
      assertAndLog(
        "error" in addResult,
        true,
        "Should return an error for non-existent menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (addResult as { error: string }).error,
        `Menu with ID ${nonExistentMenu} not found.`,
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "3. Fail to add recipe with non-positive scaling factor",
      async () => {
        const currentStepMsg =
          "3. Fail to add recipe with non-positive scaling factor";
        printStepHeader(currentStepMsg);
        const addResult = await menuCollection.addRecipe({
          menu: menuId,
          recipe: RECIPE_VEGGIES,
          scalingFactor: 0.0,
        });
        assertAndLog(
          "error" in addResult,
          true,
          "Should return an error for non-positive scaling factor",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (addResult as { error: string }).error,
          "Scaling factor must be greater than 0.",
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step(
      "4. Fail to add a recipe that already exists in the menu",
      async () => {
        const currentStepMsg =
          "4. Fail to add a recipe that already exists in the menu";
        printStepHeader(currentStepMsg);
        const addResult = await menuCollection.addRecipe({
          menu: menuId,
          recipe: RECIPE_POTATOES, // Already added in step 1
          scalingFactor: 1.0,
        });
        assertAndLog(
          "error" in addResult,
          true,
          "Should return an error for existing recipe",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (addResult as { error: string }).error,
          `Recipe ${RECIPE_POTATOES} already exists in menu ${menuId}.`,
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - removeRecipe Action", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "removeRecipe Action Test";

  try {
    const futureDate = getFutureDate(2);
    const createResult = await menuCollection.createMenu({
      name: "Removal Test Menu",
      date: futureDate,
      actingUser: TEST_USER_ALICE,
    });
    const menuId = (createResult as { menu: ID }).menu;
    await menuCollection.addRecipe({
      menu: menuId,
      recipe: RECIPE_TURKEY,
      scalingFactor: 1.0,
    });
    await menuCollection.addRecipe({
      menu: menuId,
      recipe: RECIPE_GRAVY,
      scalingFactor: 0.5,
    });

    await t.step("1. Successfully remove a recipe from a menu", async () => {
      const currentStepMsg = "1. Successfully remove a recipe from a menu";
      printStepHeader(currentStepMsg);
      const removeResult = await menuCollection.removeRecipe({
        menu: menuId,
        recipe: RECIPE_TURKEY,
      });
      assertAndLog(
        "error" in removeResult,
        false,
        "Removing recipe should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const recipes = await menuCollection._getRecipesInMenu({ menu: menuId });
      const menuRecipes =
        (recipes as { menuRecipes: Record<Recipe, number> }[])[0].menuRecipes;
      assertAndLog(
        RECIPE_TURKEY in menuRecipes,
        false,
        "Turkey should no longer be in menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        Object.keys(menuRecipes).length,
        1,
        "Menu should contain only 1 recipe",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "2. Fail to remove recipe from a non-existent menu",
      async () => {
        const currentStepMsg =
          "2. Fail to remove recipe from a non-existent menu";
        printStepHeader(currentStepMsg);
        const nonExistentMenu = freshID();
        const removeResult = await menuCollection.removeRecipe({
          menu: nonExistentMenu,
          recipe: RECIPE_GRAVY,
        });
        assertAndLog(
          "error" in removeResult,
          true,
          "Should return an error for non-existent menu",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (removeResult as { error: string }).error,
          `Menu with ID ${nonExistentMenu} not found.`,
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step("3. Fail to remove a recipe not in the menu", async () => {
      const currentStepMsg = "3. Fail to remove a recipe not in the menu";
      printStepHeader(currentStepMsg);
      const removeResult = await menuCollection.removeRecipe({
        menu: menuId,
        recipe: RECIPE_HAM, // Not added to this menu
      });
      assertAndLog(
        "error" in removeResult,
        true,
        "Should return an error for recipe not in menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (removeResult as { error: string }).error,
        `Recipe ${RECIPE_HAM} not found in menu ${menuId}.`,
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - changeRecipeScaling Action", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "changeRecipeScaling Action Test";

  try {
    const futureDate = getFutureDate(3);
    const createResult = await menuCollection.createMenu({
      name: "Scaling Test Menu",
      date: futureDate,
      actingUser: TEST_USER_ALICE,
    });
    const menuId = (createResult as { menu: ID }).menu;
    await menuCollection.addRecipe({
      menu: menuId,
      recipe: RECIPE_TURKEY,
      scalingFactor: 1.0,
    });

    await t.step("1. Successfully change recipe scaling factor", async () => {
      const currentStepMsg = "1. Successfully change recipe scaling factor";
      printStepHeader(currentStepMsg);
      const changeResult = await menuCollection.changeRecipeScaling({
        menu: menuId,
        recipe: RECIPE_TURKEY,
        newScalingFactor: 2.5,
      });
      assertAndLog(
        "error" in changeResult,
        false,
        "Changing scaling should succeed",
        stepMessagePrefix,
        ++checkIndex,
      );

      const recipes = await menuCollection._getRecipesInMenu({ menu: menuId });
      const menuRecipes =
        (recipes as { menuRecipes: Record<Recipe, number> }[])[0].menuRecipes;
      assertAndLog(
        menuRecipes[RECIPE_TURKEY],
        2.5,
        "Turkey scaling factor should be 2.5",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "2. Fail to change scaling for recipe in non-existent menu",
      async () => {
        const currentStepMsg =
          "2. Fail to change scaling for recipe in non-existent menu";
        printStepHeader(currentStepMsg);
        const nonExistentMenu = freshID();
        const changeResult = await menuCollection.changeRecipeScaling({
          menu: nonExistentMenu,
          recipe: RECIPE_TURKEY,
          newScalingFactor: 1.0,
        });
        assertAndLog(
          "error" in changeResult,
          true,
          "Should return an error for non-existent menu",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (changeResult as { error: string }).error,
          `Menu with ID ${nonExistentMenu} not found.`,
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step(
      "3. Fail to change scaling for recipe not in menu",
      async () => {
        const currentStepMsg =
          "3. Fail to change scaling for recipe not in menu";
        printStepHeader(currentStepMsg);
        const changeResult = await menuCollection.changeRecipeScaling({
          menu: menuId,
          recipe: RECIPE_HAM, // Not in menu
          newScalingFactor: 1.0,
        });
        assertAndLog(
          "error" in changeResult,
          true,
          "Should return an error for recipe not in menu",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (changeResult as { error: string }).error,
          `Recipe ${RECIPE_HAM} not found in menu ${menuId}.`,
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step(
      "4. Fail to change scaling with non-positive new scaling factor",
      async () => {
        const currentStepMsg =
          "4. Fail to change scaling with non-positive new scaling factor";
        printStepHeader(currentStepMsg);
        const changeResult = await menuCollection.changeRecipeScaling({
          menu: menuId,
          recipe: RECIPE_TURKEY,
          newScalingFactor: 0.0,
        });
        assertAndLog(
          "error" in changeResult,
          true,
          "Should return an error for non-positive new scaling factor",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (changeResult as { error: string }).error,
          "New scaling factor must be greater than 0.",
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );
  } finally {
    await client.close();
  }
});

Deno.test("MenuCollectionConcept - Query Actions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuCollection = new MenuCollectionConcept(db);
  let checkIndex = 0;
  const stepMessagePrefix = "Query Actions Test";

  try {
    // Setup for queries
    const date1 = getFutureDate(21);
    const date2 = getFutureDate(22);
    const date3 = getFutureDate(23);

    const createResult1 = await menuCollection.createMenu({
      name: "Alice's First Menu",
      date: date1,
      actingUser: TEST_USER_ALICE,
    });
    const aliceMenu1Id = (createResult1 as { menu: ID }).menu;
    await menuCollection.addRecipe({
      menu: aliceMenu1Id,
      recipe: RECIPE_POTATOES,
      scalingFactor: 1.0,
    });
    await menuCollection.addRecipe({
      menu: aliceMenu1Id,
      recipe: RECIPE_GRAVY,
      scalingFactor: 1.5,
    });

    const createResult2 = await menuCollection.createMenu({
      name: "Alice's Second Menu",
      date: date2,
      actingUser: TEST_USER_ALICE,
    });
    const aliceMenu2Id = (createResult2 as { menu: ID }).menu;
    await menuCollection.addRecipe({
      menu: aliceMenu2Id,
      recipe: RECIPE_TURKEY,
      scalingFactor: 2.0,
    });

    const createResult3 = await menuCollection.createMenu({
      name: "Bob's Menu",
      date: date3,
      actingUser: TEST_USER_BOB,
    });
    const bobMenuId = (createResult3 as { menu: ID }).menu;

    await t.step("1. _getMenuDetails for existing menu", async () => {
      const currentStepMsg = "1. _getMenuDetails for existing menu";
      printStepHeader(currentStepMsg);
      const details = await menuCollection._getMenuDetails({
        menu: aliceMenu1Id,
      });
      assertAndLog(
        "error" in details,
        false,
        "Should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (details as { name: string }[]).length,
        1,
        "Should return one menu detail",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (details as { name: string }[])[0].name,
        "Alice's First Menu",
        "Menu name should match",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (details as { owner: User }[])[0].owner,
        TEST_USER_ALICE,
        "Menu owner should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("2. _getMenuDetails for non-existent menu", async () => {
      const currentStepMsg = "2. _getMenuDetails for non-existent menu";
      printStepHeader(currentStepMsg);
      const nonExistentMenu = freshID();
      const details = await menuCollection._getMenuDetails({
        menu: nonExistentMenu,
      });
      assertAndLog(
        "error" in details,
        true,
        "Should return an error for non-existent menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (details as { error: string }).error,
        `Menu with ID ${nonExistentMenu} not found.`,
        "Error message should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("3. _getRecipesInMenu for menu with recipes", async () => {
      const currentStepMsg = "3. _getRecipesInMenu for menu with recipes";
      printStepHeader(currentStepMsg);
      const recipes = await menuCollection._getRecipesInMenu({
        menu: aliceMenu1Id,
      });
      assertAndLog(
        "error" in recipes,
        false,
        "Should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (recipes as { menuRecipes: Record<Recipe, number> }[]).length,
        1,
        "Should return one result object",
        stepMessagePrefix,
        ++checkIndex,
      );
      const menuRecipes =
        (recipes as { menuRecipes: Record<Recipe, number> }[])[0].menuRecipes;
      assertAndLog(
        Object.keys(menuRecipes).length,
        2,
        "Should return 2 recipes",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        menuRecipes[RECIPE_POTATOES],
        1.0,
        "Potatoes scaling should be 1.0",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        menuRecipes[RECIPE_GRAVY],
        1.5,
        "Gravy scaling should be 1.5",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("4. _getRecipesInMenu for empty menu", async () => {
      const currentStepMsg = "4. _getRecipesInMenu for empty menu";
      printStepHeader(currentStepMsg);
      const recipes = await menuCollection._getRecipesInMenu({
        menu: bobMenuId,
      });
      assertAndLog(
        "error" in recipes,
        false,
        "Should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      const menuRecipes =
        (recipes as { menuRecipes: Record<Recipe, number> }[])[0].menuRecipes;
      assertAndLog(
        Object.keys(menuRecipes).length,
        0,
        "Should return 0 recipes for an empty menu",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "5. _getMenusOwnedByUser for user with multiple menus",
      async () => {
        const currentStepMsg =
          "5. _getMenusOwnedByUser for user with multiple menus";
        printStepHeader(currentStepMsg);
        const userMenus = await menuCollection._getMenusOwnedByUser({
          user: TEST_USER_ALICE,
        });
        assertAndLog(
          "error" in userMenus,
          false,
          "Should not return an error",
          stepMessagePrefix,
          ++checkIndex,
        );
        const menuIds = (userMenus as { menus: ID }[]).map((m) => m.menus);
        assertAndLog(
          menuIds.length,
          2,
          "Alice should own 2 menus",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          menuIds.includes(aliceMenu1Id) && menuIds.includes(aliceMenu2Id),
          true,
          "Alice's menu IDs should be present",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );

    await t.step("6. _getMenusOwnedByUser for user with no menus", async () => {
      const currentStepMsg = "6. _getMenusOwnedByUser for user with no menus";
      printStepHeader(currentStepMsg);
      const userMenus = await menuCollection._getMenusOwnedByUser({
        user: freshID(), // A new user with no menus
      });
      assertAndLog(
        "error" in userMenus,
        false,
        "Should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (userMenus as { menus: ID }[]).length,
        0,
        "User with no menus should return an empty array",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step("7. _getMenuByDate for existing menu/date/owner", async () => {
      const currentStepMsg = "7. _getMenuByDate for existing menu/date/owner";
      printStepHeader(currentStepMsg);
      const menuByDate = await menuCollection._getMenuByDate({
        date: date1,
        owner: TEST_USER_ALICE,
      });
      assertAndLog(
        "error" in menuByDate,
        false,
        "Should not return an error",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (menuByDate as { menu: ID }[]).length,
        1,
        "Should return one menu",
        stepMessagePrefix,
        ++checkIndex,
      );
      assertAndLog(
        (menuByDate as { menu: ID }[])[0].menu,
        aliceMenu1Id,
        "Returned menu ID should match",
        stepMessagePrefix,
        ++checkIndex,
      );
    });

    await t.step(
      "8. _getMenuByDate for non-existent menu/date/owner",
      async () => {
        const currentStepMsg =
          "8. _getMenuByDate for non-existent menu/date/owner";
        printStepHeader(currentStepMsg);
        const nonExistentDate = getFutureDate(30);
        const menuByDate = await menuCollection._getMenuByDate({
          date: nonExistentDate,
          owner: TEST_USER_ALICE,
        });
        assertAndLog(
          "error" in menuByDate,
          true,
          "Should return an error for non-existent menu by date/owner",
          stepMessagePrefix,
          ++checkIndex,
        );
        assertAndLog(
          (menuByDate as { error: string }).error,
          `No menu found for user ${TEST_USER_ALICE} on date ${
            nonExistentDate.toISOString().split("T")[0]
          }.`,
          "Error message should match",
          stepMessagePrefix,
          ++checkIndex,
        );
      },
    );
  } finally {
    await client.close();
  }
});
