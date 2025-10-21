---
timestamp: 'Tue Oct 21 2025 07:28:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_072817.6b1f3e85.md]]'
content_id: bda7078517f34300312fa12f75dc3e93e3f8cf35f048a9ef5f0363010d896639
---

# response:

The errors you're encountering, "Started test step while another test step with sanitizers was running" and "AssertionError: Expected createReview to return a reviewId," indicate issues with how your Deno tests are structured and executed, particularly regarding asynchronous operations and test isolation.

## Reasoning for the Fixes:

1. **"Started test step while another test step with sanitizers was running"**:
   * **Problem:** Deno runs top-level `Deno.test` blocks in parallel by default. When you use `testContext.step` within an `async Deno.test` block, if you don't `await` each `testContext.step` call, the parent `Deno.test` function might finish (or its execution flow might continue) before all its child `testContext.step` functions have completed. This can lead to race conditions, resource contention, and, specifically, Deno's runtime sanitizers (which detect things like unclosed resources or uncaught ops) reporting conflicts when they detect a new step starting while a previous one is still "active" in some underlying way.
   * **Fix:** The solution is to explicitly `await` each `testContext.step` call. This forces the test steps to execute sequentially within that `Deno.test` block, preventing overlaps that trigger the sanitizer warning and other potential issues like premature database client closure.

2. **"error: AssertionError: Expected createReview to return a reviewId."**:
   * **Problem:** This assertion fails when `reviewConcept.createReview` returns an object with an `error` property (e.g., `{ error: "Internal server error: ..." }`) instead of `{ reviewId: "..." }`. This means that an exception is being caught within the `createReview` method of your `ReviewConcept.ts`. The most likely reason for `this.reviewsCollection.insertOne(newReview)` to throw an error in your setup is that the MongoDB client connection was implicitly closed or became invalid *before* the `insertOne` operation could complete.
   * **Connection to Problem 1:** When `testContext.step` calls are not awaited, the main `Deno.test` block might reach `await client.close();` *before* some of the asynchronous `testContext.step` operations have finished executing their database calls. If the client is closed while a `createReview` (or any other database action) is still attempting to run, it will predictably throw an error, leading to the `error` return and thus the `AssertionError` in your test.
   * **Fix:** Awaiting each `testContext.step` ensures that all database operations within that step complete *before* the next step starts and, crucially, before `client.close()` is called at the very end of the *main* `Deno.test` block. This guarantees that the MongoDB client remains open and active for all operations.
   * **Additional Robustness:** Using a `try...finally` block for `client.close()` in the main test ensures that the client is *always* closed, even if one of the `testContext.step` tests fails for another reason.
   * **Import Alias:** Changed `@test` back to the direct Deno standard library import path (`https://deno.land/std@0.210.0/assert/mod.ts`) to avoid potential configuration issues with module resolution for aliases, ensuring reliability.

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
