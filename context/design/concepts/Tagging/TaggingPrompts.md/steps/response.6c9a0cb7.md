---
timestamp: 'Tue Oct 21 2025 05:37:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_053726.70674569.md]]'
content_id: 6c9a0cb7d165f2c35e76ff78bae3dc1026612f8ac25eff6934593d29a3823083
---

# response:

```typescript
// file: src/Tagging/TaggingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; 

// Declare collection prefix, use concept name
const PREFIX = "Tagging" + ".";

// storeId is an external ID, so it's treated polymorphically by Tagging.
// This means the Tagging concept does not make assumptions about the StoreId's internal structure
// or directly interact with the Store concept.
type StoreId = ID; 
// Tags themselves are just strings in the spec, not separate entities.
type Tag = string;

/**
 * Each `Tagging` record associates tags with a store:
 * `storeId`: String (references a `Store`) - used as the document's _id
 * `tags`: Set<String> (a collection of user-defined tags)
 */
interface TaggingDoc {
  _id: StoreId; // The unique identifier for the store this document tags
  tags: Tag[]; // An array of tags associated with the store
}

export default class TaggingConcept {
  private taggings: Collection<TaggingDoc>;

  constructor(private readonly db: Db) {
    // Initialize the MongoDB collection for tagging records
    this.taggings = this.db.collection(PREFIX + "taggings");
  }

  /**
   * addTag(storeId: String, tag: String)
   *
   * @requires The `storeId` must exist (conceptually, in the `Store` concept).
   *           The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.
   * @effects Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
   *          If no `Tagging` record exists for the `storeId`, a new one is created.
   * @returns {} on success, { error } on failure.
   */
  async addTag({ storeId, tag }: { storeId: StoreId; tag: Tag }): Promise<Empty | { error: string }> {
    try {
      // Find and update the existing document for the given storeId.
      // $addToSet ensures that 'tag' is only added if it's not already present in the 'tags' array.
      // upsert: true means if a document with _id: storeId doesn't exist, a new one will be created.
      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $addToSet: { tags: tag } },
        { upsert: true },
      );

      // Check if the database operation was acknowledged.
      if (!result.acknowledged) {
        return { error: "Database operation for addTag was not acknowledged." };
      }

      return {}; // Successfully added the tag or ensured its presence
    } catch (e: any) {
      // Log the error for debugging and return a user-friendly error message.
      console.error(`Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`, e);
      return { error: `Failed to add tag: ${e.message}` };
    }
  }

  /**
   * removeTag(storeId: String, tag: String)
   *
   * @requires The `storeId` must exist (i.e., there is a tagging record for it).
   *           The `tag` must be present in the store's tag set.
   * @effects Removes the specified `tag` from the `storeId`'s set of tags.
   * @returns {} on success, { error } on failure.
   */
  async removeTag({ storeId, tag }: { storeId: StoreId; tag: Tag }): Promise<Empty | { error: string }> {
    try {
      // First, check if the storeId exists and contains the tag, as per 'requires' conditions.
      const existingDoc = await this.taggings.findOne({ _id: storeId });

      if (!existingDoc) {
        return { error: `Store with ID '${storeId}' not found for tagging.` };
      }

      if (!existingDoc.tags.includes(tag)) {
        return { error: `Tag '${tag}' not found for store ID '${storeId}'.` };
      }

      // If requirements are met, proceed to remove the tag using $pull.
      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $pull: { tags: tag } },
      );

      if (!result.acknowledged) {
        return { error: "Database operation for removeTag was not acknowledged." };
      }
      
      // If after removing the tag, the tags array becomes empty, optionally remove the document itself.
      // This keeps the collection clean from empty tagging records.
      if (result.modifiedCount > 0) { // Only check if a tag was actually removed
        const updatedDoc = await this.taggings.findOne({ _id: storeId });
        if (updatedDoc && updatedDoc.tags.length === 0) {
          await this.taggings.deleteOne({ _id: storeId });
        }
      }

      return {}; // Successfully removed the tag
    } catch (e: any) {
      console.error(`Error in Tagging.removeTag for storeId '${storeId}' and tag '${tag}':`, e);
      return { error: `Failed to remove tag: ${e.message}` };
    }
  }

  // The 'getStoresByTag' action will be implemented in a subsequent step.
}
```

