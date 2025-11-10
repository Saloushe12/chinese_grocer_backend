---
timestamp: 'Fri Nov 07 2025 21:07:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210756.a26c4c14.md]]'
content_id: 0a27b51d4ba01d32de878fc4081f29248ddc8d5b828a56f4ab6aab0ad3eed4d3
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

* `createReview(userId: String, storeId: String, text: String, rating: Number): reviewId`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. The aggregate rating for the store is updated by a synchronization.
* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record. The aggregate rating for the store is adjusted by a synchronization.
* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.
* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.
* `deleteReviewsForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Review` records associated with the specified `storeId`. This action is typically invoked by a synchronization.
* `deleteReviewsByUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes all `Review` records created by the specified `userId`. This action is typically invoked by a synchronization.

**queries**

* `_getReviewById(reviewId: String): { reviewId: String, storeId: String, userId: String, text: String, rating: Number }`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Returns the full details of the specified review.
* `_getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`. (Added for consistency with `_getReviewById` and for `where` clauses)
* `_getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`. (Added for consistency with `_getReviewById` and for `where` clauses)

***
