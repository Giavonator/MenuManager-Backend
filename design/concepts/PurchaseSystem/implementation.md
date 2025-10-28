[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@PurchaseSystem](./PurchaseSystem.md)

[@PurchaseSystemConcept.ts](../../../src/concepts/PurchaseSystem/PurchaseSystemConcept.ts)

EXAMPLE:
```md

**principle** A chef `createRecipe` for "Spicy Pasta". They `addRecipeIngredient` for pasta, tomatoes, and spices. After defining all instructions and serving details via `updateRecipe`, they `designateOwner` themselves. Another chef finds "Spicy Pasta", `duplicateRecipe` a new recipe as "Mild Pasta" under their ownership, and `updateRecipe`/`updateRecipeIngredient` to change the recipe more to their liking.
```

# PurchaseSystem.md currently doesn't have a principle. Please write out a concise operating principle that covers its use case throughout using the individual actions. This is different than just a purpose, its kind of like an operating path for the principle use case that walk through the different actions.

# response:

**principle** When a user creates a 'Shopping Cart' as a `CompositeOrder`, then adds various items like 'Milk' and 'Bread' as `SelectOrder`s, providing multiple `AtomicOrder` options for each (e.g., different brands or package sizes), and associates these `SelectOrder`s with the 'Shopping Cart' via `addSelectOrderToCompositeOrder` with specified quantities, the system will `calculateOptimalPurchase` to automatically determine the most cost-effective combination of `AtomicOrder`s to fulfill all required quantities, enabling the user to `purchaseOrder` the entire cart with the optimized plan.