```typescript
// file: src/Tagging/TaggingConcept.test.ts
import { assert, assertEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TaggingConcept from "./TaggingConcept.ts";
import { ID } from "@utils/types.ts";
import { MongoClient } from "npm:mongodb"; // Import MongoClient for closing the connection

Deno.test("Tagging Concept - addTag and removeTag Action Tests", async (t) => {
  let taggingConcept: TaggingConcept;
  let client: MongoClient; // Declare client to ensure it's closed

  // Setup: Initialize a fresh test database and TaggingConcept instance once for all steps
  // testDb() internally drops all collections for a clean slate, providing isolated tests.
  const [db, mongoClient] = await testDb();
  taggingConcept = new TaggingConcept(db);
  client = mongoClient;

  // Define some unique store IDs for testing scenarios
  const storeId1 = freshID() as ID;
  const storeId2 = freshID() as ID;
  const storeId3 = freshID() as ID;

  // Cleanup: Close the MongoDB client after all tests in this suite are done
  t.afterAll(async () => {
    console.log("Closing MongoDB client after all Tagging Concept tests.");
    await client.close();
  });

  await t.step("Operational Principle: Successfully add and then remove multiple unique tags for a store", async () => {
    console.log(`--- Running 'Operational Principle' test for addTag and removeTag ---`);

    // --- Part 1: Adding Tags (similar to previous operational principle for addTag) ---
    const tagA = "Electronics";
    const tagB = "Gadgets";
    const tagC = "NewArrivals";

    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagA}' })`);
    let result = await taggingConcept.addTag({ storeId: storeId1, tag: tagA });
    assertEquals(result, {}, `Expected success for adding '${tagA}' to new store '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagB}' })`);
    result = await taggingConcept.addTag({ storeId: storeId1, tag: tagB });
    assertEquals(result, {}, `Expected success for adding '${tagB}' to existing store '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);
    
    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagC}' })`);
    result = await taggingConcept.addTag({ storeId: storeId1, tag: tagC });
    assertEquals(result, {}, `Expected success for adding '${tagC}' to existing store '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification after adding
    let store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should exist after adding tags`);
    assertArrayIncludes(store1Doc!.tags, [tagA, tagB, tagC], `Store '${storeId1}' should have all three tags`);
    assertEquals(store1Doc!.tags.length, 3, `Store '${storeId1}' should have exactly 3 tags`);
    console.log(`Verified tags for '${storeId1}' after adds: ${JSON.stringify(store1Doc!.tags)}`);

    // --- Part 2: Removing Tags ---
    console.log(`Action: removeTag({ storeId: '${storeId1}', tag: '${tagB}' })`);
    result = await taggingConcept.removeTag({ storeId: storeId1, tag: tagB });
    assertEquals(result, {}, `Expected success for removing '${tagB}' from '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification after first removal
    store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should still exist`);
    assertArrayIncludes(store1Doc!.tags, [tagA, tagC], `Store '${storeId1}' should have '${tagA}' and '${tagC}' after removing '${tagB}'`);
    assertEquals(store1Doc!.tags.length, 2, `Store '${storeId1}' should have exactly 2 tags after removing one`);
    console.log(`Verified tags for '${storeId1}' after removing '${tagB}': ${JSON.stringify(store1Doc!.tags)}`);

    console.log(`--- End 'Operational Principle' test ---`);
  });

  await t.step("Scenario 1: Idempotency of addTag and removeTag - Repeated operations", async () => {
    console.log(`--- Running 'Idempotency' test for addTag and removeTag ---`);

    // Use storeId2 for this scenario
    const tagX = "Fashion";
    const tagY = "Clothing";

    // Add tagX
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagX}' })`);
    let result = await taggingConcept.addTag({ storeId: storeId2, tag: tagX });
    assertEquals(result, {}, `Expected success for adding '${tagX}' to '${storeId2}'`);

    // Add tagY
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagY}' })`);
    result = await taggingConcept.addTag({ storeId: storeId2, tag: tagY });
    assertEquals(result, {}, `Expected success for adding '${tagY}' to '${storeId2}'`);

    // Re-add tagX (should have no effect on count)
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagX}' }) (again)`);
    result = await taggingConcept.addTag({ storeId: storeId2, tag: tagX });
    assertEquals(result, {}, `Expected success for re-adding '${tagX}' (idempotent)`);

    let store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, "Store 2 document should exist");
    assertEquals(store2Doc!.tags.length, 2, `Store '${storeId2}' should still have 2 tags`);
    assertArrayIncludes(store2Doc!.tags, [tagX, tagY], `Store '${storeId2}' should have '${tagX}' and '${tagY}'`);
    console.log(`Verified tags for '${storeId2}' after re-adding: ${JSON.stringify(store2Doc!.tags)}`);

    // Remove tagX
    console.log(`Action: removeTag({ storeId: '${storeId2}', tag: '${tagX}' })`);
    result = await taggingConcept.removeTag({ storeId: storeId2, tag: tagX });
    assertEquals(result, {}, `Expected success for removing '${tagX}'`);

    // Re-remove tagX (should return error as it's already gone)
    console.log(`Action: removeTag({ storeId: '${storeId2}', tag: '${tagX}' }) (again)`);
    result = await taggingConcept.removeTag({ storeId: storeId2, tag: tagX });
    assert(result.error, `Expected error for removing non-existent tag '${tagX}' from '${storeId2}'`);
    assertEquals(result.error, `Tag '${tagX}' not found for store ID '${storeId2}'.`);
    console.log(`Output: ${JSON.stringify(result)}`);

    store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, "Store 2 document should exist");
    assertEquals(store2Doc!.tags.length, 1, `Store '${storeId2}' should have 1 tag left`);
    assertArrayIncludes(store2Doc!.tags, [tagY], `Store '${storeId2}' should only have '${tagY}' left`);
    console.log(`Verified tags for '${storeId2}' after re-removing: ${JSON.stringify(store2Doc!.tags)}`);

    console.log(`--- End 'Idempotency' test ---`);
  });

  await t.step("Scenario 2: Edge Cases for removeTag - Non-existent store or tag", async () => {
    console.log(`--- Running 'Edge Cases' test for removeTag ---`);

    const nonExistentStoreId = freshID() as ID;
    const existingTag = "Books"; // Example tag
    const nonExistentTag = "Nonexistent";

    // Try to remove a tag from a store that has never been tagged
    console.log(`Action: removeTag({ storeId: '${nonExistentStoreId}', tag: '${existingTag}' }) from non-existent store`);
    let result = await taggingConcept.removeTag({ storeId: nonExistentStoreId, tag: existingTag });
    assert(result.error, `Expected error when removing from non-existent store '${nonExistentStoreId}'`);
    assertEquals(result.error, `Store with ID '${nonExistentStoreId}' not found for tagging.`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Add a tag to storeId3 to set up for a valid store, but non-existent tag scenario
    console.log(`Action: addTag({ storeId: '${storeId3}', tag: '${existingTag}' })`);
    await taggingConcept.addTag({ storeId: storeId3, tag: existingTag });
    let store3Doc = await taggingConcept["taggings"].findOne({ _id: storeId3 });
    assert(store3Doc, "Store 3 document should exist for setup");
    assertArrayIncludes(store3Doc!.tags, [existingTag], "Store 3 should have the existing tag");

    // Try to remove a tag that doesn't exist for an existing store
    console.log(`Action: removeTag({ storeId: '${storeId3}', tag: '${nonExistentTag}' }) from existing store`);
    result = await taggingConcept.removeTag({ storeId: storeId3, tag: nonExistentTag });
    assert(result.error, `Expected error when removing non-existent tag '${nonExistentTag}' from existing store '${storeId3}'`);
    assertEquals(result.error, `Tag '${nonExistentTag}' not found for store ID '${storeId3}'.`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verify state for storeId3 is unchanged
    store3Doc = await taggingConcept["taggings"].findOne({ _id: storeId3 });
    assert(store3Doc, "Store 3 document should still exist");
    assertEquals(store3Doc!.tags.length, 1, `Store '${storeId3}' should still have 1 tag`);
    assertArrayIncludes(store3Doc!.tags, [existingTag], `Store '${storeId3}' should still have '${existingTag}'`);

    console.log(`--- End 'Edge Cases' test ---`);
  });

  await t.step("Scenario 3: Remove last tag from a store (should delete the document)", async () => {
    console.log(`--- Running 'Remove Last Tag' test for removeTag ---`);

    const storeId4 = freshID() as ID;
    const tagOne = "SoloTag";

    // Add the only tag
    console.log(`Action: addTag({ storeId: '${storeId4}', tag: '${tagOne}' })`);
    let result = await taggingConcept.addTag({ storeId: storeId4, tag: tagOne });
    assertEquals(result, {}, `Expected success for adding '${tagOne}' to new store '${storeId4}'`);

    // Verify document exists with the tag
    let store4Doc = await taggingConcept["taggings"].findOne({ _id: storeId4 });
    assert(store4Doc, `Document for storeId '${storeId4}' should exist`);
    assertEquals(store4Doc!.tags.length, 1, `Store '${storeId4}' should have 1 tag`);
    console.log(`Verified tags for '${storeId4}' before removing last: ${JSON.stringify(store4Doc!.tags)}`);

    // Remove the last tag
    console.log(`Action: removeTag({ storeId: '${storeId4}', tag: '${tagOne}' })`);
    result = await taggingConcept.removeTag({ storeId: storeId4, tag: tagOne });
    assertEquals(result, {}, `Expected success for removing the last tag '${tagOne}' from '${storeId4}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verify the document is now deleted
    store4Doc = await taggingConcept["taggings"].findOne({ _id: storeId4 });
    assertEquals(store4Doc, null, `Document for storeId '${storeId4}' should be deleted after removing its last tag`);
    console.log(`Verified that document for '${storeId4}' is gone.`);

    console.log(`--- End 'Remove Last Tag' test ---`);
  });
});
```
