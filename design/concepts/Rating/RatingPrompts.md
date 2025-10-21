[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@chinese-grocer-specification](../../concepts/chinesegrocer/specification.md)

# prompt: Use the four links above to  generate the implementation for the Rating concept as specified in the given @chinese-grocer-specification link. Do not use functions that Deno does not support, like BeforeEach or AfterAll. 
# response:

To implement the `Rating` concept, we'll create a TypeScript class `RatingConcept` that interacts with a MongoDB collection. This implementation will adhere to the principles of concept design, including independence, clear state management, and pre/post-condition specification for actions.

```typescript
// file: src/Rating/RatingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// Note: freshID from @utils/database.ts is not directly used in this concept
// because _id is derived from storeId, which is an external ID.

// Declare a prefix for MongoDB collection names to ensure uniqueness and concept ownership.
const PREFIX = "Rating" + ".";

/**
 * Interface representing the structure of a Rating record in the database.
 * Each record aggregates rating information for a specific store.
 *
 * @property _id The unique identifier for the store, serving as the document's primary key.
 * @property aggregatedRating The calculated average or composite rating for the store.
 * @property reviewCount The total number of reviews contributing to the aggregated rating.
 */
interface RatingRecord {
  _id: ID; // References a Store's ID
  aggregatedRating: number;
  reviewCount: number;
}

/**
 * @concept Rating
 * @purpose To maintain an aggregated rating score and count for a store, derived from individual reviews.
 * @principle A store's existence and location are fundamental. Interactions related to its classification,
 *            user feedback, or popularity are external concerns managed by other concepts through synchronizations.
 *            This concept aggregates review data, making it readily available for queries and decisions.
 */
export default class RatingConcept {
  // MongoDB collection to store rating records.
  ratings: Collection<RatingRecord>;

  /**
   * Constructs a new RatingConcept instance.
   * @param db The MongoDB database instance to use for data persistence.
   */
  constructor(private readonly db: Db) {
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * updateRating(storeId: String, contribution: { rating: Number, weight: Number }): {} | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store.
   * @effects Updates the `aggregatedRating` and increments/decrements the `reviewCount`
   *          for the `storeId` based on the provided `contribution`.
   *          If no rating record exists for the `storeId`, it is initialized.
   *
   * @returns
   *  - `{}` on success.
   *  - `{ error: String }` if the `newReviewCount` becomes negative,
   *    indicating an attempt to remove more reviews than exist.
   */
  async updateRating(
    { storeId, contribution }: {
      storeId: ID;
      contribution: { rating: number; weight: number };
    },
  ): Promise<Empty | { error: string }> {
    // If the weight of the contribution is 0, no change is needed for sum or count.
    if (contribution.weight === 0) {
      return {};
    }

    // Find the existing rating record for the given storeId.
    // If no record is found, we assume initial state (0 reviews, 0 aggregated rating).
    const existingRating = await this.ratings.findOne({ _id: storeId });

    const currentAggregatedRating = existingRating?.aggregatedRating ?? 0;
    const currentReviewCount = existingRating?.reviewCount ?? 0;

    // Calculate the total sum of ratings currently represented in the aggregation.
    const currentTotalSum = currentAggregatedRating * currentReviewCount;

    // Calculate the new total review count and the new total sum after applying the contribution.
    const newReviewCount = currentReviewCount + contribution.weight;
    const newTotalSum = currentTotalSum +
      (contribution.rating * contribution.weight);

    // Precondition check: A review count cannot be negative.
    // This prevents inconsistent states, e.g., trying to remove more reviews than have been added.
    if (newReviewCount < 0) {
      return {
        error:
          `Cannot update rating: resulting review count for store ${storeId} would be negative (${newReviewCount}).`,
      };
    }

    // Calculate the new aggregated rating. If there are no reviews, the aggregated rating is 0.
    const newAggregatedRating = newReviewCount === 0
      ? 0
      : newTotalSum / newReviewCount;

    // Update the rating record in the database.
    // `upsert: true` ensures that if no record currently exists for `storeId`, a new one is created.
    await this.ratings.updateOne(
      { _id: storeId },
      {
        $set: {
          aggregatedRating: newAggregatedRating,
          reviewCount: newReviewCount,
        },
      },
      { upsert: true },
    );

    return {}; // Return an empty object to signify successful completion.
  }

  /**
   * getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number } | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store (in the Store concept).
   * @effects Returns the current aggregated rating and the count of reviews for the specified store.
   *
   * @returns
   *  - `{ aggregatedRating: Number, reviewCount: Number }` on success.
   *  - `{ aggregatedRating: 0, reviewCount: 0 }` if no rating record exists for the `storeId`,
   *    indicating that the store has not yet received any reviews. This is considered a valid state.
   */
  async getRating(
    { storeId }: { storeId: ID },
  ): Promise<{ aggregatedRating: number; reviewCount: number } | {
    error: string;
  }> {
    // Attempt to find the rating record for the given storeId.
    const ratingRecord = await this.ratings.findOne({ _id: storeId });

    // If no record is found, it means the store has not yet received any reviews that have
    // been processed by this concept. In this scenario, the aggregated rating is 0,
    // and the review count is 0. This is a valid, non-error state.
    if (!ratingRecord) {
      return { aggregatedRating: 0, reviewCount: 0 };
    }

    // Return the found aggregated rating and review count.
    return {
      aggregatedRating: ratingRecord.aggregatedRating,
      reviewCount: ratingRecord.reviewCount,
    };
  }
}
```
[@database](../../../src/utils/database.ts)
[@types](../../../src/utils/types.ts)

