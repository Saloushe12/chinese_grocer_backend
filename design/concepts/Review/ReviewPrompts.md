[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@chinese-grocer-specification](../../concepts/chinesegrocer/specification.md)

# prompt: Use the four links above to incrementally generate the implementation for the Tagging concept as specified in the given @chinese-grocer-specification link. Generate one action at a time, starting with the first action. Do not use functions that Deno does not support, like BeforeEach or AfterAll. 
# response:

First, let's establish the file structure and the initial `TaggingConcept.ts` class, including the generic types and collection initialization.

```typescript
// @utils/types.ts (provided)
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;

// @utils/database.ts (provided)
import { ID } from "@utils/types.ts";
import { ObjectId } from "npm:mongodb";

export function freshID(): ID {
  return new ObjectId().toHexString() as ID;
}
```

```typescript
// file: src/Tagging/TaggingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Tagging" + ".";

// Generic types of this concept
type Store = ID;

/**
 * Each Tagging record associates tags with a store:
 * storeId: String (references a Store)
 * tags: Set<String> (a collection of user-defined tags)
 */
interface TaggingDoc {
  _id: Store; // The storeId is the document's _id
  tags: string[]; // Store tags as an array to represent a set
}

export default class TaggingConcept {
  // Purpose: To allow arbitrary classification of stores using descriptive tags.
  private taggingCollection: Collection<TaggingDoc>;

  constructor(private readonly db: Db) {
    this.taggingCollection = this.db.collection(PREFIX + "stores");
  }

  /**
   * addTag(storeId: String, tag: String)
   *
   * requires:
   *   The `storeId` must exist. The `tag` should ideally be validated for format/content
   *   by a higher-level mechanism or a dedicated `Tag` concept if complexity arises.
   *   For now, it's a string.
   * effects:
   *   Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists,
   *   the set remains unchanged.
   */
  async addTag({ storeId, tag }: { storeId: Store; tag: string }): Promise<Empty | { error: string }> {
    // Check if the storeId exists. The concept spec implies it should exist.
    // In practice, this concept is independent and doesn't directly know about the Store concept.
    // It assumes `storeId` is a valid identifier. We'll ensure the document exists for tagging.
    try {
      // Find and update, or insert if not found. $addToSet ensures uniqueness of tags.
      const result = await this.taggingCollection.updateOne(
        { _id: storeId },
        { $addToSet: { tags: tag } },
        { upsert: true } // If document for storeId doesn't exist, create it.
      );

      // We need to confirm if the document for `storeId` actually existed before this operation
      // or if it was created by upsert. The `requires` implies storeId *must* exist.
      // If `upsert` created it, it means `storeId` might not have existed in *this* concept's view.
      // For true independence and strict adherence to "storeId must exist", we'd do:
      // 1. Check if storeId exists in *this* concept's collection. If not, it's an error.
      // 2. If it exists, then proceed with $addToSet.
      // However, the common pattern for "sets on an entity" is to upsert the entity record here
      // if it doesn't already exist in the concept's *own* state.
      // Let's refine based on typical usage: if it's the first tag for a store, it effectively "creates" the store's tagging record.

      // Option A: Strictly adhere to 'storeId must exist' by querying first.
      // This would require knowledge of the Store concept's existence, breaking independence.
      // Or, it means `storeId` must have been mentioned *previously* in this Tagging concept.
      // Given the independence principle, it likely means we establish a tagging record for any given `storeId`.
      // Let's go with the simpler, common implementation: an upsert, and if a *separate* Store concept
      // needs to ensure existence, it's via syncs.
      // The `requires` clause is probably for the orchestrator (sync) that calls this.

      // If a match was found (or upserted), it's considered successful.
      if (result.matchedCount === 1 || result.upsertedCount === 1) {
        return {};
      } else {
        // This case should be rare, indicates a potential issue with the update.
        return { error: `Failed to add tag '${tag}' to store '${storeId}'.` };
      }
    } catch (e) {
      console.error(`Error adding tag: ${e.message}`);
      return { error: `Internal server error: ${e.message}` };
    }
  }

  /**
   * removeTag(storeId: String, tag: String)
   *
   * requires:
   *   The `storeId` must exist. The `tag` must be present in the store's tag set.
   * effects:
   *   Removes the specified `tag` from the `storeId`'s set of tags.
   */
  async removeTag({ storeId, tag }: { storeId: Store; tag: string }): Promise<Empty | { error: string }> {
    try {
      // First, check if the storeId exists in this concept's collection.
      const existingDoc = await this.taggingCollection.findOne({ _id: storeId });
      if (!existingDoc) {
        return { error: `Store with ID '${storeId}' does not exist in tagging records.` };
      }

      // Check if the tag is actually present, as per the 'requires' clause.
      if (!existingDoc.tags.includes(tag)) {
        return { error: `Tag '${tag}' is not associated with store '${storeId}'.` };
      }

      const result = await this.taggingCollection.updateOne(
        { _id: storeId },
        { $pull: { tags: tag } } // $pull removes all occurrences of the value from the array
      );

      if (result.matchedCount === 1) {
        return {};
      } else {
        // This implies the storeId existed but the update didn't happen for some reason.
        return { error: `Failed to remove tag '${tag}' from store '${storeId}'.` };
      }
    } catch (e) {
      console.error(`Error removing tag: ${e.message}`);
      return { error: `Internal server error: ${e.message}` };
    }
  }
}
```

