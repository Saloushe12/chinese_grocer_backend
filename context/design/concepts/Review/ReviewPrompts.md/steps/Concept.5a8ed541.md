---
timestamp: 'Tue Oct 21 2025 06:32:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_063252.e01f731c.md]]'
content_id: 5a8ed54189892286bf1e559a4dc48390544264097cf65734f03b376128284689
---

# Concept: Review

**purpose**
To capture textual reviews and individual ratings submitted by users for specific stores. This concept is solely responsible for the *individual* review data.

**state**
Each `Review` record:

* `reviewId`: String (unique document identifier)
* `storeId`: String (references a `Store`)
* `userId`: String (references a `User`) // Now explicitly references the new User concept
* `text`: String (the content of the review)
* `rating`: Number (a specific numeric rating for this review, e.g., 1-5)

**actions**

* `createReview(userId: String, storeId: String, text: String, rating: Number): reviewId`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.
* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record.
* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.
* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.

***
