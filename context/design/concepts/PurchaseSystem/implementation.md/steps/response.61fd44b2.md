---
timestamp: 'Tue Oct 28 2025 18:02:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_180221.88e65cf3.md]]'
content_id: 61fd44b2bc38089a65656faf151114181a287634fe63172f62c6ec13c58f066f
---

# response:

The `calculateOptimalPurchase` action in `PurchaseSystemConcept.ts` is indeed quite complex due to its multi-phase nature, including tree traversal, topological sorting, and nested calculations.

The primary way to improve readability and maintainability for such a method is to break it down into smaller, more focused private helper methods. This encapsulates specific parts of the logic, making the main method easier to follow and individual parts easier to test and reason about.

Here's an analysis and refactored version of the `calculateOptimalPurchase` method, along with new helper methods:

**Analysis of Current `calculateOptimalPurchase` Logic:**

1. **Iterate through root orders**: The outer loop correctly ensures that each independent purchase tree (rooted by a `CompositeOrder`) is processed only once per `calculateOptimalPurchase` call.
2. **Tree Traversal**: It first gathers all composite orders within a given root's subtree.
3. **Topological Sort**: It correctly sets up an "in-degree" map and a queue to process composite orders from the leaves upwards (bottom-up approach). This is essential for ensuring that child costs are calculated before their parents.
4. **Local Requirements Aggregation**: For each composite order, it aggregates quantity requirements from its direct `childSelectOrders`, applying their respective scale factors.
5. **Optimal Atomic Order Selection**: For each aggregated `SelectOrder` requirement, it iterates through its `AtomicOrder` options to find the one that fulfills the required quantity at the minimum cost, ensuring whole units are purchased (`Math.ceil`).
6. **Child Composite Order Contribution**: It incorporates the `totalCost` and `optimalPurchase` maps from already calculated child composite orders, scaling them appropriately.
7. **State Update**: Finally, it updates the `totalCost` and `optimalPurchase` for the current composite order in the database.

**Identified Areas for Improvement (and how the refactoring addresses them):**

* **High Cyclomatic Complexity**: The many nested loops and conditionals make it hard to understand at a glance.
  * **Solution**: Extract sub-logic into private helper methods.
* **Repetitive Logic**: The selection of the optimal `AtomicOrder` for a `SelectOrder` is a self-contained unit of logic that can be reused or simply extracted for clarity.
  * **Solution**: Create `_findOptimalAtomicPurchase` helper.
* **Monolithic Structure**: The entire process is in one large method.
  * **Solution**: Break down into clear phases, each potentially calling a helper method.
* **Clarity of Tree Traversal**: While correct, the initial tree traversal for `allCompositeOrdersInTree` can be a dedicated helper.
  * **Solution**: Create `_getAllCompositeOrdersInTree` helper.

***

### Refactoring Strategy:

1. **New Helper `_getAllCompositeOrdersInTree(rootId: ID)`**: This private method will perform the BFS/DFS traversal to collect all composite orders belonging to a given root, returning them as a `Map<ID, CompositeOrder>`.
2. **New Helper `_findOptimalAtomicPurchase(selectOrderId: ID, required: { quantity: number; units: string })`**: This private method will encapsulate the logic for determining the most cost-effective `AtomicOrder` (and its required quantity) for a specific `SelectOrder`'s aggregated requirement.
3. **Refactor `calculateOptimalPurchase`**:
   * Keep the outer loop for iterating through distinct root trees.
   * Call `_getAllCompositeOrdersInTree` once per root.
   * Maintain the topological sort setup (`inDegree`, `compositeOrderProcessQueue`).
   * Inside the topological sort loop, call `_findOptimalAtomicPurchase` for each `SelectOrder`'s requirements.
   * Clearly separate the steps of:
     * Aggregating select order requirements.
     * Calculating costs from select orders.
     * Aggregating costs from child composite orders.
     * Updating the current composite order's state.

***

### Refactored `PurchaseSystemConcept.ts` (`calculateOptimalPurchase` and new helpers):

First, add the two new private helper methods:

