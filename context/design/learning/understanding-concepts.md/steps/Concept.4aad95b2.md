---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: 4aad95b21168c82629a64648e14fb7a4fc7f8da640ca51dbe0c08f2e0148f74d
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

* `updateRating(storeId: String, contribution: { rating: Number, weight: Number }): {} | (error: String)`
  * **Requires:** The `storeId` must exist. The `contribution` object contains the `rating` of a new or updated review and its `weight`.
  * **Effect:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. This action is intended to be invoked by a synchronization mechanism. Returns an `error` if `storeId` does not exist.
* `deleteRatingForStore(storeId: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the `Rating` record for the specified `storeId`. This action is typically invoked by a synchronization. Returns an `error` if `storeId` does not exist.

**queries**

* `_getRating(storeId: String): (storeId: String, aggregatedRating: Number, reviewCount: Number)`
  * **Requires:** `true`
  * **Effect:** Returns an array containing the current `storeId`, `aggregatedRating`, and `reviewCount` for the store. (For `passthrough.ts` and general lookup).

***
