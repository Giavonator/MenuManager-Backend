# Testing Execution Console

## 🧪 Deno Test: MenuManagerConcept - Operating Principle

### ➡️  Step: Part 1: User creates an empty menu

    ✅ Check 1: Menu creation should succeed
    ✅ Check 2: Menu name is correct
    ✅ Check 3: Menu owner is correct
    ✅ Check 4: Initial menu cost is 0
    ✅ Check 5: Menu date is correct
    ✅ Check 6: Menu should initially have no recipes

### ➡️  Step: Part 2.1: Register global items

    ✅ Check 1: Should successfully enter item "flour" and return a valid ID string
    ✅ Check 2: Should successfully enter item "milk" and return a valid ID string
    ✅ Check 3: Should successfully enter item "egg" and return a valid ID string
    ✅ Check 4: Should successfully enter item "butter" and return a valid ID string
    ✅ Check 5: Should successfully enter item "sugar" and return a valid ID string
    ✅ Check 6: Should successfully enter item "baking powder" and return a valid ID string
    ✅ Check 7: Should successfully enter item "water" and return a valid ID string

### ➡️  Step: Part 2.2: Create Classic Pancakes recipe

    ✅ Check 1: Classic Pancakes recipe creation should succeed
    ✅ Check 2: Add ingredient flour to Pancakes should succeed
    ✅ Check 3: Add ingredient milk to Pancakes should succeed
    ✅ Check 4: Add ingredient egg to Pancakes should succeed
    ✅ Check 5: Add ingredient butter to Pancakes should succeed
    ✅ Check 6: Add ingredient sugar to Pancakes should succeed
    ✅ Check 7: Add ingredient baking powder to Pancakes should succeed
    ✅ Check 8: Pancakes dishPrice should be correct after adding ingredients
    ✅ Check 9: Menu cost should reflect Pancakes recipe