# prompt: Edit: Use the four links above to incrementally generate the implementation for the Review concept as specified in the given @chinese-grocer-specification link. Generate one action at a time, starting with the first action. Do not use functions that Deno does not support, like BeforeEach or AfterAll. 
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

# Complete the implementation for the Review concept, the rest of the actions
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

# prompt: Guidelines for writing tests: Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Also address the following concerns. Operational principle: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Interesting scenarios: Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors. Number required: For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios. No state setup: Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state. Use Deno, create test cases for the generated actions. Use the information from the link above, which was given as part of the assignment and should not be changed. This document contains methods to initialize and generate test databases for my MongoDB cluster. Use the info from the link above to regenerate test cases for the review actions. Do not use functions that Deno does not support, like BeforeEach and AfterAll.


# response:

```typescript
// file: src/Tagging/TaggingConcept.test.ts
import { assertEquals, assert, assertInstanceOf } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Collection, Db, MongoClient } from "npm:mongodb";
import { getDb, freshID } from "@utils/database.ts"; // Assuming @utils/database.ts contains getDb and freshID
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts contains ID and Empty
import TaggingConcept from "./TaggingConcept.ts";

// Helper function to create a unique test database name
function getUniqueDbName(): string {
  return `test-db-tagging-${freshID()}`;
}

Deno.test("TaggingConcept: Operational Principle - Successfully add a tag to a store", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const taggingConcept = new TaggingConcept(db);

  const storeId: ID = freshID();
  const tag1 = "Chinese";

  console.log(`\n--- Test: ${t.name} ---`);
  console.log(`Input: storeId='${storeId}', tag='${tag1}'`);

  const result = await taggingConcept.addTag({ storeId, tag: tag1 });

  console.log(`Output: ${JSON.stringify(result)}`);

  assertEquals(result, {}, "Expected success (empty object) when adding a tag.");

  // Verify the state directly
  const doc = await db.collection("Tagging.stores").findOne({ _id: storeId });
  console.log(`Verified DB state for storeId '${storeId}': ${JSON.stringify(doc)}`);

  assert(doc, "Document for storeId should exist after adding a tag.");
  assert(doc.tags.includes(tag1), `Tags should include '${tag1}'.`);
  assertEquals(doc.tags.length, 1, "There should be exactly one tag.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("TaggingConcept: Scenario 1 - Adding the same tag multiple times should have no additional effect", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const taggingConcept = new TaggingConcept(db);

  const storeId: ID = freshID();
  const tag1 = "FastFood";

  console.log(`\n--- Test: ${t.name} ---`);

  // First addition
  console.log(`1. Input: storeId='${storeId}', tag='${tag1}'`);
  const result1 = await taggingConcept.addTag({ storeId, tag: tag1 });
  console.log(`1. Output: ${JSON.stringify(result1)}`);
  assertEquals(result1, {}, "Expected success for first tag addition.");

  // Verify initial state
  const doc1 = await db.collection("Tagging.stores").findOne({ _id: storeId });
  assert(doc1, "Document should exist after first tag addition.");
  assertEquals(doc1.tags, [tag1], `Expected tags: ['${tag1}']`);

  // Second addition of the same tag
  console.log(`2. Input: storeId='${storeId}', tag='${tag1}' (again)`);
  const result2 = await taggingConcept.addTag({ storeId, tag: tag1 });
  console.log(`2. Output: ${JSON.stringify(result2)}`);
  assertEquals(result2, {}, "Expected success for second (redundant) tag addition.");

  // Verify final state - should still only have one instance of the tag
  const doc2 = await db.collection("Tagging.stores").findOne({ _id: storeId });
  console.log(`Verified DB state for storeId '${storeId}': ${JSON.stringify(doc2)}`);

  assert(doc2, "Document for storeId should still exist.");
  assertEquals(doc2.tags, [tag1], `Expected tags to remain: ['${tag1}']`);
  assertEquals(doc2.tags.length, 1, "There should still be exactly one instance of the tag.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("TaggingConcept: Scenario 2 - Adding multiple distinct tags to the same store", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const taggingConcept = new TaggingConcept(db);

  const storeId: ID = freshID();
  const tag1 = "Italian";
  const tag2 = "Pizza";
  const tag3 = "Dinner";

  console.log(`\n--- Test: ${t.name} ---`);

  // Add first tag
  console.log(`1. Input: storeId='${storeId}', tag='${tag1}'`);
  const result1 = await taggingConcept.addTag({ storeId, tag: tag1 });
  console.log(`1. Output: ${JSON.stringify(result1)}`);
  assertEquals(result1, {}, "Expected success for first tag addition.");

  // Add second tag
  console.log(`2. Input: storeId='${storeId}', tag='${tag2}'`);
  const result2 = await taggingConcept.addTag({ storeId, tag: tag2 });
  console.log(`2. Output: ${JSON.stringify(result2)}`);
  assertEquals(result2, {}, "Expected success for second tag addition.");

  // Add third tag
  console.log(`3. Input: storeId='${storeId}', tag='${tag3}'`);
  const result3 = await taggingConcept.addTag({ storeId, tag: tag3 });
  console.log(`3. Output: ${JSON.stringify(result3)}`);
  assertEquals(result3, {}, "Expected success for third tag addition.");

  // Verify final state
  const doc = await db.collection("Tagging.stores").findOne({ _id: storeId });
  console.log(`Verified DB state for storeId '${storeId}': ${JSON.stringify(doc)}`);

  assert(doc, "Document for storeId should exist.");
  assert(doc.tags.includes(tag1), `Tags should include '${tag1}'.`);
  assert(doc.tags.includes(tag2), `Tags should include '${tag2}'.`);
  assert(doc.tags.includes(tag3), `Tags should include '${tag3}'.`);
  assertEquals(doc.tags.length, 3, "There should be exactly three tags.");
  // Ensure order might not be preserved by $addToSet in all MongoDB versions/scenarios, so check for inclusion
  assert(new Set(doc.tags).has(tag1) && new Set(doc.tags).has(tag2) && new Set
  

# prompt: Guidelines for writing tests: Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Also address the following concerns. Operational principle: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Interesting scenarios: Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors. Number required: For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios. No state setup: Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state. Use Deno, create test cases for the generated actions. Use the information from the link above, which was given as part of the assignment and should not be changed. This document contains methods to initialize and generate test databases for my MongoDB cluster. Use the info from the link above to regenerate test cases for the review actions. Do not use functions that Deno does not support, like BeforeEach and AfterAll.
# response:

```typescript
// file: src/Review/ReviewConcept.test.ts
import { assertEquals, assert, assertInstanceOf } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Collection, Db, MongoClient } from "npm:mongodb";
import { getDb, freshID } from "@utils/database.ts"; // Assuming @utils/database.ts contains getDb and freshID
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts contains ID and Empty
import ReviewConcept from "./ReviewConcept.ts";

