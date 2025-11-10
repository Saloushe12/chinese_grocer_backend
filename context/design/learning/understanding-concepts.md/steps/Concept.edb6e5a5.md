---
timestamp: 'Fri Nov 07 2025 21:07:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210756.a26c4c14.md]]'
content_id: edb6e5a5ae70b7cff6a8d43ae4767b0c7295f8fb0feabc736d5c93b675fec6f3
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
* `getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.
* `deleteRatingForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the `Rating` record for the specified `storeId`. This action is typically invoked by a synchronization.

**queries**

* `_getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.

***
