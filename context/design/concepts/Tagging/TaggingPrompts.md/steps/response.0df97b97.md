---
timestamp: 'Tue Oct 21 2025 05:31:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_053130.8b9a611b.md]]'
content_id: 0df97b97a6566434d66aaa18e40ca88018c8b270d8c0e966793c146240dc8b03
---

# response:

```typescript
// file: src/Tagging/TaggingConcept.test.ts
import { assert, assertEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TaggingConcept from "./TaggingConcept.ts";
import { ID } from "@utils/types.ts";
import { MongoClient } from "npm:mongodb"; // Import MongoClient for closing the connection

Deno.test("Tagging Concept - addTag Action Tests", async (t) => {
  let taggingConcept: TaggingConcept;
  let client: MongoClient; // Declare client to ensure it's closed

  // Setup: Initialize a fresh test database and TaggingConcept instance once for all steps
  // testDb() internally drops all collections for a clean slate.
  const [db, mongoClient] = await testDb();
  taggingConcept = new TaggingConcept(db);
  client = mongoClient;

  // Define some unique store IDs for testing scenarios
  const storeId1 = freshID() as ID;
  const storeId2 = freshID() as ID;
  const storeId3 = freshID() as ID; // For testing upsert behavior on a new ID

  // Cleanup: Close the MongoDB client after all tests in this suite are done
  t.afterAll(async () => {
    console.log("Closing MongoDB client after all Tagging.addTag tests.");
    await client.close();
  });

  await t.step("Operational Principle: Successfully add multiple unique tags to a store", async () => {
    console.log(`--- Running 'Operational Principle' test for storeId: ${storeId1} ---`);

    // 1. Add first tag
    const tag1 = "Electronics";
    console.log(`Calling addTag({ storeId: '${storeId1}', tag: '${tag1}' })`);
    const result1 = await taggingConcept.addTag({ storeId: storeId1, tag: tag1 });
    assertEquals(result1, {}, `Expected success for adding '${tag1}' to '${storeId1}'`);
    console.log(`Result: ${JSON.stringify(result1)}`);

    // 2. Add second unique tag
    const tag2 = "Gadgets";
    console.log(`Calling addTag({ storeId: '${storeId1}', tag: '${tag2}' })`);
    const result2 = await taggingConcept.addTag({ storeId: storeId1, tag: tag2 });
    assertEquals(result2, {}, `Expected success for adding '${tag2}' to '${storeId1}'`);
    console.log(`Result: ${JSON.stringify(result2)}`);

    // Verification: Directly query the collection to ensure state reflects additions
    // In a real application, a 'getTagsForStore' query action would be used here.
    const store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should exist`);
    assertArrayIncludes(store1Doc!.tags, [tag1, tag2], `Store '${storeId1}' should have tags '${tag1}' and '${tag2}'`);
    assertEquals(store1Doc!.tags.length, 2, `Store '${storeId1}' should have exactly 2 tags`);
    console.log(`Verified tags for '${storeId1}': ${JSON.stringify(store1Doc!.tags)}`);

    console.log(`--- End 'Operational Principle' test ---`);
  });

  await t.step("Scenario 1: Add the same tag multiple times to the same store (idempotency)", async () => {
    console.log(`--- Running 'Scenario 1' test for storeId: ${storeId1} ---`);

    const existingTag = "Electronics"; // This tag was added in the previous step
    console.log(`Calling addTag({ storeId: '${storeId1}', tag: '${existingTag}' }) for the first time in this scenario`);
    const result1 = await taggingConcept.addTag({ storeId: storeId1, tag: existingTag });
    assertEquals(result1, {}, `Expected success for re-adding existing tag '${existingTag}'`);
    console.log(`Result: ${JSON.stringify(result1)}`);

    console.log(`Calling addTag({ storeId: '${storeId1}', tag: '${existingTag}' }) for the second time`);
    const result2 = await taggingConcept.addTag({ storeId: storeId1, tag: existingTag });
    assertEquals(result2, {}, `Expected success for re-adding existing tag '${existingTag}' again`);
    console.log(`Result: ${JSON.stringify(result2)}`);

    // Verification: Ensure the tag count hasn't increased due to duplicate additions
    const store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should still exist`);
    assertArrayIncludes(store1Doc!.tags, ["Electronics", "Gadgets"], `Tags for '${storeId1}' should remain unchanged`);
    assertEquals(store1Doc!.tags.length, 2, `Store '${storeId1}' should still have exactly 2 tags (no duplicates)`);
    console.log(`Verified tags for '${storeId1}': ${JSON.stringify(store1Doc!.tags)}`);

    console.log(`--- End 'Scenario 1' test ---`);
  });

  await t.step("Scenario 2: Add tag to a storeId that doesn't yet have any tags (new document creation)", async () => {
    console.log(`--- Running 'Scenario 2' test for storeId: ${storeId2} ---`);

    // Ensure storeId2 has no prior tagging documents from other tests (testDb() handles global cleanup)
    const initialDoc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assertEquals(initialDoc, null, `Document for storeId '${storeId2}' should not exist initially`);

    const newTag = "Books";
    console.log(`Calling addTag({ storeId: '${storeId2}', tag: '${newTag}' }) for a new storeId`);
    const result = await taggingConcept.addTag({ storeId: storeId2, tag: newTag });
    assertEquals(result, {}, `Expected success for adding '${newTag}' to new storeId '${storeId2}'`);
    console.log(`Result: ${JSON.stringify(result)}`);

    // Verification: Check if a new document was created and the tag was added
    const store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, `Document for new storeId '${storeId2}' should have been created`);
    assertArrayIncludes(store2Doc!.tags, [newTag], `New store '${storeId2}' should have tag '${newTag}'`);
    assertEquals(store2Doc!.tags.length, 1, `New store '${storeId2}' should have exactly 1 tag`);
    console.log(`Verified tags for '${storeId2}': ${JSON.stringify(store2Doc!.tags)}`);

    console.log(`--- End 'Scenario 2' test ---`);
  });

  await t.step("Scenario 3: Add multiple unique tags to another storeId (building on previous state)", async () => {
    console.log(`--- Running 'Scenario 3' test for storeId: ${storeId2} ---`);

    // storeId2 already has "Books" from Scenario 2
    const tag3 = "Fiction";
    console.log(`Calling addTag({ storeId: '${storeId2}', tag: '${tag3}' })`);
    const result1 = await taggingConcept.addTag({ storeId: storeId2, tag: tag3 });
    assertEquals(result1, {}, `Expected success for adding '${tag3}' to '${storeId2}'`);
    console.log(`Result: ${JSON.stringify(result1)}`);

    const tag4 = "Non-Fiction";
    console.log(`Calling addTag({ storeId: '${storeId2}', tag: '${tag4}' })`);
    const result2 = await taggingConcept.addTag({ storeId: storeId2, tag: tag4 });
    assertEquals(result2, {}, `Expected success for adding '${tag4}' to '${storeId2}'`);
    console.log(`Result: ${JSON.stringify(result2)}`);

    // Verification: Ensure all tags are present
    const store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, `Document for storeId '${storeId2}' should exist`);
    assertArrayIncludes(store2Doc!.tags, ["Books", tag3, tag4], `Store '${storeId2}' should have 'Books', '${tag3}', and '${tag4}' tags`);
    assertEquals(store2Doc!.tags.length, 3, `Store '${storeId2}' should have exactly 3 tags`);
    console.log(`Verified tags for '${storeId2}': ${JSON.stringify(store2Doc!.tags)}`);

    console.log(`--- End 'Scenario 3' test ---`);
  });

  await t.step("Scenario 4: Add tags with various string formats (empty string, special characters)", async () => {
    console.log(`--- Running 'Scenario 4' test for storeId: ${storeId3} ---`);

    const tagEmpty = "";
    console.log(`Calling addTag({ storeId: '${storeId3}', tag: '${tagEmpty}' }) (empty string)`);
    const resultEmpty = await taggingConcept.addTag({ storeId: storeId3, tag: tagEmpty });
    assertEquals(resultEmpty, {}, `Expected success for adding an empty string tag to '${storeId3}'`);
    console.log(`Result: ${JSON.stringify(resultEmpty)}`);

    const tagSpecialChars = "Food & Drink (Vegan)";
    console.log(`Calling addTag({ storeId: '${storeId3}', tag: '${tagSpecialChars}' }) (special characters)`);
    const resultSpecial = await taggingConcept.addTag({ storeId: storeId3, tag: tagSpecialChars });
    assertEquals(resultSpecial, {}, `Expected success for adding tag with special characters to '${storeId3}'`);
    console.log(`Result: ${JSON.stringify(resultSpecial)}`);

    const store3Doc = await taggingConcept["taggings"].findOne({ _id: storeId3 });
    assert(store3Doc, `Document for storeId '${storeId3}' should exist`);
    assertArrayIncludes(store3Doc!.tags, [tagEmpty, tagSpecialChars], `Store '${storeId3}' should contain both tags`);
    assertEquals(store3Doc!.tags.length, 2, `Store '${storeId3}' should have exactly 2 tags`);
    console.log(`Verified tags for '${storeId3}': ${JSON.stringify(store3Doc!.tags)}`);

    console.log(`--- End 'Scenario 4' test ---`);
  });
});
```