# Above are database.ts and types.ts, they may contain information useful to the implementation. Revise the implementation with the additional info from the two files if they are helpful.
# response:

The provided `Rating` concept implementation is well-structured and adheres to the principles outlined in the concept design documentation, effectively using the provided utility types and database helpers. No revisions are necessary, as the code already incorporates the relevant information from `database.ts` and `types.ts` in the correct manner.

Here is the implementation for the `Rating` concept:

```typescript
// file: src/Rating/RatingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// Note: freshID from @utils/database.ts is not directly used in this concept
// because _id is derived from storeId, which is an external ID, not generated by Rating.

// Declare a prefix for MongoDB collection names to ensure uniqueness and concept ownership.
const PREFIX = "Rating" + ".";

/**
 * Interface representing the structure of a Rating record in the database.
 * Each record aggregates rating information for a specific store.
 *
 * @property _id The unique identifier for the store, serving as the document's primary key.
 *               This corresponds to the storeId passed to actions.
 * @property aggregatedRating The calculated average or composite rating for the store.
 * @property reviewCount The total number of reviews contributing to the aggregated rating.
 */
interface RatingRecord {
  _id: ID; // References a Store's ID (e.g., from the Store concept)
  aggregatedRating: number;
  reviewCount: number;
}

/**
 * @concept Rating
 * @purpose To maintain an aggregated rating score and count for a store, derived from individual reviews.
 * @principle After a series of individual review contributions (e.g., from the Review concept),
 *            this concept correctly aggregates the rating scores and maintains an accurate count,
 *            making the store's overall standing readily available for queries and decisions.
 */
export default class RatingConcept {
  // MongoDB collection to store rating records.
  ratings: Collection<RatingRecord>;

  /**
   * Constructs a new RatingConcept instance.
   * @param db The MongoDB database instance to use for data persistence.
   */
  constructor(private readonly db: Db) {
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * updateRating(storeId: ID, contribution: { rating: Number, weight: Number }): {} | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store in the system.
   *           The `contribution.weight` should not lead to a negative `reviewCount` for the store.
   * @effects Updates the `aggregatedRating` and increments/decrements the `reviewCount`
   *          for the `storeId` based on the provided `contribution`.
   *          If no rating record exists for the `storeId`, it is initialized with the contribution.
   *
   * @returns
   *  - `{}` on success.
   *  - `{ error: String }` if the `newReviewCount` would become negative,
   *    indicating an attempt to remove more reviews (via negative weight) than currently exist.
   */
  async updateRating(
    { storeId, contribution }: {
      storeId: ID;
      contribution: { rating: number; weight: number };
    },
  ): Promise<Empty | { error: string }> {
    // If the weight of the contribution is 0, no change is needed for sum or count.
    if (contribution.weight === 0) {
      return {};
    }

    // Find the existing rating record for the given storeId.
    // If no record is found, we assume initial state (0 reviews, 0 aggregated rating).
    const existingRating = await this.ratings.findOne({ _id: storeId });

    const currentAggregatedRating = existingRating?.aggregatedRating ?? 0;
    const currentReviewCount = existingRating?.reviewCount ?? 0;

    // Calculate the total sum of ratings currently represented in the aggregation.
    // This allows for accurate addition/subtraction of new contributions.
    const currentTotalSum = currentAggregatedRating * currentReviewCount;

    // Calculate the new total review count and the new total sum after applying the contribution.
    const newReviewCount = currentReviewCount + contribution.weight;
    const newTotalSum = currentTotalSum +
      (contribution.rating * contribution.weight);

    // Precondition check: A review count cannot be negative.
    // This guards against inconsistent states, e.g., trying to remove more reviews than have been added.
    if (newReviewCount < 0) {
      return {
        error:
          `Cannot update rating: resulting review count for store ${storeId} would be negative (${newReviewCount}).`,
      };
    }

    // Calculate the new aggregated rating. If there are no reviews, the aggregated rating is 0.
    const newAggregatedRating = newReviewCount === 0
      ? 0
      : newTotalSum / newReviewCount;

    // Update the rating record in the database.
    // `upsert: true` ensures that if no record currently exists for `storeId`, a new one is created.
    // The `_id` is derived from the `storeId` itself.
    await this.ratings.updateOne(
      { _id: storeId },
      {
        $set: {
          aggregatedRating: newAggregatedRating,
          reviewCount: newReviewCount,
        },
      },
      { upsert: true },
    );

    return {}; // Return an empty object to signify successful completion.
  }

  /**
   * getRating(storeId: ID): { aggregatedRating: Number, reviewCount: Number } | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store in the system.
   * @effects Returns the current aggregated rating and the count of reviews for the specified store.
   *
   * @returns
   *  - `{ aggregatedRating: Number, reviewCount: Number }` on success.
   *  - `{ aggregatedRating: 0, reviewCount: 0 }` if no rating record exists for the `storeId`,
   *    indicating that the store has not yet received any reviews. This is considered a valid,
   *    non-error state, representing a store with no rating data.
   */
  async getRating(
    { storeId }: { storeId: ID },
  ): Promise<{ aggregatedRating: number; reviewCount: number } | {
    error: string;
  }> {
    // Attempt to find the rating record for the given storeId.
    const ratingRecord = await this.ratings.findOne({ _id: storeId });

    // If no record is found, it means the store has not yet received any reviews that have
    // been processed by this concept, or its rating was reset. In this scenario,
    // the aggregated rating is 0, and the review count is 0. This is a valid, non-error state.
    if (!ratingRecord) {
      return { aggregatedRating: 0, reviewCount: 0 };
    }

    // Return the found aggregated rating and review count.
    return {
      aggregatedRating: ratingRecord.aggregatedRating,
      reviewCount: ratingRecord.reviewCount,
    };
  }
}
```