### ➡️  Step: Part 3.1: Use LLM to pull in recipe from website

    🤖 Requesting recipe parse for URL: https://kirbiecravings.com/4-ingredient-birthday-cupcakes/
    ✅ Received response from Gemini AI!
        ⚠️ Skipping ingredient "vegetable oil" from LLM-pulled recipe as it is not a pre-existing item in the system (Not a failure).
    ✅ Successfully parsed and stored recipe: "4 Ingredient Birthday Cupcakes"
    ✅ Check 1: LLM-pulled recipe should be associated with the created menu
    ✅ Check 2: LLM-pulled recipe owner should be the test user
    ✅ Check 3: LLM-pulled recipe name should not be empty
    ✅ Check 4: LLM-pulled recipe instructions should not be empty
    ✅ Check 5: LLM-pulled recipe serving quantity should be positive
    ✅ Check 6: LLM-pulled recipe dishPrice should be correct based on raw LLM amounts (as interpreted by concept's cost calc)
    ✅ Check 7: Menu cost should be updated after LLM pull reflecting initial LLM recipe cost

### ➡️  Step: Part 3.2: Correct LLM-pulled recipe attributes and ingredients

    ✅ Check 1: Recipe name update should succeed
    ✅ Check 2: Serving quantity update should succeed
    ✅ Check 3: Dish type update should succeed
    ✅ Check 4: Update ingredient water should succeed
    Adding missing ingredient: flour
    ✅ Check 5: Add missing ingredient flour should succeed
    Adding missing ingredient: milk
    ✅ Check 6: Add missing ingredient milk should succeed
    Adding missing ingredient: butter
    ✅ Check 7: Add missing ingredient butter should succeed

### ➡️  Step: Part 3.3: Verify LLM-pulled recipe after corrections

    ✅ Check 1: Final LLM recipe name is correct
    ✅ Check 2: Final LLM recipe serving quantity is correct
    ✅ Check 3: Correct number of ingredients in final LLM recipe
    ✅ Check 4: Amount for ingredient flour should be corrected
    ✅ Check 5: Amount for ingredient milk should be corrected
    ✅ Check 6: Amount for ingredient butter should be corrected
    ✅ Check 7: Amount for ingredient water should be corrected
    ✅ Check 8: Final LLM recipe dishPrice should be correct after all corrections
    ✅ Check 9: Menu cost should reflect all three recipes after LLM correction

### ➡️  Step: Part 4.1: Confirm items

    ✅ Check 1: Item flour should now be confirmed
    ✅ Check 2: Item milk should now be confirmed
    ✅ Check 3: Item egg should now be confirmed
    ✅ Check 4: Item butter should now be confirmed
    ✅ Check 5: Item sugar should now be confirmed
    ✅ Check 6: Item baking powder should now be confirmed
    ✅ Check 7: Item water should now be confirmed

### ➡️  Step: Part 4.2: Create a cart

    ✅ Check 1: Cart creation should succeed
    ✅ Check 2: Cart start date is correct
    ✅ Check 3: Cart end date is correct (Friday)
    ✅ Check 4: Initial cart weekly cost is 0
    ✅ Check 5: Cart should initially have no menus

### ➡️  Step: Part 4.3: Add menu to the cart

    ✅ Check 1: Adding menu to cart should succeed
    ✅ Check 2: Cart should contain the menu ID
    ✅ Check 3: Cart should have 1 menu
    ✅ Check 4: Cart weekly cost should match menu cost

### ➡️  Step: Part 4.4: Administrator updates item price, verify cost recalculation

    ✅ Check 1: Updating flour price should succeed
    ✅ Check 2: Pancakes dishPrice should be updated after flour price change
    ✅ Check 3: LLM-corrected Vanilla Cupcakes dishPrice should be updated after flour price change
    ✅ Check 4: Menu cost should be updated after flour price change
    ✅ Check 5: Cart weekly cost should be updated after flour price change


## 🧪 Deno Test: MenuManagerConcept - Variant Test 1: Item Naming & Recipe Lifecycle

### ➡️  Step: Create an empty menu

    ✅ Check 1: Menu creation should succeed

### ➡️  Step: Item Naming Edge Cases

    ✅ Check 1: Adding 'all-purpose flour' alias should succeed
    ✅ Check 2: Flour should have 'all-purpose flour' alias
    ✅ Check 3: Entering 'Flour-Test1' as a new item should fail due to existing 'flour-test1'
    ✅ Check 4: Adding 'Salt-test1' as an alias for flour should fail as it's an item name already
    ✅ Check 5: Removing 'all-purpose flour-test1' alias should succeed
    ✅ Check 6: Flour should no longer have 'all-purpose flour' alias
    ✅ Check 7: Removing 'flour-test1' (last name) should fail

### ➡️  Step: Recipe Ingredient Lifecycle

    ✅ Check 1: Recipe creation should succeed
    ✅ Check 2: Initial recipe dishPrice should be 0
    ✅ Check 3: Initial menuCost should be 0 after empty recipe
    ✅ Check 4: Dish price should reflect flour cost
    ✅ Check 5: Menu cost should reflect flour cost
    ✅ Check 6: Dish price should be 0 after removing flour
    ✅ Check 7: Recipe should have no ingredients after removal
    ✅ Check 8: Menu cost should be 0 after removing flour from recipe
    ✅ Check 9: Dish price should reflect re-added flour cost
    ✅ Check 10: Recipe should have 1 ingredient after re-adding
    ✅ Check 11: Menu cost should reflect re-added flour cost

## 🧪 Deno Test: MenuManagerConcept - Variant Test 2: Cart Conflicts & Unused Items

### ➡️  Step: Register items


### ➡️  Step: Create menus with conflicting dates

    ✅ Check 1: Menu 1 creation should succeed
    ✅ Check 2: Menu 2 creation should succeed

### ➡️  Step: Cart: Adding menus with date conflicts

    ✅ Check 1: Cart creation should succeed
    ✅ Check 2: Adding menu1 to cart should succeed
    ✅ Check 3: Cart should contain 1 menu
    ✅ Check 4: Cart weekly cost should match menu1 cost
    ✅ Check 5: Adding menu2 (same date) to cart should fail
    ✅ Check 6: Cart should still contain only 1 menu


## 🧪 Deno Test: MenuManagerConcept - Variant Test 3: Complex Ingredient Amounts & Scaling

### ➡️  Step: Setup: Menu & Items

    ✅ Check 1: Menu creation should succeed

### ➡️  Step: Recipe with diverse ingredient amounts

    ✅ Check 1: Recipe creation should succeed
    ✅ Check 2: Initial dish price should be correct with float amounts
    ✅ Check 3: Dish price should remain unchanged after adding then removing an ingredient

### ➡️  Step: Scaling Factor Effects

    ✅ Check 1: Dish price should double with scaling factor 2.0
    ✅ Check 2: Menu cost should reflect scaled recipe cost
    ✅ Check 3: Cart weekly cost should reflect scaled menu cost