```typescript
// ... (existing imports, interfaces, and other methods) ...

export default class PurchaseSystemConcept {
  // ... (existing properties and constructor) ...

  // ... (existing helper methods like getErrorMessage, findAnyOrderByAssociateID, findAnyOrderById, etc.) ...

  /**
   * Helper to traverse a composite order tree and collect all composite orders within it.
   * @param rootId The ID of the root composite order of the tree.
   * @returns A Map where keys are CompositeOrder IDs and values are the CompositeOrder documents.
   */
  private async _getAllCompositeOrdersInTree(
    rootId: ID,
  ): Promise<Map<ID, CompositeOrder>> {
    const allCompositeOrders = new Map<ID, CompositeOrder>();
    const queue: ID[] = [rootId];
    const visited = new Set<ID>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const comp = await this.compositeOrders.findOne({ _id: currentId });
      if (comp) {
        allCompositeOrders.set(currentId, comp);
        for (const childId of Object.keys(comp.childCompositeOrders)) {
          if (!visited.has(childId as ID)) {
            queue.push(childId as ID);
          }
        }
      } else {
        console.warn(
          `_getAllCompositeOrdersInTree: CompositeOrder with ID '${currentId}' not found during traversal. This might indicate data inconsistency.`,
        );
      }
    }
    return allCompositeOrders;
  }

  /**
   * Helper to find the optimal AtomicOrder for a given SelectOrder requirement.
   * @param selectOrderId The ID of the SelectOrder.
   * @param required The required quantity and units.
   * @returns An object containing the best AtomicOrder ID, quantity to buy, and cost, or null if no valid option.
   */
  private async _findOptimalAtomicPurchase(
    selectOrderId: ID,
    required: { quantity: number; units: string },
  ): Promise<{ atomicId: ID; quantityToBuy: number; cost: number } | null> {
    const selectOrderDoc = await this.selectOrders.findOne({
      _id: selectOrderId,
    });
    if (
      !selectOrderDoc || selectOrderDoc.baseQuantity === -1 ||
      selectOrderDoc.childAtomicOrders.length === 0
    ) {
      return null; // SelectOrder without atomic options or uninitialized
    }

    let bestAtomicOption: AtomicOrder | null = null;
    let minCostForSelectOrder = Infinity;
    let optimalUnitsToBuy = 0;

    const atomicOptions = await this.atomicOrders
      .find({ _id: { $in: selectOrderDoc.childAtomicOrders } })
      .toArray();

    for (const atomicOption of atomicOptions) {
      if (atomicOption.quantity <= 0) continue; // Avoid division by zero or invalid options

      // Basic unit consistency check. A full system would need unit conversion.
      if (atomicOption.units !== required.units) {
        console.warn(
          `Unit mismatch for SelectOrder '${selectOrderId}' (req: ${required.units}) and AtomicOrder '${atomicOption._id}' (prov: ${atomicOption.units}). This may lead to inaccurate cost calculations.`,
        );
        continue;
      }

      const numUnitsToBuy = Math.ceil(required.quantity / atomicOption.quantity);
      const currentOptionCost = numUnitsToBuy * atomicOption.price;

      if (currentOptionCost < minCostForSelectOrder) {
        minCostForSelectOrder = currentOptionCost;
        bestAtomicOption = atomicOption;
        optimalUnitsToBuy = numUnitsToBuy;
      }
    }

    if (bestAtomicOption) {
      return {
        atomicId: bestAtomicOption._id,
        quantityToBuy: optimalUnitsToBuy,
        cost: minCostForSelectOrder,
      };
    }
    return null;
  }

  /**
   * Action to calculate the optimal purchase for a set of CompositeOrders.
   * This is a complex action that traverses the composite order tree, aggregates requirements,
   * finds optimal atomic order combinations, and propagates costs and optimal purchases upwards.
   *
   * calculateOptimalPurchase (compositeOrders: Set of CompositeOrder)
   *
   * **requires** Every CompositeOrder in `compositeOrders` exists.
   *
   * **effects** Don't add to state but for this action keep track of `processedRootNodes`.
   * For each `compositeOrder` in the passed in set of `compositeOrders`:
   * If `compositeOrder.purchased`, skip it.
   * If `compositeOrder.rootOrder` is in `processedRootNodes`, skip it.
   * Now knowing we have a tree that has not been purchased or already calculated during this action, we continue.
   * From the `compositeOrder.rootOrder` we propagate down multiplying the scaling factors,
   * until we have gone through every CompositeOrder in the tree and now have a map of SelectOrder to Float
   * for every SelectOrder we need to purchase for this `compositeOrder.rootOrder`
   * (if SelectOrder doesn't have an AtomicOrder option, have cost for this SelectOrder during calculations be zero).
   * For each individual SelectOrder now knowing its total scale factor,
   * we select the optimal AtomicOrder that when purchased in multiples can buy at least the necessary quantity for the least amount of money.
   * Now knowing all of the optimal AtomicOrders, we use those to propagate up from the leaf CompositeOrders
   * calculating their costs and setting the `compositeOrder.totalCost` and `compositeOrder.optimalPurchase` map for every CompositeOrder.
   */
  async calculateOptimalPurchase(
    input: CalculateOptimalPurchaseInput,
  ): Promise<CalculateOptimalPurchaseOutput> {
    try {
      const { compositeOrders: compositeOrderIDs } = input;
      const processedRootNodes = new Set<ID>();

      for (const compositeOrderID of compositeOrderIDs) {
        const initialCompositeOrder = await this.compositeOrders.findOne({
          _id: compositeOrderID,
        });
        if (!initialCompositeOrder) {
          console.warn(
            `calculateOptimalPurchase: Initial CompositeOrder with ID '${compositeOrderID}' not found. Skipping.`,
          );
          continue;
        }

        if (initialCompositeOrder.purchased) {
          continue; // Skip if already purchased
        }

        const rootOrderID = initialCompositeOrder.rootOrder;
        if (processedRootNodes.has(rootOrderID)) {
          continue; // Already processed this root tree in this call
        }
        processedRootNodes.add(rootOrderID);

        // Phase 1: Collect all composite orders in the current root's tree
        const allCompositeOrdersInTree = await this._getAllCompositeOrdersInTree(
          rootOrderID,
        );

        // Phase 2: Set up for topological sort (bottom-up processing)
        const compositeOrderProcessQueue: ID[] = [];
        const inDegree = new Map<ID, number>(); // Number of uncalculated child composite orders it depends on

        for (const compID of allCompositeOrdersInTree.keys()) {
          const comp = allCompositeOrdersInTree.get(compID)!;
          const dependencies = Object.keys(comp.childCompositeOrders).length;
          inDegree.set(compID, dependencies);
          if (dependencies === 0) { // Leaf composite order (no composite children)
            compositeOrderProcessQueue.push(compID);
          }
        }

        const calculatedCompositeResults = new Map<
          ID,
          { cost: number; optimal: Record<ID, number> }
        >();

        // Phase 3: Process composite orders bottom-up
        while (compositeOrderProcessQueue.length > 0) {
          const currentCompositeID = compositeOrderProcessQueue.shift()!;
          const currentComposite = allCompositeOrdersInTree.get(
            currentCompositeID,
          );
          if (!currentComposite) {
            console.error(`Error: CompositeOrder '${currentCompositeID}' missing from tree map during processing.`);
            continue; // Should not happen if _getAllCompositeOrdersInTree is correct
          }

          let currentCompositeTotalCost = 0;
          const currentCompositeOptimalPurchase: Record<ID, number> = {};
          const localAggregatedSelectOrderRequirements: Map<
            ID,
            { quantity: number; units: string }
          > = new Map();

          // Step 3.1: Aggregate requirements from direct child SelectOrders
          for (const selectID in currentComposite.childSelectOrders) {
            const selectScale = currentComposite.childSelectOrders[selectID];
            const selectOrderDoc = await this.selectOrders.findOne({
              _id: selectID as ID,
            });

            if (
              !selectOrderDoc || selectOrderDoc.baseQuantity === -1 ||
              selectOrderDoc.childAtomicOrders.length === 0
            ) {
              console.warn(
                `calculateOptimalPurchase: SelectOrder '${selectID}' has no atomic options or is uninitialized. Skipping for cost calculation.`,
              );
              continue;
            }
            const totalRequiredQuantity = selectScale *
              selectOrderDoc.baseQuantity;
            const existingRequirement = localAggregatedSelectOrderRequirements
              .get(selectID as ID);
            if (existingRequirement) {
              existingRequirement.quantity += totalRequiredQuantity;
              localAggregatedSelectOrderRequirements.set(
                selectID as ID,
                existingRequirement,
              );
            } else {
              localAggregatedSelectOrderRequirements.set(selectID as ID, {
                quantity: totalRequiredQuantity,
                units: selectOrderDoc.baseUnits,
              });
            }
          }

          // Step 3.2: Find optimal AtomicOrders for each aggregated SelectOrder requirement
          for (
            const [selectOrderID, required]
              of localAggregatedSelectOrderRequirements.entries()
          ) {
            const optimalResult = await this._findOptimalAtomicPurchase(
              selectOrderID,
              required,
            );
            if (optimalResult) {
              currentCompositeOptimalPurchase[optimalResult.atomicId] =
                (currentCompositeOptimalPurchase[optimalResult.atomicId] ||
                  0) + optimalResult.quantityToBuy;
              currentCompositeTotalCost += optimalResult.cost;
            } else {
              console.warn(
                `calculateOptimalPurchase: Could not find optimal atomic purchase for SelectOrder '${selectOrderID}' with requirements: ${JSON.stringify(required)}. Assuming zero cost/quantity for this part.`,
              );
            }
          }

          // Step 3.3: Add contributions from child CompositeOrders that have already been calculated
          for (const childCompID in currentComposite.childCompositeOrders) {
            const childScale =
              currentComposite.childCompositeOrders[childCompID];
            const childCalculated = calculatedCompositeResults.get(
              childCompID as ID,
            );
            if (childCalculated) {
              currentCompositeTotalCost += childCalculated.cost * childScale;
              for (const atomicID in childCalculated.optimal) {
                currentCompositeOptimalPurchase[atomicID] =
                  (currentCompositeOptimalPurchase[atomicID] || 0) +
                  (childCalculated.optimal[atomicID] * childScale);
              }
            } else {
              // This implies a topological sort error or missing child. Should not happen if inDegree is correct.
              console.error(
                `calculateOptimalPurchase: Error: Child CompositeOrder '${childCompID}' not calculated before parent '${currentCompositeID}'. Topological sort issue.`,
              );
            }
          }

          // Step 3.4: Store calculated values and update MongoDB
          calculatedCompositeResults.set(currentCompositeID, {
            cost: currentCompositeTotalCost,
            optimal: currentCompositeOptimalPurchase,
          });

          await this.compositeOrders.updateOne(
            { _id: currentCompositeID },
            {
              $set: {
                totalCost: currentCompositeTotalCost,
                optimalPurchase: currentCompositeOptimalPurchase,
              },
            },
          );

          // Step 3.5: Decrease in-degree of parent orders and enqueue if they become ready
          // Iterate over all composites in the tree to find direct parents
          for (const parentID of allCompositeOrdersInTree.keys()) {
            const parentComp = allCompositeOrdersInTree.get(parentID)!;
            if (currentCompositeID in parentComp.childCompositeOrders) {
              const newInDegree = (inDegree.get(parentID) || 0) - 1;
              inDegree.set(parentID, newInDegree);
              if (newInDegree === 0) {
                compositeOrderProcessQueue.push(parentID);
              }
            }
          }
        }
      } // End of outer loop for compositeOrderIDs

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to calculate optimal purchase: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  // ... (rest of the actions and all queries) ...
}
```

### Summary of Improvements:

1. **Modularity**: Two core pieces of logic (`_getAllCompositeOrdersInTree` and `_findOptimalAtomicPurchase`) are now encapsulated in private helper methods. This significantly reduces the cognitive load when reading `calculateOptimalPurchase`.
2. **Readability**: The main `calculateOptimalPurchase` method is now easier to scan, with distinct phases (collecting tree, topological sort setup, processing loop) and calls to descriptive helper methods.
3. **Maintainability**: Changes or bug fixes related to tree traversal or optimal atomic selection can now be isolated to their respective helper methods, reducing the risk of introducing regressions elsewhere.
4. **Testability**: While not explicitly shown, these helper methods would be easier to unit test independently.

This refactoring preserves the original functionality and correctness while making the code much more manageable.