# prompt: Guidelines for writing tests: Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Also address the following concerns. Operational principle: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Interesting scenarios: Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors. Number required: For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios. No state setup: Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state. Use Deno, create test cases for the generated actions. Use the information from the link above, which was given as part of the assignment and should not be changed. This document contains methods to initialize and generate test databases for my MongoDB cluster. Use the info from the link above to regenerate test cases for the rating actions. Do not use functions that Deno does not support, like BeforeEach and AfterAll.
# response:

Here are the Deno test cases for the `Rating` concept, adhering to all the specified guidelines.

```typescript
// file: test/RatingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { ID } from "../src/utils/types.ts";
import { freshID, testDb } from "../src/utils/database.ts";
import RatingConcept from "../src/Rating/RatingConcept.ts";

// Helper function to format results for console output
const formatResult = (actionName: string, inputs: any, outputs: any) => {
  console.log(`--- ${actionName} ---`);
  console.log("Inputs:", JSON.stringify(inputs, null, 2));
  console.log("Outputs:", JSON.stringify(outputs, null, 2));
  console.log("-------------------\n");
};

Deno.test("Rating Concept: Operational Principle - Aggregating Reviews", async (t) => {
  const [db, client] = await testDb(); // Get a fresh test database
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID(); // Unique ID for our test store

  await t.step("Initial state: get rating for a new store (expected 0, 0)", async () => {
    const output = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, output);
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });

  await t.step("Add first review (rating 5, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 5, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await t.step("Add second review (rating 3, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 3, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    // (5 + 3) / 2 = 4
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 });
  });

  await t.step("Add third review (rating 4, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 4, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    // (5 + 3 + 4) / 3 = 4
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 3 });
  });

  await client.close(); // Close the database connection
});

Deno.test("Rating Concept: Scenario 1 - No Reviews Initially", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const nonExistentStoreId: ID = freshID();

  await t.step("Get rating for a store that has never received reviews", async () => {
    const output = await ratingConcept.getRating({ storeId: nonExistentStoreId });
    formatResult("getRating", { storeId: nonExistentStoreId }, output);
    // As per spec, it should return 0, 0 for non-existent records
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 2 - Zero Weight Contribution (No Change)", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add an initial review", async () => {
    const input = { storeId, contribution: { rating: 5, weight: 1 } };
    await ratingConcept.updateRating(input);
  });

  await t.step("Attempt to update with zero weight (should have no effect)", async () => {
    const input = { storeId, contribution: { rating: 1, weight: 0 } }; // Rating value doesn't matter here
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success, no error

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 }); // Should still be the initial rating
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 3 - Negative Weight (Simulating Review Deletion)", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add two reviews (5 and 3)", async () => {
    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });
    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 }); // (5+3)/2 = 4
  });

  await t.step("Remove the review with rating 5 (weight -1)", async () => {
    const input = { storeId, contribution: { rating: 5, weight: -1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 3, reviewCount: 1 }); // Should now only reflect the review with rating 3
  });

  await t.step("Remove the last review with rating 3 (weight -1)", async () => {
    const input = { storeId, contribution: { rating: 3, weight: -1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 0, reviewCount: 0 }); // All reviews removed, should revert to 0, 0
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 4 - Error Case: Negative Review Count", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add a single review", async () => {
    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const currentRating = await ratingConcept.getRating({ storeId });
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await t.step("Attempt to remove two reviews (weight -2) when only one exists", async () => {
    const input = { storeId, contribution: { rating: 1, weight: -2 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertExists((output as { error: string }).error);
    assertEquals(
      (output as { error: string }).error,
      `Cannot update rating: resulting review count for store ${storeId} would be negative (-1).`,
    );

    // Verify the state has not changed due to the failed operation
    const currentRating = await ratingConcept.getRating({ storeId });
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 5 - Multiple Independent Stores", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeIdA: ID = freshID();
  const storeIdB: ID = freshID();
  const storeIdC: ID = freshID(); // A store that will receive no ratings

  await t.step("Update rating for Store A", async () => {
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 4, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 5, weight: 1 } });
    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, ratingA);
    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
  });

  await t.step("Update rating for Store B", async () => {
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 2, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 3, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 4, weight: 1 } });
    const ratingB = await ratingConcept.getRating({ storeId: storeIdB });
    formatResult("getRating", { storeId: storeIdB }, ratingB);
    assertEquals(ratingB, { aggregatedRating: 3, reviewCount: 3 }); // (2+3+4)/3 = 3
  });

  await t.step("Verify Store A's rating is unchanged", async () => {
    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, ratingA);
    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
  });

  await t.step("Verify Store C (no ratings) remains at 0, 0", async () => {
    const ratingC = await ratingConcept.getRating({ storeId: storeIdC });
    formatResult("getRating", { storeId: storeIdC }, ratingC);
    assertEquals(ratingC, { aggregatedRating: 0, reviewCount: 0 });
  });

  await client.close();
});

```

