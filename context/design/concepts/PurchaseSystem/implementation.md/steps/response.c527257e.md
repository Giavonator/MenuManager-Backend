---
timestamp: 'Tue Oct 28 2025 18:59:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_185916.981149da.md]]'
content_id: c527257e3476235683c218ccc2ba4d8700e7e356efbe02efc7ca253dc5b19367
---

# response:

## Concept principle

**principle** If a user constructs a complex meal plan (a **CompositeOrder**) by combining various recipes (other **CompositeOrder**s) and individual ingredients (representing **SelectOrder**s), where each ingredient has multiple available purchasing options from different vendors (as **AtomicOrder**s), then the system will automatically aggregate the total quantities needed, evaluate all purchasing options across the entire plan, and dynamically determine the most cost-effective combination of **AtomicOrder**s to fulfill all requirements. This allows the user to instantly see the optimal total cost and purchase breakdown for the entire plan, which can then be finalized and marked as acquired.
