---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: 14575150befec49f299dd4eb9a0eca0011e38ef74a41cecaf7a8733d1615b90e
---

# Concept: Review

**purpose**
To capture textual reviews and individual ratings submitted by users for specific stores. This concept is solely responsible for the *individual* review data.

**state**
Each `Review` record:

* `reviewId`: String (unique document identifier)
* `storeId`: String (references a `Store`)
* `userId`: String (references a `User`)
* `text`: String (the content of the review)
* `rating`: Number (a specific numeric rating for this review, e.g., 1-5)

**actions**

* `createReview(userId: String, storeId: String, text: String, rating: Number): (reviewId: String) | (error: String)`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. The aggregate rating for the store is updated by a synchronization. Returns an `error` if pre-conditions fail.
* `deleteReview(reviewId: String): {} | (error: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record. The aggregate rating for the store is adjusted by a synchronization. Returns an `error` if `reviewId` does not exist.
* `deleteReviewsForStore(storeId: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Review` records associated with the specified `storeId`. This action is typically invoked by a synchronization. Returns an `error` if `storeId` does not exist.
* `deleteReviewsByUser(userId: String): {} | (error: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes all `Review` records created by the specified `userId`. This action is typically invoked by a synchronization. Returns an `error` if `userId` does not exist.

**queries**

* `_getReviewByIdFull(reviewId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Returns an array containing the full details of the specified review. (For deletion syncs and `passthrough.ts`).
* `_getReviewsForStoreFull(storeId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all review details associated with the specified `storeId`. (For `passthrough.ts`).
* `_getReviewsByUserFull(userId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all review details created by the specified `userId`. (For `passthrough.ts`).

***