# Deno does not allow the use of the "any" type, work around it and revise
# response:

You are absolutely correct! Deno's strict TypeScript environment disallows the `any` type to enforce better type safety. I've updated the `formatResult` helper function to use `Record<string, unknown>` which correctly represents a dictionary-like object with unknown property types, suitable for logging various action inputs and outputs without compromising type safety.

Here are the revised Deno test cases for the `Rating` concept:

```typescript
// file: test/RatingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { ID } from "../src/utils/types.ts";
import { freshID, testDb } from "../src/utils/database.ts";
import RatingConcept from "../src/Rating/RatingConcept.ts";

// Helper function to format results for console output, now type-safe for Deno
const formatResult = (
  actionName: string,
  inputs: Record<string, unknown>, // Use Record<string, unknown> instead of any
  outputs: Record<string, unknown>, // Use Record<string, unknown> instead of any
) => {
  console.log(`--- ${actionName} ---`);
  console.log("Inputs:", JSON.stringify(inputs, null, 2));
  console.log("Outputs:", JSON.stringify(outputs, null, 2));
  console.log("-------------------\n");
};

Deno.test("Rating Concept: Operational Principle - Aggregating Reviews", async (t) => {
  const [db, client] = await testDb(); // Get a fresh test database
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID(); // Unique ID for our test store

  await t.step("Initial state: get rating for a new store (expected 0, 0)", async () => {
    const output = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, output);
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });

  await t.step("Add first review (rating 5, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 5, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await t.step("Add second review (rating 3, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 3, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    // (5 + 3) / 2 = 4
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 });
  });

  await t.step("Add third review (rating 4, weight 1)", async () => {
    const input = { storeId, contribution: { rating: 4, weight: 1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    // (5 + 3 + 4) / 3 = 4
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 3 });
  });

  await client.close(); // Close the database connection
});

Deno.test("Rating Concept: Scenario 1 - No Reviews Initially", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const nonExistentStoreId: ID = freshID();

  await t.step("Get rating for a store that has never received reviews", async () => {
    const output = await ratingConcept.getRating({ storeId: nonExistentStoreId });
    formatResult("getRating", { storeId: nonExistentStoreId }, output);
    // As per spec, it should return 0, 0 for non-existent records
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 2 - Zero Weight Contribution (No Change)", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add an initial review", async () => {
    const input = { storeId, contribution: { rating: 5, weight: 1 } };
    await ratingConcept.updateRating(input);
  });

  await t.step("Attempt to update with zero weight (should have no effect)", async () => {
    const input = { storeId, contribution: { rating: 1, weight: 0 } }; // Rating value doesn't matter here
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success, no error

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 }); // Should still be the initial rating
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 3 - Negative Weight (Simulating Review Deletion)", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add two reviews (5 and 3)", async () => {
    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });
    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 }); // (5+3)/2 = 4
  });

  await t.step("Remove the review with rating 5 (weight -1)", async () => {
    const input = { storeId, contribution: { rating: 5, weight: -1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 3, reviewCount: 1 }); // Should now only reflect the review with rating 3
  });

  await t.step("Remove the last review with rating 3 (weight -1)", async () => {
    const input = { storeId, contribution: { rating: 3, weight: -1 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertEquals(output, {}); // Expect success

    const currentRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, currentRating);
    assertEquals(currentRating, { aggregatedRating: 0, reviewCount: 0 }); // All reviews removed, should revert to 0, 0
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 4 - Error Case: Negative Review Count", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeId: ID = freshID();

  await t.step("Add a single review", async () => {
    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const currentRating = await ratingConcept.getRating({ storeId });
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await t.step("Attempt to remove two reviews (weight -2) when only one exists", async () => {
    const input = { storeId, contribution: { rating: 1, weight: -2 } };
    const output = await ratingConcept.updateRating(input);
    formatResult("updateRating", input, output);
    assertExists((output as { error: string }).error);
    assertEquals(
      (output as { error: string }).error,
      `Cannot update rating: resulting review count for store ${storeId} would be negative (-1).`,
    );

    // Verify the state has not changed due to the failed operation
    const currentRating = await ratingConcept.getRating({ storeId });
    assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
  });

  await client.close();
});

Deno.test("Rating Concept: Scenario 5 - Multiple Independent Stores", async (t) => {
  const [db, client] = await testDb();
  const ratingConcept = new RatingConcept(db);

  const storeIdA: ID = freshID();
  const storeIdB: ID = freshID();
  const storeIdC: ID = freshID(); // A store that will receive no ratings

  await t.step("Update rating for Store A", async () => {
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 4, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 5, weight: 1 } });
    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, ratingA);
    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
  });

  await t.step("Update rating for Store B", async () => {
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 2, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 3, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 4, weight: 1 } });
    const ratingB = await ratingConcept.getRating({ storeId: storeIdB });
    formatResult("getRating", { storeId: storeIdB }, ratingB);
    assertEquals(ratingB, { aggregatedRating: 3, reviewCount: 3 }); // (2+3+4)/3 = 3
  });

  await t.step("Verify Store A's rating is unchanged", async () => {
    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, ratingA);
    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
  });

  await t.step("Verify Store C (no ratings) remains at 0, 0", async () => {
    const ratingC = await ratingConcept.getRating({ storeId: storeIdC });
    formatResult("getRating", { storeId: storeIdC }, ratingC);
    assertEquals(ratingC, { aggregatedRating: 0, reviewCount: 0 });
  });

  await client.close();
});

```

