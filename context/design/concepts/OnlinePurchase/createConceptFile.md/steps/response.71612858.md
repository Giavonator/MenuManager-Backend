---
timestamp: 'Thu Oct 23 2025 09:19:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_091919.2dfc0e3b.md]]'
content_id: 71612858c4ac5692fc5a2b973420c65bf697522d22ca58c0225e17f178e27049
---

# response:

```
# OnlinePurchase

**concept** OnlinePurchase [User, Item, PurchaseOption, Order]

**purpose** Orchestrate and manage the process of optimizing online purchases for aggregated orders, determining the most cost-effective shopping strategy and facilitating order finalization.

**principle** After a `PurchaseSystem.Order` (e.g., representing a shopping cart or a recipe's ingredient list) is established and populated, a user can trigger `calculateOptimalPurchase` within `OnlinePurchase`. This action leverages `StoreCatalog` to find the lowest-cost combination of `PurchaseOption`s across various stores to fulfill the `Order`'s `itemQuantities`. The result is an `OnlinePurchaseOrderData` entry, which stores the calculated `optimalPurchase` strategy (mapping stores to their chosen representative `PurchaseOption`s) and the `optimalTotalCost`. Once this strategy is determined, the user can `finalizeOnlinePurchase`, which marks the `PurchaseSystem.Order` as purchased. An order, along with its associated `OnlinePurchaseOrderData`, can be removed via `deleteOnlineOrder`.

**state**
  a set of OnlinePurchaseOrderData with
    an order Order // Reference to an Order entity from the PurchaseSystem concept
    optimalPurchase Map of String to PurchaseOption // Maps Store name (String) to a representative PurchaseOption (from StoreCatalog) chosen for that store in the optimal calculation. This PurchaseOption acts as a placeholder or key for the store's role in the optimal strategy.
    optimalTotalCost Float // The calculated minimum total cost for this order, considering the entire optimal purchase strategy.
    status String // e.g., "pending", "optimized", "finalized"

**actions**
  calculateOptimalPurchase (order: Order)
    **requires** `order` exists in `PurchaseSystem`. `order.purchased` in `PurchaseSystem` is `false`.
    **effects**
      1. Queries `PurchaseSystem._getOrderItems(order)` to retrieve the `itemQuantities` (a map of `Item` to `Float` quantities) required for the `order`.
      2. For each `Item` and its required quantity in `itemQuantities`:
         a. Queries `StoreCatalog._getPurchaseOptions(item)` to obtain all available `PurchaseOption`s from different stores that can fulfill this `Item`'s requirement.
      3. Performs an optimization calculation across all required `Item`s and their available `PurchaseOption`s to determine the global minimum cost for purchasing all items. This involves selecting a set of `PurchaseOption`s (potentially from multiple stores) for the entire order.
      4. Based on the optimal set of `PurchaseOption`s identified, populates the `OnlinePurchaseOrderData.optimalPurchase` map for the `order`. For each store involved in the optimal purchase, a representative `PurchaseOption` from `StoreCatalog` is selected (e.g., the cheapest, or the first found) to act as the map's value, signifying that store's involvement. The specific details of all `PurchaseOption`s from that store (i.e., which items to buy from it) are implicitly part of the overall strategy.
      5. Calculates the `optimalTotalCost` by summing the costs of all chosen `PurchaseOption`s in the optimal strategy and stores it in `OnlinePurchaseOrderData.optimalTotalCost`.
      6. Sets `OnlinePurchaseOrderData.status` for `order` to "optimized".
      7. If no `OnlinePurchaseOrderData` previously existed for this `order`, a new one is created; otherwise, the existing data is updated.

  finalizeOnlinePurchase (order: Order)
    **requires** `order` exists in `PurchaseSystem`. `OnlinePurchaseOrderData` for `order` has `status` "optimized". `order.purchased` in `PurchaseSystem` is `false`.
    **effects**
      1. Sets `OnlinePurchaseOrderData.status` for `order` to "finalized".
      2. Calls `PurchaseSystem.markOrderAsPurchased(order)`.
      3. (Via syncs, this action would typically trigger further processes like payment processing or sending order details to relevant stores for fulfillment.)

  deleteOnlineOrder (order: Order)
    **requires** `order` exists in `PurchaseSystem`.
    **effects**
      1. Removes the `OnlinePurchaseOrderData` entity (including its `optimalPurchase` and `optimalTotalCost`) that is associated with the given `PurchaseSystem.Order`.
      2. The `PurchaseSystem.Order` itself (and its `itemQuantities`, `cost`, `subOrders`, etc.) remains in the `PurchaseSystem` concept until explicitly handled by that concept or a relevant sync rule (e.g., a sync that triggers `PurchaseSystem.deleteOrder` if `OnlinePurchaseOrderData` is removed, assuming `PurchaseSystem` has such an action).

**queries**
  _getOnlinePurchaseData (order: Order): (optimalPurchase: Map of String to PurchaseOption, optimalTotalCost: Float, status: String)
    **requires** `order` exists in `PurchaseSystem` and has associated `OnlinePurchaseOrderData`.
    **effects** Returns the `optimalPurchase` map, `optimalTotalCost`, and `status` for the given `order`.

  _getOrdersByStatus (status: String): (orders: Set of Order)
    **requires** `status` is a valid `OnlinePurchaseOrderData.status` value.
    **effects** Returns a set of `PurchaseSystem.Order` IDs that have the given `status` in `OnlinePurchase`.
```
