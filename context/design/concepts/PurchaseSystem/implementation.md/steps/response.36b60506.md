---
timestamp: 'Tue Oct 28 2025 19:00:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_190031.64e217fd.md]]'
content_id: 36b6050698b3906fa2dd682f9ab29a10859416eb8705ebfea4d580a88dcdb517
---

# response:

**principle** When a user creates a 'Shopping Cart' as a `CompositeOrder`, then adds various items like 'Milk' and 'Bread' as `SelectOrder`s, providing multiple `AtomicOrder` options for each (e.g., different brands or package sizes), and associates these `SelectOrder`s with the 'Shopping Cart' via `addSelectOrderToCompositeOrder` with specified quantities, the system will `calculateOptimalPurchase` to automatically determine the most cost-effective combination of `AtomicOrder`s to fulfill all required quantities, enabling the user to `purchaseOrder` the entire cart with the optimized plan.
