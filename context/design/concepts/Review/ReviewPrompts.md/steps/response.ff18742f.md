---
timestamp: 'Tue Oct 21 2025 06:43:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_064317.1f01d2dd.md]]'
content_id: ff18742f9513a3ff8a1ffbdb8a9ba3a5fda1ea7c26238b08a42f1f96673c734a
---

# response:

Okay, let's proceed with the `Review` concept, implementing the `createReview` action first.

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
}
```
