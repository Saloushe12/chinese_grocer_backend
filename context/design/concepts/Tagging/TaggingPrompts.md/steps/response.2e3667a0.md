---
timestamp: 'Tue Oct 21 2025 05:56:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_055616.ae452c90.md]]'
content_id: 2e3667a0aa719c6a123299891ac1b57b45bb4b5297a5a4ba1e7a15e3abbc304f
---

# response:

The error `AssertionError: Values are not equal: Store '019a062a-2a6d-7816-9210-4463018617c7' should still have 1 tag. [Diff] Actual / Expected: 2 / 1` in `Scenario 2: Edge Cases` arises because of state leakage between test steps.

### Reasoning for the Error

1. **Shared State:** The `testDb()` function is called only once at the beginning of the entire `Deno.test` block. This means all `t.step` blocks within that `Deno.test` share the same database instance and the state it holds. There are no `beforeEach` or `afterEach` mechanisms available (as per the prompt's constraints) to reset the database state before each `t.step`.
2. **`storeId3` Reuse:** The `storeId3` variable is defined once globally for the `Deno.test` block.
   * In `Scenario 1: Idempotency`, `storeId3` is used and, after adding and removing tags, is left with one tag (e.g., `"Clothing"`).
   * `Scenario 2: Edge Cases` then uses the *same* `storeId3`. It first adds a `setupTag` (e.g., `"Electronics"`). At this point, `storeId3` now contains two tags (e.g., `["Clothing", "Electronics"]`).
   * When the test later attempts to remove a non-existent tag from `storeId3` and then asserts `store3Doc!.tags.length, 1`, it fails because the document actually contains two tags, not one, due to the tag (`"Clothing"`) persisting from `Scenario 1`.

### Solution

To fix this, each independent test scenario that requires a clean slate for a particular store ID should use a *unique* `storeId` that has not been used by previous `t.step` blocks. This ensures that the state built up in one scenario does not interfere with the assertions in another.

We will introduce a new `storeId5` specifically for `Scenario 2` to ensure it operates on a clean, isolated document.

### Updated Test Case

```typescript
// file: src/Tagging/TaggingConcept.test.ts
import { assert, assertEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TaggingConcept from "./TaggingConcept.ts";
import { ID } from "@utils/types.ts";
import { MongoClient } from "npm:mongodb";

Deno.test("Tagging Concept - addTag, removeTag, and _getStoresByTag Action Tests", async (t) => {
  let taggingConcept: TaggingConcept;
  let client: MongoClient; // Declare client to ensure it's closed (will be from testDb)

  // Setup: Initialize a fresh test database and TaggingConcept instance once for all steps
  // testDb() internally drops all collections for a clean slate, providing isolated tests.
  const [db, mongoClient] = await testDb();
  taggingConcept = new TaggingConcept(db);
  client = mongoClient;

  // Define some unique store IDs for testing scenarios
  const storeId1 = freshID() as ID; // Used in Operational Principle
  const storeId2 = freshID() as ID; // Used in Operational Principle
  const storeId3 = freshID() as ID; // Used in Scenario 1
  const storeId4 = freshID() as ID; // Used in Scenario 3
  const storeId5 = freshID() as ID; // NEW: Used in Scenario 2 to ensure isolation

  try { // Use try...finally to ensure client closure for this Deno.test block
    await t.step("Operational Principle: Successfully add, query, and then remove tags for stores", async () => {
      console.log(`--- Running 'Operational Principle' test for Tagging concept ---`);

      // --- Part 1: Adding Tags ---
      const tagA = "Electronics";
      const tagB = "Gadgets";
      const tagC = "NewArrivals";

      console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagA}' })`);
      let addResult = await taggingConcept.addTag({ storeId: storeId1, tag: tagA });
      assertEquals(addResult, {}, `Expected success for adding '${tagA}' to new store '${storeId1}'`);
      console.log(`Output: ${JSON.stringify(addResult)}`);

      console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagB}' })`);
      addResult = await taggingConcept.addTag({ storeId: storeId1, tag: tagB });
      assertEquals(addResult, {}, `Expected success for adding '${tagB}' to existing store '${storeId1}'`);
      console.log(`Output: ${JSON.stringify(addResult)}`);

      console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagC}' })`);
      addResult = await taggingConcept.addTag({ storeId: storeId1, tag: tagC });
      assertEquals(addResult, {}, `Expected success for adding '${tagC}' to existing store '${storeId1}'`);
      console.log(`Output: ${JSON.stringify(addResult)}`);

      // Add tags to a second store for query diversity
      const tagD = "Books";
      const tagE = "Fiction";
      console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagD}' })`);
      await taggingConcept.addTag({ storeId: storeId2, tag: tagD });
      console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagE}' })`);
      await taggingConcept.addTag({ storeId: storeId2, tag: tagE });


      // Verification after adding
      let store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
      assert(store1Doc, `Document for storeId '${storeId1}' should exist after adding tags`);
      assertArrayIncludes(store1Doc!.tags, [tagA, tagB, tagC], `Store '${storeId1}' should have all three tags`);
      assertEquals(store1Doc!.tags.length, 3, `Store '${storeId1}' should have exactly 3 tags`);
      console.log(`Verified tags for '${storeId1}' after adds: ${JSON.stringify(store1Doc!.tags)}`);

      let store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
      assert(store2Doc, `Document for storeId '${storeId2}' should exist after adding tags`);
      assertArrayIncludes(store2Doc!.tags, [tagD, tagE], `Store '${storeId2}' should have both tags`);
      assertEquals(store2Doc!.tags.length, 2, `Store '${storeId2}' should have exactly 2 tags`);
      console.log(`Verified tags for '${storeId2}' after adds: ${JSON.stringify(store2Doc!.tags)}`);


      // --- Part 2: Querying Tags ---
      console.log(`Action: _getStoresByTag({ tag: '${tagA}' })`);
      let queryResult = await taggingConcept._getStoresByTag({ tag: tagA });
      assertEquals(queryResult, { storeIds: [storeId1] }, `Expected storeId1 for tag '${tagA}'`);
      console.log(`Output for '${tagA}': ${JSON.stringify(queryResult)}`);

      console.log(`Action: _getStoresByTag({ tag: '${tagB}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: tagB });
      assertEquals(queryResult, { storeIds: [storeId1] }, `Expected storeId1 for tag '${tagB}'`);
      console.log(`Output for '${tagB}': ${JSON.stringify(queryResult)}`);

      console.log(`Action: _getStoresByTag({ tag: '${tagD}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: tagD });
      assertEquals(queryResult, { storeIds: [storeId2] }, `Expected storeId2 for tag '${tagD}'`);
      console.log(`Output for '${tagD}': ${JSON.stringify(queryResult)}`);
      
      // Test a tag that spans multiple stores
      const commonTag = "Popular";
      await taggingConcept.addTag({ storeId: storeId1, tag: commonTag });
      await taggingConcept.addTag({ storeId: storeId2, tag: commonTag });
      console.log(`Action: _getStoresByTag({ tag: '${commonTag}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: commonTag });
      // Sort the expected array as MongoDB's order isn't guaranteed
      const expectedCommonStoreIds = [storeId1, storeId2].sort();
      const actualCommonStoreIds = (queryResult as { storeIds: ID[] }).storeIds.sort();
      assertEquals(actualCommonStoreIds, expectedCommonStoreIds, `Expected storeId1 and storeId2 for common tag '${commonTag}'`);
      console.log(`Output for '${commonTag}': ${JSON.stringify(queryResult)}`);


      // --- Part 3: Removing Tags ---
      console.log(`Action: removeTag({ storeId: '${storeId1}', tag: '${tagB}' })`);
      let removeResult = await taggingConcept.removeTag({ storeId: storeId1, tag: tagB });
      assertEquals(removeResult, {}, `Expected success for removing '${tagB}' from '${storeId1}'`);
      console.log(`Output: ${JSON.stringify(removeResult)}`);

      // Verification after removal
      store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
      assert(store1Doc, `Document for storeId '${storeId1}' should still exist`);
      assertArrayIncludes(store1Doc!.tags, [tagA, tagC, commonTag], `Store '${storeId1}' should have '${tagA}', '${tagC}', '${commonTag}' after removing '${tagB}'`);
      assertEquals(store1Doc!.tags.length, 3, `Store '${storeId1}' should have exactly 3 tags after removing one`);
      console.log(`Verified tags for '${storeId1}' after removing '${tagB}': ${JSON.stringify(store1Doc!.tags)}`);

      // Re-query for the removed tag
      console.log(`Action: _getStoresByTag({ tag: '${tagB}' }) after removal`);
      queryResult = await taggingConcept._getStoresByTag({ tag: tagB });
      assertEquals(queryResult, { storeIds: [] }, `Expected no storeIds for tag '${tagB}' after removal`);
      console.log(`Output for '${tagB}' after removal: ${JSON.stringify(queryResult)}`);

      console.log(`--- End 'Operational Principle' test ---`);
    });

    await t.step("Scenario 1: Idempotency of addTag and removeTag - Repeated operations and query for state", async () => {
      console.log(`--- Running 'Idempotency' test for addTag and removeTag ---`);

      // Use storeId3 for this scenario
      const tagX = "Fashion";
      const tagY = "Clothing";

      // Add tagX
      console.log(`Action: addTag({ storeId: '${storeId3}', tag: '${tagX}' })`);
      let result = await taggingConcept.addTag({ storeId: storeId3, tag: tagX });
      assertEquals(result, {}, `Expected success for adding '${tagX}' to '${storeId3}'`);

      // Add tagY
      console.log(`Action: addTag({ storeId: '${storeId3}', tag: '${tagY}' })`);
      result = await taggingConcept.addTag({ storeId: storeId3, tag: tagY });
      assertEquals(result, {}, `Expected success for adding '${tagY}' to '${storeId3}'`);

      // Re-add tagX (should have no effect on count)
      console.log(`Action: addTag({ storeId: '${storeId3}', tag: '${tagX}' }) (again)`);
      result = await taggingConcept.addTag({ storeId: storeId3, tag: tagX });
      assertEquals(result, {}, `Expected success for re-adding '${tagX}' (idempotent)`);

      let store3Doc = await taggingConcept["taggings"].findOne({ _id: storeId3 });
      assert(store3Doc, "Store 3 document should exist");
      assertEquals(store3Doc!.tags.length, 2, `Store '${storeId3}' should still have 2 tags`);
      assertArrayIncludes(store3Doc!.tags, [tagX, tagY], `Store '${storeId3}' should have '${tagX}' and '${tagY}'`);
      console.log(`Verified tags for '${storeId3}' after re-adding: ${JSON.stringify(store3Doc!.tags)}`);

      // Remove tagX
      console.log(`Action: removeTag({ storeId: '${storeId3}', tag: '${tagX}' })`);
      result = await taggingConcept.removeTag({ storeId: storeId3, tag: tagX });
      assertEquals(result, {}, `Expected success for removing '${tagX}'`);

      // Re-remove tagX (should return error as it's already gone)
      console.log(`Action: removeTag({ storeId: '${storeId3}', tag: '${tagX}' }) (again)`);
      result = await taggingConcept.removeTag({ storeId: storeId3, tag: tagX });
      assert(result.error, `Expected error for removing non-existent tag '${tagX}' from '${storeId3}'`);
      assertEquals(result.error, `Tag '${tagX}' not found for store ID '${storeId3}'.`);
      console.log(`Output: ${JSON.stringify(result)}`);

      store3Doc = await taggingConcept["taggings"].findOne({ _id: storeId3 });
      assert(store3Doc, "Store 3 document should exist");
      assertEquals(store3Doc!.tags.length, 1, `Store '${storeId3}' should have 1 tag left`);
      assertArrayIncludes(store3Doc!.tags, [tagY], `Store '${storeId3}' should only have '${tagY}' left`);
      console.log(`Verified tags for '${storeId3}' after re-removing: ${JSON.stringify(store3Doc!.tags)}`);

      // Query for removed tagX
      console.log(`Action: _getStoresByTag({ tag: '${tagX}' }) after removal`);
      const queryResult = await taggingConcept._getStoresByTag({ tag: tagX });
      assertEquals(queryResult, { storeIds: [] }, `Expected no storeIds for removed tag '${tagX}'`);
      console.log(`Output for '${tagX}' after removal: ${JSON.stringify(queryResult)}`);

      console.log(`--- End 'Idempotency' test ---`);
    });

    await t.step("Scenario 2: Edge Cases for removeTag and _getStoresByTag (non-existent stores/tags, empty strings)", async () => {
      console.log(`--- Running 'Edge Cases' test for removeTag and _getStoresByTag ---`);

      // Use storeId5 for this scenario to ensure a clean slate, avoiding state leakage from prior steps.
      const currentStoreId = storeId5;
      const nonExistentStoreId = freshID() as ID; // Still use a fresh ID for a truly non-existent store
      const existingTag = "Books"; // Example tag (will be added to currentStoreId)
      const nonExistentTag = "Nonexistent";

      // Try to remove a tag from a store that has never been tagged
      console.log(`Action: removeTag({ storeId: '${nonExistentStoreId}', tag: '${existingTag}' }) from non-existent store`);
      let result = await taggingConcept.removeTag({ storeId: nonExistentStoreId, tag: existingTag });
      assert(result.error, `Expected error when removing from non-existent store '${nonExistentStoreId}'`);
      assertEquals(result.error, `Store with ID '${nonExistentStoreId}' not found for tagging.`);
      console.log(`Output: ${JSON.stringify(result)}`);

      // Query for a tag that doesn't exist anywhere
      console.log(`Action: _getStoresByTag({ tag: '${nonExistentTag}' }) for a tag that doesn't exist`);
      let queryResult = await taggingConcept._getStoresByTag({ tag: nonExistentTag });
      assertEquals(queryResult, { storeIds: [] }, `Expected empty array for non-existent tag '${nonExistentTag}'`);
      console.log(`Output for '${nonExistentTag}': ${JSON.stringify(queryResult)}`);


      // Add a tag to currentStoreId to set up for a valid store, but non-existent tag scenario
      const setupTag = "Electronics"; // Use a distinct tag for this store
      console.log(`Action: addTag({ storeId: '${currentStoreId}', tag: '${setupTag}' })`);
      await taggingConcept.addTag({ storeId: currentStoreId, tag: setupTag });
      let currentStoreDoc = await taggingConcept["taggings"].findOne({ _id: currentStoreId });
      assert(currentStoreDoc, `Document for storeId '${currentStoreId}' should exist for setup`);
      assertArrayIncludes(currentStoreDoc!.tags, [setupTag], `Store '${currentStoreId}' should have the setup tag`);

      // Try to remove a tag that doesn't exist for an existing store
      console.log(`Action: removeTag({ storeId: '${currentStoreId}', tag: '${nonExistentTag}' }) from existing store`);
      result = await taggingConcept.removeTag({ storeId: currentStoreId, tag: nonExistentTag });
      assert(result.error, `Expected error when removing non-existent tag '${nonExistentTag}' from existing store '${currentStoreId}'`);
      assertEquals(result.error, `Tag '${nonExistentTag}' not found for store ID '${currentStoreId}'.`);
      console.log(`Output: ${JSON.stringify(result)}`);

      // Verify state for currentStoreId is unchanged
      currentStoreDoc = await taggingConcept["taggings"].findOne({ _id: currentStoreId });
      assert(currentStoreDoc, `Store '${currentStoreId}' document should still exist`);
      assertEquals(currentStoreDoc!.tags.length, 1, `Store '${currentStoreId}' should still have 1 tag`);
      assertArrayIncludes(currentStoreDoc!.tags, [setupTag], `Store '${currentStoreId}' should still have '${setupTag}'`);

      // Query for an empty string tag
      console.log(`Action: _getStoresByTag({ tag: '' })`);
      await taggingConcept.addTag({ storeId: currentStoreId, tag: "" }); // Add an empty tag first
      queryResult = await taggingConcept._getStoresByTag({ tag: "" });
      assertEquals((queryResult as { storeIds: ID[] }).storeIds, [currentStoreId], `Expected '${currentStoreId}' for empty string tag`);
      console.log(`Output for empty string tag: ${JSON.stringify(queryResult)}`);

      console.log(`--- End 'Edge Cases' test ---`);
    });

    await t.step("Scenario 3: Remove last tag from a store (should delete the document) and verify query", async () => {
      console.log(`--- Running 'Remove Last Tag' test for removeTag and _getStoresByTag ---`);

      // Use storeId4
      const tagOne = "SoloTag";

      // Add the only tag
      console.log(`Action: addTag({ storeId: '${storeId4}', tag: '${tagOne}' })`);
      let addResult = await taggingConcept.addTag({ storeId: storeId4, tag: tagOne });
      assertEquals(addResult, {}, `Expected success for adding '${tagOne}' to new store '${storeId4}'`);

      // Verify document exists with the tag
      let store4Doc = await taggingConcept["taggings"].findOne({ _id: storeId4 });
      assert(store4Doc, `Document for storeId '${storeId4}' should exist`);
      assertEquals(store4Doc!.tags.length, 1, `Store '${storeId4}' should have 1 tag`);
      console.log(`Verified tags for '${storeId4}' before removing last: ${JSON.stringify(store4Doc!.tags)}`);

      // Query for the tag before removal
      console.log(`Action: _getStoresByTag({ tag: '${tagOne}' }) before removal`);
      let queryResultBefore = await taggingConcept._getStoresByTag({ tag: tagOne });
      assertEquals(queryResultBefore, { storeIds: [storeId4] }, `Expected storeId4 for tag '${tagOne}' before removal`);
      console.log(`Output for '${tagOne}' before removal: ${JSON.stringify(queryResultBefore)}`);

      // Remove the last tag
      console.log(`Action: removeTag({ storeId: '${storeId4}', tag: '${tagOne}' })`);
      let removeResult = await taggingConcept.removeTag({ storeId: storeId4, tag: tagOne });
      assertEquals(removeResult, {}, `Expected success for removing the last tag '${tagOne}' from '${storeId4}'`);
      console.log(`Output: ${JSON.stringify(removeResult)}`);

      // Verify the document is now deleted
      store4Doc = await taggingConcept["taggings"].findOne({ _id: storeId4 });
      assertEquals(store4Doc, null, `Document for storeId '${storeId4}' should be deleted after removing its last tag`);
      console.log(`Verified that document for '${storeId4}' is gone.`);

      // Query for the tag after removal
      console.log(`Action: _getStoresByTag({ tag: '${tagOne}' }) after removal`);
      let queryResultAfter = await taggingConcept._getStoresByTag({ tag: tagOne });
      assertEquals(queryResultAfter, { storeIds: [] }, `Expected no storeIds for tag '${tagOne}' after removal`);
      console.log(`Output for '${tagOne}' after removal: ${JSON.stringify(queryResultAfter)}`);

      console.log(`--- End 'Remove Last Tag' test ---`);
    });
  } finally {
    console.log("Closing MongoDB client after all Tagging Concept Deno.test steps.");
    await client.close(); // Close the client opened at the start of this Deno.test block
  }
});
```
