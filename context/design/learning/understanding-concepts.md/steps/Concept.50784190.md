---
timestamp: 'Sat Nov 08 2025 22:58:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_225836.a5c426e2.md]]'
content_id: 50784190b5fd3b958f9fb4dda17379874d0d5371de43f2ef1ad52c55a0553ae9
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
  * **Requires:** The `storeId` must exist. The `contribution` object contains the `rating` of a new or updated review and its `weight`.
  * **Effect:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. This action is intended to be invoked by a synchronization mechanism.
* `deleteRatingForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the `Rating` record for the specified `storeId`. This action is typically invoked by a synchronization.

**queries**

* `_getRating(storeId: String): (storeId: String, aggregatedRating: Number, reviewCount: Number)`
  * **Requires:** `true`
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store. (For `passthrough.ts` and general lookup).

***