// Helper function to create a unique test database name
function getUniqueDbName(): string {
  return `test-db-review-${freshID()}`;
}

Deno.test("ReviewConcept: Operational Principle - Create a review and retrieve it for the store", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const userId: ID = freshID();
  const storeId: ID = freshID();
  const text = "Great food and service!";
  const rating = 5;

  console.log(`\n--- Test: ${t.name} ---`);

  // 1. createReview
  console.log(
    `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
  );
  const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
  console.log(`1. Output: ${JSON.stringify(createResult)}`);

  assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
  const reviewId = createResult.reviewId;
  assert(reviewId, "reviewId should not be null or undefined.");

  // 2. getReviewsForStore
  console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
  const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
  console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

  assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
  assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

  // Direct DB verification (optional, but good for understanding)
  const doc = await db.collection("Review.reviews").findOne({ _id: reviewId });
  console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
  assert(doc, "Review document should exist in DB.");
  assertEquals(doc.userId, userId, "Review's userId should match.");
  assertEquals(doc.storeId, storeId, "Review's storeId should match.");
  assertEquals(doc.text, text, "Review's text should match.");
  assertEquals(doc.rating, rating, "Review's rating should match.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("ReviewConcept: Scenario 1 - createReview with an invalid rating", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const userId: ID = freshID();
  const storeId: ID = freshID();
  const text = "Bad rating value test";
  const invalidRating = 0; // Rating must be between 1 and 5

  console.log(`\n--- Test: ${t.name} ---`);

  console.log(
    `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
  );
  const result = await reviewConcept.createReview({ userId, storeId, text, rating: invalidRating });
  console.log(`Output: ${JSON.stringify(result)}`);

  assert("error" in result, "Expected createReview to return an error for invalid rating.");
  assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

  // Verify no review was created
  const reviewsCount = await db.collection("Review.reviews").countDocuments({ userId, storeId });
  assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("ReviewConcept: Scenario 2 - Delete an existing review and verify its absence", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const userId: ID = freshID();
  const storeId: ID = freshID();
  const text = "Review to be deleted";
  const rating = 4;

  console.log(`\n--- Test: ${t.name} ---`);

  // 1. Create a review first
  console.log(
    `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
  );
  const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
  console.log(`1. Output: ${JSON.stringify(createResult)}`);
  assert("reviewId" in createResult, "Expected reviewId from creation.");
  const reviewId = createResult.reviewId;

  // Verify initial state
  const initialDoc = await db.collection("Review.reviews").findOne({ _id: reviewId });
  assert(initialDoc, "Review document should exist before deletion.");

  // 2. deleteReview
  console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
  const deleteResult = await reviewConcept.deleteReview({ reviewId });
  console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
  assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

  // 3. Verify deletion using getReviewsForStore
  console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
  const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
  console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
  assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
  assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

  // Direct DB verification (optional)
  const docAfterDelete = await db.collection("Review.reviews").findOne({ _id: reviewId });
  console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
  assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("ReviewConcept: Scenario 3 - Attempt to delete a non-existent review", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const nonExistentReviewId: ID = freshID();

  console.log(`\n--- Test: ${t.name} ---`);

  console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
  const result = await reviewConcept.deleteReview({ reviewId: nonExistentReviewId });
  console.log(`Output: ${JSON.stringify(result)}`);

  assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
  assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("ReviewConcept: Scenario 4 - Multiple reviews for the same store from different users", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const storeId: ID = freshID();
  const userId1: ID = freshID();
  const userId2: ID = freshID();

  console.log(`\n--- Test: ${t.name} ---`);

  // 1. User 1 creates a review for the store
  console.log(
    `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
  );
  const createResult1 = await reviewConcept.createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
  console.log(`1. Output: ${JSON.stringify(createResult1)}`);
  assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
  const reviewId1 = createResult1.reviewId;

  // 2. User 2 creates a review for the same store
  console.log(
    `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
  );
  const createResult2 = await reviewConcept.createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
  console.log(`2. Output: ${JSON.stringify(createResult2)}`);
  assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
  const reviewId2 = createResult2.reviewId;

  // 3. getReviewsForStore
  console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
  const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
  console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

  assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
  assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
  assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

  await client.close();
  console.log("--- Test Finished ---");
});

Deno.test("ReviewConcept: Scenario 5 - Multiple reviews by the same user for different stores", async (t) => {
  const [db, client] = await getDb(getUniqueDbName());
  const reviewConcept = new ReviewConcept(db);

  const userId: ID = freshID();
  const storeId1: ID = freshID();
  const storeId2: ID = freshID();

  console.log(`\n--- Test: ${t.name} ---`);

  // 1. User creates a review for Store 1
  console.log(
    `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
  );
  const createResult1 = await reviewConcept.createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
  console.log(`1. Output: ${JSON.stringify(createResult1)}`);
  assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
  const reviewId1 = createResult1.reviewId;

  // 2. User creates a review for Store 2
  console.log(
    `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
  );
  const createResult2 = await reviewConcept.createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
  console.log(`2. Output: ${JSON.stringify(createResult2)}`);
  assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
  const reviewId2 = createResult2.reviewId;

  // 3. getReviewsByUser
  console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
  const getByUserResult = await reviewConcept.getReviewsByUser({ userId });
  console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

  assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
  assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
  assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

  await client.close();
  console.log("--- Test Finished ---");
});
```

# prompt: Edit, use the ideas and functions in database.ts and utils.ts to help you. They were given to me as part of the assignment and are meant to be used without editing. Revise the test cases with that information. Also, Deno runs all tests in parallel, so ensure that the connection is only closed at the end of a single large test block. have individual test cases use t.step within the test block. 
# response:

```typescript
// file: src/Review/ReviewConcept.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Db, MongoClient } from "npm:mongodb";
import { getDb, freshID } from "@utils/database.ts"; // Assuming @utils/database.ts contains getDb and freshID
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts contains ID and Empty
import ReviewConcept from "./ReviewConcept.ts";

// Helper function to create a unique test database name
function getUniqueDbName(): string {
  return `test-db-review-${freshID()}`;
}

Deno.test("ReviewConcept: All Scenarios", async (testContext) => {
  const dbName = getUniqueDbName();
  const [db, client] = await getDb(dbName);
  const reviewConcept = new ReviewConcept(db);

  console.log(`\n--- Starting ReviewConcept Tests for DB: ${dbName} ---`);

  testContext.step("Operational Principle - Create a review and retrieve it for the store", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Great food and service!";
    const rating = 5;

    console.log(`\n--- Test Step: Operational Principle ---`);

    // 1. createReview
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
    );
    const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
    console.log(`1. Output: ${JSON.stringify(createResult)}`);

    assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
    const reviewId = createResult.reviewId;
    assert(reviewId, "reviewId should not be null or undefined.");

    // 2. getReviewsForStore
    console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

    assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
    assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

    // Direct DB verification (optional, but good for understanding)
    const doc = await db.collection("Review.reviews").findOne({ _id: reviewId });
    console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
    assert(doc, "Review document should exist in DB.");
    assertEquals(doc.userId, userId, "Review's userId should match.");
    assertEquals(doc.storeId, storeId, "Review's storeId should match.");
    assertEquals(doc.text, text, "Review's text should match.");
    assertEquals(doc.rating, rating, "Review's rating should match.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 1 - createReview with an invalid rating", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Bad rating value test";
    const invalidRating = 0; // Rating must be between 1 and 5

    console.log(`\n--- Test Step: Scenario 1 ---`);

    console.log(
      `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
    );
    const result = await reviewConcept.createReview({ userId, storeId, text, rating: invalidRating });
    console.log(`Output: ${JSON.stringify(result)}`);

    assert("error" in result, "Expected createReview to return an error for invalid rating.");
    assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

    // Verify no review was created
    const reviewsCount = await db.collection("Review.reviews").countDocuments({ userId, storeId });
    assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 2 - Delete an existing review and verify its absence", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Review to be deleted";
    const rating = 4;

    console.log(`\n--- Test Step: Scenario 2 ---`);

    // 1. Create a review first
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
    );
    const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
    console.log(`1. Output: ${JSON.stringify(createResult)}`);
    assert("reviewId" in createResult, "Expected reviewId from creation.");
    const reviewId = createResult.reviewId;

    // Verify initial state
    const initialDoc = await db.collection("Review.reviews").findOne({ _id: reviewId });
    assert(initialDoc, "Review document should exist before deletion.");

    // 2. deleteReview
    console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
    const deleteResult = await reviewConcept.deleteReview({ reviewId });
    console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
    assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

    // 3. Verify deletion using getReviewsForStore
    console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
    assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
    assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

    // Direct DB verification (optional)
    const docAfterDelete = await db.collection("Review.reviews").findOne({ _id: reviewId });
    console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
    assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 3 - Attempt to delete a non-existent review", async () => {
    const nonExistentReviewId: ID = freshID();

    console.log(`\n--- Test Step: Scenario 3 ---`);

    console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
    const result = await reviewConcept.deleteReview({ reviewId: nonExistentReviewId });
    console.log(`Output: ${JSON.stringify(result)}`);

    assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
    assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 4 - Multiple reviews for the same store from different users", async () => {
    const storeId: ID = freshID();
    const userId1: ID = freshID();
    const userId2: ID = freshID();

    console.log(`\n--- Test Step: Scenario 4 ---`);

    // 1. User 1 creates a review for the store
    console.log(
      `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
    );
    const createResult1 = await reviewConcept.createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
    console.log(`1. Output: ${JSON.stringify(createResult1)}`);
    assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
    const reviewId1 = createResult1.reviewId;

    // 2. User 2 creates a review for the same store
    console.log(
      `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
    );
    const createResult2 = await reviewConcept.createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
    console.log(`2. Output: ${JSON.stringify(createResult2)}`);
    assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
    const reviewId2 = createResult2.reviewId;

    // 3. getReviewsForStore
    console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

    assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
    assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
    assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 5 - Multiple reviews by the same user for different stores", async () => {
    const userId: ID = freshID();
    const storeId1: ID = freshID();
    const storeId2: ID = freshID();

    console.log(`\n--- Test Step: Scenario 5 ---`);

    // 1. User creates a review for Store 1
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
    );
    const createResult1 = await reviewConcept.createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
    console.log(`1. Output: ${JSON.stringify(createResult1)}`);
    assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
    const reviewId1 = createResult1.reviewId;

    // 2. User creates a review for Store 2
    console.log(
      `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
    );
    const createResult2 = await reviewConcept.createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
    console.log(`2. Output: ${JSON.stringify(createResult2)}`);
    assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
    const reviewId2 = createResult2.reviewId;

    // 3. getReviewsByUser
    console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
    const getByUserResult = await reviewConcept.getReviewsByUser({ userId });
    console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

    assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
    assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
    assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

    console.log("--- Test Step Finished ---");
  });

  await client.close();
  console.log(`--- All ReviewConcept Tests Finished for DB: ${dbName} ---`);
});
```

[@database](../../../src/utils/database.ts)
[@types](../../../src/utils/types.ts)

# Here are the two files I wanted you to look at. Use the info from these to complete the instructions from my previous prompt.
# response:

```typescript
// file: src/Review/ReviewConcept.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Db, MongoClient } from "npm:mongodb";
import { testDb, freshID } from "@utils/database.ts"; // Import testDb and freshID
import { ID, Empty } from "@utils/types.ts";
import ReviewConcept from "./ReviewConcept.ts";

Deno.test("ReviewConcept: All Scenarios", async (testContext) => {
  // Use the provided testDb utility for a clean test database
  const [db, client] = await testDb();
  const reviewConcept = new ReviewConcept(db);

  // The testDb function already logs its actions and ensures a clean state
  console.log(`\n--- Starting ReviewConcept Tests for Database: ${db.databaseName} ---`);

  testContext.step("Operational Principle - Create a review and retrieve it for the store", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Great food and service!";
    const rating = 5;

    console.log(`\n--- Test Step: Operational Principle ---`);

    // 1. createReview
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
    );
    const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
    console.log(`1. Output: ${JSON.stringify(createResult)}`);

    assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
    const reviewId = createResult.reviewId;
    assert(reviewId, "reviewId should not be null or undefined.");

    // 2. getReviewsForStore
    console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

    assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
    assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

    // Direct DB verification (optional, but good for understanding)
    const doc = await db.collection("Review.reviews").findOne({ _id: reviewId });
    console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
    assert(doc, "Review document should exist in DB.");
    assertEquals(doc.userId, userId, "Review's userId should match.");
    assertEquals(doc.storeId, storeId, "Review's storeId should match.");
    assertEquals(doc.text, text, "Review's text should match.");
    assertEquals(doc.rating, rating, "Review's rating should match.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 1 - createReview with an invalid rating", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Bad rating value test";
    const invalidRating = 0; // Rating must be between 1 and 5

    console.log(`\n--- Test Step: Scenario 1 ---`);

    console.log(
      `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
    );
    const result = await reviewConcept.createReview({ userId, storeId, text, rating: invalidRating });
    console.log(`Output: ${JSON.stringify(result)}`);

    assert("error" in result, "Expected createReview to return an error for invalid rating.");
    assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

    // Verify no review was created
    const reviewsCount = await db.collection("Review.reviews").countDocuments({ userId, storeId });
    assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 2 - Delete an existing review and verify its absence", async () => {
    const userId: ID = freshID();
    const storeId: ID = freshID();
    const text = "Review to be deleted";
    const rating = 4;

    console.log(`\n--- Test Step: Scenario 2 ---`);

    // 1. Create a review first
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
    );
    const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
    console.log(`1. Output: ${JSON.stringify(createResult)}`);
    assert("reviewId" in createResult, "Expected reviewId from creation.");
    const reviewId = createResult.reviewId;

    // Verify initial state
    const initialDoc = await db.collection("Review.reviews").findOne({ _id: reviewId });
    assert(initialDoc, "Review document should exist before deletion.");

    // 2. deleteReview
    console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
    const deleteResult = await reviewConcept.deleteReview({ reviewId });
    console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
    assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

    // 3. Verify deletion using getReviewsForStore
    console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
    assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
    assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

    // Direct DB verification (optional)
    const docAfterDelete = await db.collection("Review.reviews").findOne({ _id: reviewId });
    console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
    assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 3 - Attempt to delete a non-existent review", async () => {
    const nonExistentReviewId: ID = freshID();

    console.log(`\n--- Test Step: Scenario 3 ---`);

    console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
    const result = await reviewConcept.deleteReview({ reviewId: nonExistentReviewId });
    console.log(`Output: ${JSON.stringify(result)}`);

    assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
    assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 4 - Multiple reviews for the same store from different users", async () => {
    const storeId: ID = freshID();
    const userId1: ID = freshID();
    const userId2: ID = freshID();

    console.log(`\n--- Test Step: Scenario 4 ---`);

    // 1. User 1 creates a review for the store
    console.log(
      `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
    );
    const createResult1 = await reviewConcept.createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
    console.log(`1. Output: ${JSON.stringify(createResult1)}`);
    assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
    const reviewId1 = createResult1.reviewId;

    // 2. User 2 creates a review for the same store
    console.log(
      `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
    );
    const createResult2 = await reviewConcept.createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
    console.log(`2. Output: ${JSON.stringify(createResult2)}`);
    assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
    const reviewId2 = createResult2.reviewId;

    // 3. getReviewsForStore
    console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
    const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
    console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

    assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
    assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
    assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

    console.log("--- Test Step Finished ---");
  });

  testContext.step("Scenario 5 - Multiple reviews by the same user for different stores", async () => {
    const userId: ID = freshID();
    const storeId1: ID = freshID();
    const storeId2: ID = freshID();

    console.log(`\n--- Test Step: Scenario 5 ---`);

    // 1. User creates a review for Store 1
    console.log(
      `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
    );
    const createResult1 = await reviewConcept.createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
    console.log(`1. Output: ${JSON.stringify(createResult1)}`);
    assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
    const reviewId1 = createResult1.reviewId;

    // 2. User creates a review for Store 2
    console.log(
      `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
    );
    const createResult2 = await reviewConcept.createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
    console.log(`2. Output: ${JSON.stringify(createResult2)}`);
    assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
    const reviewId2 = createResult2.reviewId;

    // 3. getReviewsByUser
    console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
    const getByUserResult = await reviewConcept.getReviewsByUser({ userId });
    console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

    assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
    assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
    assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

    console.log("--- Test Step Finished ---");
  });

  // Ensure the client connection is closed only once after all steps are complete
  await client.close();
  console.log(`--- All ReviewConcept Tests Finished for Database: ${db.databaseName} ---`);
});
```

[@review-concept-test](../../../src/concepts/Review/ReviewConcept.test.ts)

# The file above contains my current test code. I am encountering the errors: "Started test step while another test step with sanitizers was running" and "error: AssertionError: Expected createReview to return a reviewId." Fix the errors, revise the code, and explain your reasoning for the fixes



# response:

The errors you're encountering, "Started test step while another test step with sanitizers was running" and "AssertionError: Expected createReview to return a reviewId," indicate issues with how your Deno tests are structured and executed, particularly regarding asynchronous operations and test isolation.

## Reasoning for the Fixes:

1.  **"Started test step while another test step with sanitizers was running"**:
    *   **Problem:** Deno runs top-level `Deno.test` blocks in parallel by default. When you use `testContext.step` within an `async Deno.test` block, if you don't `await` each `testContext.step` call, the parent `Deno.test` function might finish (or its execution flow might continue) before all its child `testContext.step` functions have completed. This can lead to race conditions, resource contention, and, specifically, Deno's runtime sanitizers (which detect things like unclosed resources or uncaught ops) reporting conflicts when they detect a new step starting while a previous one is still "active" in some underlying way.
    *   **Fix:** The solution is to explicitly `await` each `testContext.step` call. This forces the test steps to execute sequentially within that `Deno.test` block, preventing overlaps that trigger the sanitizer warning and other potential issues like premature database client closure.

2.  **"error: AssertionError: Expected createReview to return a reviewId."**:
    *   **Problem:** This assertion fails when `reviewConcept.createReview` returns an object with an `error` property (e.g., `{ error: "Internal server error: ..." }`) instead of `{ reviewId: "..." }`. This means that an exception is being caught within the `createReview` method of your `ReviewConcept.ts`. The most likely reason for `this.reviewsCollection.insertOne(newReview)` to throw an error in your setup is that the MongoDB client connection was implicitly closed or became invalid *before* the `insertOne` operation could complete.
    *   **Connection to Problem 1:** When `testContext.step` calls are not awaited, the main `Deno.test` block might reach `await client.close();` *before* some of the asynchronous `testContext.step` operations have finished executing their database calls. If the client is closed while a `createReview` (or any other database action) is still attempting to run, it will predictably throw an error, leading to the `error` return and thus the `AssertionError` in your test.
    *   **Fix:** Awaiting each `testContext.step` ensures that all database operations within that step complete *before* the next step starts and, crucially, before `client.close()` is called at the very end of the *main* `Deno.test` block. This guarantees that the MongoDB client remains open and active for all operations.
    *   **Additional Robustness:** Using a `try...finally` block for `client.close()` in the main test ensures that the client is *always* closed, even if one of the `testContext.step` tests fails for another reason.
    *   **Import Alias:** Changed `@test` back to the direct Deno standard library import path (`https://deno.land/std@0.210.0/assert/mod.ts`) to avoid potential configuration issues with module resolution for aliases, ensuring reliability.

