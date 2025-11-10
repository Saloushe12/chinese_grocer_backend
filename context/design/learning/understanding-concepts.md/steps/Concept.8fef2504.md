---
timestamp: 'Fri Nov 07 2025 21:06:03 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210603.73918336.md]]'
content_id: 8fef250415abb1d5a91d449529146790ab6f810ba8ed0c3c432daa19517992c2
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
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.
* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record.
* `deleteReviewsByUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes all `Review` records created by the specified `userId`.
* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.
* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.

***