# error: Leaks detected: A TLS connection was opened/accepted before the test started, but was closed during the test. Do not close resources in a test that were not created during that test. A timer was started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. An async call to op_read was started before the test, but completed during the test. Async operations should not complete in a test if they were not started in that test. To get more details where leaks occurred, run again with the --trace-leaks flag.
# response:

The "Leaks detected" error in Deno often arises when external resources (like database connections, network sockets, or timers) are initiated in a context that Deno's test runner perceives as "before the test started," but are then closed "during the test." This can happen with libraries like `npm:mongodb` due to their internal connection pooling and background operations.

To address this effectively and robustly, we'll encapsulate the database client acquisition and closure within a `try...finally` block for each top-level `Deno.test`. This ensures that `client.close()` is *always* called, even if an assertion fails or an error is thrown within any of the test steps (`t.step`). This practice guarantees that resources are cleaned up within the scope of each test, adhering to Deno's resource management principles.

The `formatResult` helper function has already been updated to use `Record<string, unknown>` to comply with Deno's strict `any` type restrictions.

Here are the revised test cases:

```typescript
// file: test/RatingConcept.test.ts

import {
  assertEquals,
  assertExists,
} from "jsr:@std/assert";
import { ID } from "../src/utils/types.ts";
import { freshID, testDb } from "../src/utils/database.ts";
import RatingConcept from "../src/Rating/RatingConcept.ts";
import { MongoClient } from "npm:mongodb"; // Import MongoClient for type hinting

// Helper function to format results for console output, now type-safe for Deno
const formatResult = (
  actionName: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  console.log(`--- ${actionName} ---`);
  console.log("Inputs:", JSON.stringify(inputs, null, 2));
  console.log("Outputs:", JSON.stringify(outputs, null, 2));
  console.log("-------------------\n");
};

Deno.test("Rating Concept: Operational Principle - Aggregating Reviews", async (t) => {
  let client: MongoClient | undefined; // Declare client to ensure it's accessible in finally block
  try {
    const [db, mongoClient] = await testDb(); // Get a fresh test database client
    client = mongoClient; // Assign to the outer variable
    const ratingConcept = new RatingConcept(db);

    const storeId: ID = freshID(); // Unique ID for our test store

    await t.step("Initial state: get rating for a new store (expected 0, 0)", async () => {
      const output = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, output);
      assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
    });

    await t.step("Add first review (rating 5, weight 1)", async () => {
      const input = { storeId, contribution: { rating: 5, weight: 1 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
    });

    await t.step("Add second review (rating 3, weight 1)", async () => {
      const input = { storeId, contribution: { rating: 3, weight: 1 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      // (5 + 3) / 2 = 4
      assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 });
    });

    await t.step("Add third review (rating 4, weight 1)", async () => {
      const input = { storeId, contribution: { rating: 4, weight: 1 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      // (5 + 3 + 4) / 3 = 4
      assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 3 });
    });
  } finally {
    // Ensure the database client is closed, even if tests fail
    if (client) {
      await client.close();
    }
  }
});

Deno.test("Rating Concept: Scenario 1 - No Reviews Initially", async (t) => {
  let client: MongoClient | undefined;
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    const ratingConcept = new RatingConcept(db);

    const nonExistentStoreId: ID = freshID();

    await t.step("Get rating for a store that has never received reviews", async () => {
      const output = await ratingConcept.getRating({ storeId: nonExistentStoreId });
      formatResult("getRating", { storeId: nonExistentStoreId }, output);
      // As per spec, it should return 0, 0 for non-existent records
      assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

Deno.test("Rating Concept: Scenario 2 - Zero Weight Contribution (No Change)", async (t) => {
  let client: MongoClient | undefined;
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    const ratingConcept = new RatingConcept(db);

    const storeId: ID = freshID();

    await t.step("Add an initial review", async () => {
      const input = { storeId, contribution: { rating: 5, weight: 1 } };
      await ratingConcept.updateRating(input);
    });

    await t.step("Attempt to update with zero weight (should have no effect)", async () => {
      const input = { storeId, contribution: { rating: 1, weight: 0 } }; // Rating value doesn't matter here
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success, no error

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 }); // Should still be the initial rating
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

Deno.test("Rating Concept: Scenario 3 - Negative Weight (Simulating Review Deletion)", async (t) => {
  let client: MongoClient | undefined;
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    const ratingConcept = new RatingConcept(db);

    const storeId: ID = freshID();

    await t.step("Add two reviews (5 and 3)", async () => {
      await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
      await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });
      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      assertEquals(currentRating, { aggregatedRating: 4, reviewCount: 2 }); // (5+3)/2 = 4
    });

    await t.step("Remove the review with rating 5 (weight -1)", async () => {
      const input = { storeId, contribution: { rating: 5, weight: -1 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      assertEquals(currentRating, { aggregatedRating: 3, reviewCount: 1 }); // Should now only reflect the review with rating 3
    });

    await t.step("Remove the last review with rating 3 (weight -1)", async () => {
      const input = { storeId, contribution: { rating: 3, weight: -1 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertEquals(output, {}); // Expect success

      const currentRating = await ratingConcept.getRating({ storeId });
      formatResult("getRating", { storeId }, currentRating);
      assertEquals(currentRating, { aggregatedRating: 0, reviewCount: 0 }); // All reviews removed, should revert to 0, 0
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

Deno.test("Rating Concept: Scenario 4 - Error Case: Negative Review Count", async (t) => {
  let client: MongoClient | undefined;
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    const ratingConcept = new RatingConcept(db);

    const storeId: ID = freshID();

    await t.step("Add a single review", async () => {
      await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
      const currentRating = await ratingConcept.getRating({ storeId });
      assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
    });

    await t.step("Attempt to remove two reviews (weight -2) when only one exists", async () => {
      const input = { storeId, contribution: { rating: 1, weight: -2 } };
      const output = await ratingConcept.updateRating(input);
      formatResult("updateRating", input, output);
      assertExists((output as { error: string }).error);
      assertEquals(
        (output as { error: string }).error,
        `Cannot update rating: resulting review count for store ${storeId} would be negative (-1).`,
      );

      // Verify the state has not changed due to the failed operation
      const currentRating = await ratingConcept.getRating({ storeId });
      assertEquals(currentRating, { aggregatedRating: 5, reviewCount: 1 });
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

Deno.test("Rating Concept: Scenario 5 - Multiple Independent Stores", async (t) => {
  let client: MongoClient | undefined;
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    const ratingConcept = new RatingConcept(db);

    const storeIdA: ID = freshID();
    const storeIdB: ID = freshID();
    const storeIdC: ID = freshID(); // A store that will receive no ratings

    await t.step("Update rating for Store A", async () => {
      await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 4, weight: 1 } });
      await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 5, weight: 1 } });
      const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
      formatResult("getRating", { storeId: storeIdA }, ratingA);
      assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
    });

    await t.step("Update rating for Store B", async () => {
      await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 2, weight: 1 } });
      await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 3, weight: 1 } });
      await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 4, weight: 1 } });
      const ratingB = await ratingConcept.getRating({ storeId: storeIdB });
      formatResult("getRating", { storeId: storeIdB }, ratingB);
      assertEquals(ratingB, { aggregatedRating: 3, reviewCount: 3 }); // (2+3+4)/3 = 3
    });

    await t.step("Verify Store A's rating is unchanged", async () => {
      const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
      formatResult("getRating", { storeId: storeIdA }, ratingA);
      assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
    });

    await t.step("Verify Store C (no ratings) remains at 0, 0", async () => {
      const ratingC = await ratingConcept.getRating({ storeId: storeIdC });
      formatResult("getRating", { storeId: storeIdC }, ratingC);
      assertEquals(ratingC, { aggregatedRating: 0, reviewCount: 0 });
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});
```

