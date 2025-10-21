---
timestamp: 'Tue Oct 21 2025 05:33:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_053309.dce8e9f3.md]]'
content_id: 2872120f6d7d5b51ca5cb4c92adbea0d8beb3e17ab33e7c9e9cb873ff56da2b2
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
  // testDb() internally drops all collections for a clean slate, providing isolated tests.
  const [db, mongoClient] = await testDb();
  taggingConcept = new TaggingConcept(db);
  client = mongoClient;

  // Define some unique store IDs for testing scenarios
  const storeId1 = freshID() as ID;
  const storeId2 = freshID() as ID;

  // Cleanup: Close the MongoDB client after all tests in this suite are done
  t.afterAll(async () => {
    console.log("Closing MongoDB client after all Tagging Concept tests.");
    await client.close();
  });

  await t.step("Operational Principle: Successfully add multiple unique tags to new and existing stores", async () => {
    console.log(`--- Running 'Operational Principle' test for addTag ---`);

    // 1. Add tags to a brand new store (covers new document creation)
    const tagA = "Electronics";
    const tagB = "Gadgets";
    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagA}' })`);
    let result = await taggingConcept.addTag({ storeId: storeId1, tag: tagA });
    assertEquals(result, {}, `Expected success for adding '${tagA}' to new store '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${tagB}' })`);
    result = await taggingConcept.addTag({ storeId: storeId1, tag: tagB });
    assertEquals(result, {}, `Expected success for adding '${tagB}' to existing store '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification: Directly query the collection to ensure state reflects additions
    const store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should exist`);
    assertArrayIncludes(store1Doc!.tags, [tagA, tagB], `Store '${storeId1}' should have tags '${tagA}' and '${tagB}'`);
    assertEquals(store1Doc!.tags.length, 2, `Store '${storeId1}' should have exactly 2 tags`);
    console.log(`Verified tags for '${storeId1}': ${JSON.stringify(store1Doc!.tags)}`);

    // 2. Add a tag to another new store (to ensure separate store taggings work)
    const tagC = "Books";
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagC}' })`);
    result = await taggingConcept.addTag({ storeId: storeId2, tag: tagC });
    assertEquals(result, {}, `Expected success for adding '${tagC}' to new store '${storeId2}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification: State for storeId2
    const store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, `Document for storeId '${storeId2}' should exist`);
    assertArrayIncludes(store2Doc!.tags, [tagC], `Store '${storeId2}' should have tag '${tagC}'`);
    assertEquals(store2Doc!.tags.length, 1, `Store '${storeId2}' should have exactly 1 tag`);
    console.log(`Verified tags for '${storeId2}': ${JSON.stringify(store2Doc!.tags)}`);

    console.log(`--- End 'Operational Principle' test ---`);
  });

  await t.step("Scenario: Idempotency - Adding an existing tag multiple times should have no effect", async () => {
    console.log(`--- Running 'Idempotency' test for addTag ---`);

    const existingTag = "Electronics"; // This tag was added in the previous step to storeId1
    console.log(`Action: addTag({ storeId: '${storeId1}', tag: '${existingTag}' }) again`);
    const result = await taggingConcept.addTag({ storeId: storeId1, tag: existingTag });
    assertEquals(result, {}, `Expected success when re-adding existing tag '${existingTag}' to '${storeId1}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification: Ensure the tag count has not increased
    const store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId1 });
    assert(store1Doc, `Document for storeId '${storeId1}' should still exist`);
    assertArrayIncludes(store1Doc!.tags, ["Electronics", "Gadgets"], `Tags for '${storeId1}' should remain unchanged`);
    assertEquals(store1Doc!.tags.length, 2, `Store '${storeId1}' should still have exactly 2 tags (no duplicates)`);
    console.log(`Verified tags for '${storeId1}': ${JSON.stringify(store1Doc!.tags)}`);

    console.log(`--- End 'Idempotency' test ---`);
  });

  await t.step("Scenario: Edge Cases - Add tags with empty string and special characters", async () => {
    console.log(`--- Running 'Edge Cases' test for addTag ---`);

    // Use storeId2, which currently has one tag "Books" from the operational principle test
    const tagEmpty = "";
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagEmpty}' }) (empty string)`);
    let result = await taggingConcept.addTag({ storeId: storeId2, tag: tagEmpty });
    assertEquals(result, {}, `Expected success for adding an empty string tag to '${storeId2}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    const tagSpecialChars = "Food & Drink (Vegan)";
    console.log(`Action: addTag({ storeId: '${storeId2}', tag: '${tagSpecialChars}' }) (special characters)`);
    result = await taggingConcept.addTag({ storeId: storeId2, tag: tagSpecialChars });
    assertEquals(result, {}, `Expected success for adding tag with special characters to '${storeId2}'`);
    console.log(`Output: ${JSON.stringify(result)}`);

    // Verification: Ensure all tags are present for storeId2
    const store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId2 });
    assert(store2Doc, `Document for storeId '${storeId2}' should exist`);
    assertArrayIncludes(store2Doc!.tags, ["Books", tagEmpty, tagSpecialChars], `Store '${storeId2}' should contain 'Books', empty, and special char tags`);
    assertEquals(store2Doc!.tags.length, 3, `Store '${storeId2}' should have exactly 3 tags`);
    console.log(`Verified tags for '${storeId2}': ${JSON.stringify(store2Doc!.tags)}`);

    console.log(`--- End 'Edge Cases' test ---`);
  });
});
```
