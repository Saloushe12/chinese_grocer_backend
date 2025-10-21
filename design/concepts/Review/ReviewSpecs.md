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

* `createReview(userId: String, storeId: String, text: String, rating: Number): reviewId | { error }`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` must be between 1 and 5.
  * **Effect:** If requirements are met, creates a new Review record and returns its `reviewId`. Otherwise returns an error. This action *does not* update aggregate ratings; that is handled by a `sync`.

* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the Review record or returns an error if it does not exist.

* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.

* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.

***