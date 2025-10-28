---
timestamp: 'Mon Oct 27 2025 22:27:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_222758.d184640f.md]]'
content_id: 625c7e75743f4f8fa58cd5a72d50f9c55d9cb0628187246ddd8976c367b87d4d
---

# Please read the PurchaseSystem and fix the ambiguity with this change: AtomicOrder should be the base purchasable things that make the basis of the order. These AtomicOrders should instead have a set of parentSelectOrders for all of the select orders that have the option of selecting this item. This way if the cost of an AtomicOrder ever changes (like the store sells it for more) then the cost can be reflected easily up into the SelectOrder via the pointer.
