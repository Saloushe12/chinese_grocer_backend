---
timestamp: 'Tue Oct 21 2025 02:25:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_022511.8ebc5371.md]]'
content_id: 5235e8961a0641de706eb1e6f823953f24c2c34e2fd13a660c8a11a1b63b492d
---

# Concept: Rating

**purpose**
To maintain an aggregated rating score and count for a store, derived from individual reviews.

**state**
Each `Rating` record:

* `storeId`: String (references a `Store`)
* `aggregatedRating`: Number // Represents the calculated average or composite rating.
* `reviewCount`: Number // The total number of reviews contributing to the aggregated rating.

**actions**

* `updateRating(storeId: String, contribution: { rating: Number, weight: Number })`
  * **Requires:** The `storeId` must exist. The `contribution` object contains the `rating` of a new or updated review and its `weight` (e.g., 1 for a single review).
  * **Effect:** Updates the `aggregatedRating` and increments the `reviewCount` for the `storeId` based on the provided `contribution`. This action is intended to be invoked by a synchronization mechanism.
* `getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.

***