# Instead of having different tests be in different Deno.test blocks, have different tests be different t.step in a singular Deno.test block. After all tests, close the connection.
# response:

Okay, I understand. Consolidating all test scenarios into a single `Deno.test` block with individual `t.step`s, and managing the database connection (`client`) once for the entire test suite, will improve efficiency and better align with Deno's leak detection expectations for long-running resources.

Here is the revised test file:

```typescript
// file: test/RatingConcept.test.ts

import {
  assertEquals,
  assertExists,
} from "jsr:@std/assert";
import { ID } from "../src/utils/types.ts";
import { freshID, testDb } from "../src/utils/database.ts";
import RatingConcept from "../src/Rating/RatingConcept.ts";
import { MongoClient } from "npm:mongodb";

// Helper function to format results for console output, type-safe for Deno
const formatResult = (
  actionName: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  console.log(`--- ${actionName} ---`);
  console.log("Inputs:", JSON.stringify(inputs, null, 2));
  console.log("Outputs:", JSON.stringify(outputs, null, 2));
  console.log("-------------------\n");
};

Deno.test("Rating Concept: Comprehensive Test Suite", async (t) => {
  let client: MongoClient | undefined; // Declare client for overall test block
  let ratingConcept: RatingConcept;
  let storeIdCounter = 0; // To ensure unique store IDs across all steps

  // Setup: Initialize DB and concept once for all steps
  try {
    const [db, mongoClient] = await testDb();
    client = mongoClient;
    ratingConcept = new RatingConcept(db);
  } catch (error) {
    console.error("Failed to initialize database or RatingConcept:", error);
    if (client) await client.close();
    throw error; // Re-throw to fail the test setup
  }

  // --- Operational Principle - Aggregating Reviews ---
  await t.step("Operational Principle: Aggregating Reviews", async () => {
    const storeId: ID = freshID(); // Unique ID for this test store

    const initialOutput = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, initialOutput);
    assertEquals(initialOutput, { aggregatedRating: 0, reviewCount: 0 });

    const input1 = { storeId, contribution: { rating: 5, weight: 1 } };
    const output1 = await ratingConcept.updateRating(input1);
    formatResult("updateRating", input1, output1);
    assertEquals(output1, {});

    const ratingAfter1 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfter1);
    assertEquals(ratingAfter1, { aggregatedRating: 5, reviewCount: 1 });

    const input2 = { storeId, contribution: { rating: 3, weight: 1 } };
    const output2 = await ratingConcept.updateRating(input2);
    formatResult("updateRating", input2, output2);
    assertEquals(output2, {});

    const ratingAfter2 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfter2);
    assertEquals(ratingAfter2, { aggregatedRating: 4, reviewCount: 2 });

    const input3 = { storeId, contribution: { rating: 4, weight: 1 } };
    const output3 = await ratingConcept.updateRating(input3);
    formatResult("updateRating", input3, output3);
    assertEquals(output3, {});

    const ratingAfter3 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfter3);
    assertEquals(ratingAfter3, { aggregatedRating: 4, reviewCount: 3 });
  });

  // --- Scenario 1 - No Reviews Initially ---
  await t.step("Scenario 1: Get rating for a store with no reviews (expected 0, 0)", async () => {
    const nonExistentStoreId: ID = freshID();

    const output = await ratingConcept.getRating({ storeId: nonExistentStoreId });
    formatResult("getRating", { storeId: nonExistentStoreId }, output);
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });

  // --- Scenario 2 - Zero Weight Contribution (No Change) ---
  await t.step("Scenario 2: Update with zero weight contribution (should have no effect)", async () => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const initialRating = await ratingConcept.getRating({ storeId });
    assertEquals(initialRating, { aggregatedRating: 5, reviewCount: 1 });

    const zeroWeightInput = { storeId, contribution: { rating: 1, weight: 0 } };
    const zeroWeightOutput = await ratingConcept.updateRating(zeroWeightInput);
    formatResult("updateRating", zeroWeightInput, zeroWeightOutput);
    assertEquals(zeroWeightOutput, {});

    const finalRating = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, finalRating);
    assertEquals(finalRating, { aggregatedRating: 5, reviewCount: 1 }); // Should still be the initial rating
  });

  // --- Scenario 3 - Negative Weight (Simulating Review Deletion) ---
  await t.step("Scenario 3: Negative weight contributions (simulating review deletion)", async () => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });
    const ratingAfterAdds = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfterAdds);
    assertEquals(ratingAfterAdds, { aggregatedRating: 4, reviewCount: 2 }); // (5+3)/2 = 4

    const removeInput1 = { storeId, contribution: { rating: 5, weight: -1 } };
    const removeOutput1 = await ratingConcept.updateRating(removeInput1);
    formatResult("updateRating", removeInput1, removeOutput1);
    assertEquals(removeOutput1, {});

    const ratingAfterRemove1 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfterRemove1);
    assertEquals(ratingAfterRemove1, { aggregatedRating: 3, reviewCount: 1 }); // Should now only reflect the review with rating 3

    const removeInput2 = { storeId, contribution: { rating: 3, weight: -1 } };
    const removeOutput2 = await ratingConcept.updateRating(removeInput2);
    formatResult("updateRating", removeInput2, removeOutput2);
    assertEquals(removeOutput2, {});

    const ratingAfterRemove2 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, ratingAfterRemove2);
    assertEquals(ratingAfterRemove2, { aggregatedRating: 0, reviewCount: 0 }); // All reviews removed, should revert to 0, 0
  });

  // --- Scenario 4 - Error Case: Negative Review Count ---
  await t.step("Scenario 4: Error when contribution would result in negative review count", async () => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const initialRating = await ratingConcept.getRating({ storeId });
    assertEquals(initialRating, { aggregatedRating: 5, reviewCount: 1 });

    const errorInput = { storeId, contribution: { rating: 1, weight: -2 } };
    const errorOutput = await ratingConcept.updateRating(errorInput);
    formatResult("updateRating", errorInput, errorOutput);
    assertExists((errorOutput as { error: string }).error);
    assertEquals(
      (errorOutput as { error: string }).error,
      `Cannot update rating: resulting review count for store ${storeId} would be negative (-1).`,
    );

    const ratingAfterError = await ratingConcept.getRating({ storeId });
    assertEquals(ratingAfterError, { aggregatedRating: 5, reviewCount: 1 }); // State should be unchanged
  });

  // --- Scenario 5 - Multiple Independent Stores ---
  await t.step("Scenario 5: Handling multiple independent stores concurrently", async () => {
    const storeIdA: ID = freshID();
    const storeIdB: ID = freshID();
    const storeIdC: ID = freshID(); // A store that will receive no ratings

    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 4, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 5, weight: 1 } });
    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, ratingA);
    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });

    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 2, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 3, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 4, weight: 1 } });
    const ratingB = await ratingConcept.getRating({ storeId: storeIdB });
    formatResult("getRating", { storeId: storeIdB }, ratingB);
    assertEquals(ratingB, { aggregatedRating: 3, reviewCount: 3 }); // (2+3+4)/3 = 3

    const finalRatingA = await ratingConcept.getRating({ storeId: storeIdA });
    formatResult("getRating", { storeId: storeIdA }, finalRatingA);
    assertEquals(finalRatingA, { aggregatedRating: 4.5, reviewCount: 2 });

    const ratingC = await ratingConcept.getRating({ storeId: storeIdC });
    formatResult("getRating", { storeId: storeIdC }, ratingC);
    assertEquals(ratingC, { aggregatedRating: 0, reviewCount: 0 });
  });

  // Teardown: Ensure the database client is closed once after all steps
  if (client) {
    await client.close();
    console.log("\n--- MongoDB client closed successfully ---");
  }
});
```