With these changes, the tests will run sequentially within the main test block, ensuring proper database client lifecycle and preventing race conditions.

## Revised Code: `src/concepts/Review/ReviewConcept.test.ts`

```typescript
// file: src/concepts/Review/ReviewConcept.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.210.0/assert/mod.ts"; // Changed @test to direct import
import { Db, MongoClient } from "npm:mongodb";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ReviewConcept from "./ReviewConcept.ts";

Deno.test("ReviewConcept: All Scenarios", async (testContext) => {
  let db: Db;
  let client: MongoClient;
  let reviewConcept: ReviewConcept;

  try {
    // Use the provided testDb utility for a clean test database
    [db, client] = await testDb();
    reviewConcept = new ReviewConcept(db);

    console.log(`\n--- Starting ReviewConcept Tests for Database: ${db.databaseName} ---`);

    await testContext.step("Operational Principle - Create a review and retrieve it for the store", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Great food and service!";
      const rating = 5;

      console.log(`\n--- Test Step: Operational Principle ---`);

      // 1. createReview
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);

      assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
      const reviewId = createResult.reviewId;
      assert(reviewId, "reviewId should not be null or undefined.");

      // 2. getReviewsForStore
      console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
      console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

      assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
      assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

      // Direct DB verification (optional, but good for understanding)
      const doc = await db.collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
      assert(doc, "Review document should exist in DB.");
      assertEquals(doc.userId, userId, "Review's userId should match.");
      assertEquals(doc.storeId, storeId, "Review's storeId should match.");
      assertEquals(doc.text, text, "Review's text should match.");
      assertEquals(doc.rating, rating, "Review's rating should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 1 - createReview with an invalid rating", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Bad rating value test";
      const invalidRating = 0; // Rating must be between 1 and 5

      console.log(`\n--- Test Step: Scenario 1 ---`);

      console.log(
        `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
      );
      const result = await reviewConcept.createReview({ userId, storeId, text, rating: invalidRating });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected createReview to return an error for invalid rating.");
      assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

      // Verify no review was created
      const reviewsCount = await db.collection("Review.reviews").countDocuments({ userId, storeId });
      assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 2 - Delete an existing review and verify its absence", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Review to be deleted";
      const rating = 4;

      console.log(`\n--- Test Step: Scenario 2 ---`);

      // 1. Create a review first
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await reviewConcept.createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);
      assert("reviewId" in createResult, "Expected reviewId from creation.");
      const reviewId = createResult.reviewId;

      // Verify initial state
      const initialDoc = await db.collection("Review.reviews").findOne({ _id: reviewId });
      assert(initialDoc, "Review document should exist before deletion.");

      // 2. deleteReview
      console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
      const deleteResult = await reviewConcept.deleteReview({ reviewId });
      console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
      assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

      // 3. Verify deletion using getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
      assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
      assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

      // Direct DB verification (optional)
      const docAfterDelete = await db.collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
      assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 3 - Attempt to delete a non-existent review", async () => {
      const nonExistentReviewId: ID = freshID();

      console.log(`\n--- Test Step: Scenario 3 ---`);

      console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
      const result = await reviewConcept.deleteReview({ reviewId: nonExistentReviewId });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
      assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 4 - Multiple reviews for the same store from different users", async () => {
      const storeId: ID = freshID();
      const userId1: ID = freshID();
      const userId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 4 ---`);

      // 1. User 1 creates a review for the store
      console.log(
        `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
      );
      const createResult1 = await reviewConcept.createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User 2 creates a review for the same store
      console.log(
        `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
      );
      const createResult2 = await reviewConcept.createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await reviewConcept.getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

      assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
      assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 5 - Multiple reviews by the same user for different stores", async () => {
      const userId: ID = freshID();
      const storeId1: ID = freshID();
      const storeId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 5 ---`);

      // 1. User creates a review for Store 1
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
      );
      const createResult1 = await reviewConcept.createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User creates a review for Store 2
      console.log(
        `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
      );
      const createResult2 = await reviewConcept.createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsByUser
      console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
      const getByUserResult = await reviewConcept.getReviewsByUser({ userId });
      console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

      assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
      assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    console.log(`--- All ReviewConcept Tests Finished for Database: ${db.databaseName} ---`);
  } finally {
    // Ensure the client connection is closed only once after all steps are complete,
    // even if an error occurs in a step or setup.
    if (client) {
      await client.close();
    }
  }
});
```

# The code you just gave me has the error: Variable 'client' is used before being assigned.
# response:

You're encountering the "Variable 'client' is used before being assigned" error because if the `await testDb()` call fails (e.g., due to a MongoDB connection issue or an error within `testDb` itself), the `client` variable would never be assigned a value. However, the `finally` block would still execute and try to access `client` in `if (client)`, leading to the error.

### Reasoning for the Fixes:

1.  **Initialize Variables to `null`:** By initializing `db`, `client`, and `reviewConcept` to `null` when they are declared, you ensure they always have a defined value, even if the assignment within the `try` block fails. This makes the `if (client)` check in the `finally` block safe.
2.  **Error Handling in `try...catch`:** Added a `catch` block to the main `Deno.test`'s `try...finally` structure. This will log any errors that occur during the setup (`testDb()`) or execution of any test step, making debugging easier. If the setup itself fails, `throw e;` is used to ensure the entire Deno test fails as expected.

These changes make the test robust against failures during the setup phase while adhering to the structure of closing the client connection only once at the very end.

### Revised Code: `src/concepts/Review/ReviewConcept.test.ts`

```typescript
// file: src/concepts/Review/ReviewConcept.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.210.0/assert/mod.ts"; // Direct import
import { Db, MongoClient } from "npm:mongodb";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ReviewConcept from "./ReviewConcept.ts";

Deno.test("ReviewConcept: All Scenarios", async (testContext) => {
  let db: Db | null = null; // Initialize to null
  let client: MongoClient | null = null; // Initialize to null
  let reviewConcept: ReviewConcept | null = null; // Initialize to null

  try {
    // Use the provided testDb utility for a clean test database
    [db, client] = await testDb();
    reviewConcept = new ReviewConcept(db);

    console.log(`\n--- Starting ReviewConcept Tests for Database: ${db.databaseName} ---`);

    await testContext.step("Operational Principle - Create a review and retrieve it for the store", async () => {
      // It's safe to use db and reviewConcept here because if we reached this point,
      // they must have been successfully assigned in the parent try block.
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Great food and service!";
      const rating = 5;

      console.log(`\n--- Test Step: Operational Principle ---`);

      // 1. createReview
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);

      assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
      const reviewId = createResult.reviewId;
      assert(reviewId, "reviewId should not be null or undefined.");

      // 2. getReviewsForStore
      console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

      assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
      assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

      // Direct DB verification (optional, but good for understanding)
      const doc = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
      assert(doc, "Review document should exist in DB.");
      assertEquals(doc.userId, userId, "Review's userId should match.");
      assertEquals(doc.storeId, storeId, "Review's storeId should match.");
      assertEquals(doc.text, text, "Review's text should match.");
      assertEquals(doc.rating, rating, "Review's rating should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 1 - createReview with an invalid rating", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Bad rating value test";
      const invalidRating = 0; // Rating must be between 1 and 5

      console.log(`\n--- Test Step: Scenario 1 ---`);

      console.log(
        `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
      );
      const result = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating: invalidRating });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected createReview to return an error for invalid rating.");
      assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

      // Verify no review was created
      const reviewsCount = await (db as Db).collection("Review.reviews").countDocuments({ userId, storeId });
      assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 2 - Delete an existing review and verify its absence", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Review to be deleted";
      const rating = 4;

      console.log(`\n--- Test Step: Scenario 2 ---`);

      // 1. Create a review first
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);
      assert("reviewId" in createResult, "Expected reviewId from creation.");
      const reviewId = createResult.reviewId;

      // Verify initial state
      const initialDoc = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      assert(initialDoc, "Review document should exist before deletion.");

      // 2. deleteReview
      console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
      const deleteResult = await (reviewConcept as ReviewConcept).deleteReview({ reviewId });
      console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
      assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

      // 3. Verify deletion using getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
      assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
      assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

      // Direct DB verification (optional)
      const docAfterDelete = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
      assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 3 - Attempt to delete a non-existent review", async () => {
      const nonExistentReviewId: ID = freshID();

      console.log(`\n--- Test Step: Scenario 3 ---`);

      console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
      const result = await (reviewConcept as ReviewConcept).deleteReview({ reviewId: nonExistentReviewId });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
      assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 4 - Multiple reviews for the same store from different users", async () => {
      const storeId: ID = freshID();
      const userId1: ID = freshID();
      const userId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 4 ---`);

      // 1. User 1 creates a review for the store
      console.log(
        `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
      );
      const createResult1 = await (reviewConcept as ReviewConcept).createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User 2 creates a review for the same store
      console.log(
        `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
      );
      const createResult2 = await (reviewConcept as ReviewConcept).createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

      assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
      assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 5 - Multiple reviews by the same user for different stores", async () => {
      const userId: ID = freshID();
      const storeId1: ID = freshID();
      const storeId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 5 ---`);

      // 1. User creates a review for Store 1
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
      );
      const createResult1 = await (reviewConcept as ReviewConcept).createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User creates a review for Store 2
      console.log(
        `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
      );
      const createResult2 = await (reviewConcept as ReviewConcept).createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsByUser
      console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
      const getByUserResult = await (reviewConcept as ReviewConcept).getReviewsByUser({ userId });
      console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

      assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
      assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    console.log(`--- All ReviewConcept Tests Finished for Database: ${(db as Db).databaseName} ---`);
  } catch (e) {
    console.error(`Error during test setup or execution: ${e.message}`);
    // Re-throw the error to ensure the test fails if setup itself fails
    throw e;
  } finally {
    // Ensure the client connection is closed only once after all steps are complete,
    // even if an error occurs in a step or setup.
    if (client) {
      await client.close();
    }
  }
});
```