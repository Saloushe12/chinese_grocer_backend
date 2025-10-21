---
timestamp: 'Tue Oct 21 2025 06:45:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_064553.15124a1b.md]]'
content_id: 9f7d35e65d4796f5258037a32c2ea76246f26c7d5cf5907dd7719d879c42cd1e
---

# response:

Okay, let's complete the implementation for the `Review` concept by adding the `deleteReview`, `getReviewsForStore`, and `getReviewsByUser` actions.

```typescript
// file: src/Review/ReviewConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Review" + ".";

// Generic types of this concept referencing external concepts
type User = ID;
type Store = ID;

/**
 * Each Review record:
 * reviewId: String (unique document identifier)
 * storeId: String (references a Store)
 * userId: String (references a User)
 * text: String (the content of the review)
 * rating: Number (a specific numeric rating for this review, e.g., 1-5)
 */
interface ReviewDoc {
  _id: ID; // The reviewId is the document's _id
  storeId: Store;
  userId: User;
  text: string;
  rating: number;
}

export default class ReviewConcept {
  // Purpose: To capture textual reviews and individual ratings submitted by users for specific stores.
  // This concept is solely responsible for the *individual* review data.
  private reviewsCollection: Collection<ReviewDoc>;

  constructor(private readonly db: Db) {
    this.reviewsCollection = this.db.collection(PREFIX + "reviews");
  }

  /**
   * createReview(userId: String, storeId: String, text: String, rating: Number): { reviewId: String } | { error: String }
   *
   * requires:
   *   The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
   * effects:
   *   Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.
   * returns:
   *   { reviewId } on success
   *   { error } if requirements are not met
   */
  async createReview(
    { userId, storeId, text, rating }: { userId: User; storeId: Store; text: string; rating: number },
  ): Promise<{ reviewId: ID } | { error: string }> {
    try {
      // Validate rating range (e.g., 1-5 as mentioned in the spec)
      if (rating < 1 || rating > 5) {
        return { error: "Rating must be between 1 and 5." };
      }

      // Generate a new unique ID for the review
      const reviewId = freshID();

      const newReview: ReviewDoc = {
        _id: reviewId,
        userId,
        storeId,
        text,
        rating,
      };

      await this.reviewsCollection.insertOne(newReview);

      return { reviewId };
    } catch (e) {
      console.error(`Error creating review: ${e.message}`);
      return { error: `Internal server error: ${e.message}` };
    }
  }

  /**
   * deleteReview(reviewId: String): {} | { error: String }
   *
   * requires:
   *   The `reviewId` must exist.
   * effects:
   *   Deletes the specified `Review` record.
   * returns:
   *   {} on success
   *   { error } if the review does not exist
   */
  async deleteReview({ reviewId }: { reviewId: ID }): Promise<Empty | { error: string }> {
    try {
      const result = await this.reviewsCollection.deleteOne({ _id: reviewId });

      if (result.deletedCount === 1) {
        return {};
      } else {
        // If deletedCount is 0, the reviewId did not exist.
        return { error: `Review with ID '${reviewId}' not found.` };
      }
    } catch (e) {
      console.error(`Error deleting review: ${e.message}`);
      return { error: `Internal server error: ${e.message}` };
    }
  }

  /**
   * getReviewsForStore(storeId: String): { reviewIds: Set<String> }
   *
   * effects:
   *   Returns a set of all `reviewId`s associated with the specified `storeId`.
   * returns:
   *   { reviewIds: Set<String> } on success
   */
  async getReviewsForStore({ storeId }: { storeId: Store }): Promise<{ reviewIds: Set<ID> }> {
    try {
      const reviews = await this.reviewsCollection.find(
        { storeId: storeId },
        { projection: { _id: 1 } }, // Only retrieve the _id (reviewId)
      ).toArray();

      const reviewIds = new Set<ID>(reviews.map((r) => r._id));
      return { reviewIds };
    } catch (e) {
      console.error(`Error getting reviews for store '${storeId}': ${e.message}`);
      // In queries, if an error occurs, it's often better to return an empty set
      // or rethrow/return a specific error based on desired application behavior.
      // For this spec, returning an empty set on error is reasonable.
      return { reviewIds: new Set<ID>() };
    }
  }

  /**
   * getReviewsByUser(userId: String): { reviewIds: Set<String> }
   *
   * effects:
   *   Returns a set of all `reviewId`s created by the specified `userId`.
   * returns:
   *   { reviewIds: Set<String> } on success
   */
  async getReviewsByUser({ userId }: { userId: User }): Promise<{ reviewIds: Set<ID> }> {
    try {
      const reviews = await this.reviewsCollection.find(
        { userId: userId },
        { projection: { _id: 1 } }, // Only retrieve the _id (reviewId)
      ).toArray();

      const reviewIds = new Set<ID>(reviews.map((r) => r._id));
      return { reviewIds };
    } catch (e) {
      console.error(`Error getting reviews by user '${userId}': ${e.message}`);
      return { reviewIds: new Set<ID>() };
    }
  }
}
```
