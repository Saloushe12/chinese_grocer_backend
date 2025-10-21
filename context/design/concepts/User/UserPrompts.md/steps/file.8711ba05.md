---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 8711ba051e13582cb0667dbdd8135f625e4fd2f7f45bc9a2f132d2f35bad7833
---

# file: src/concepts/Store/StoreConcept.test.ts

```typescript
import { Deno } from "@deno/test/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MongoClient, Db } from "mongodb";
import StoreConcept from "./StoreConcept.ts";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";

// --- Global variables for database and concept instance ---
let db: Db;
let client: MongoClient;
let storeConcept: StoreConcept;

// Main test suite for Store Concept actions
Deno.test("Store Concept Actions (createStore)", async (t) => {
  // --- Setup for the entire test suite execution ---
  [db, client] = await testDb(); // Connects to test DB and drops all collections initially
  storeConcept = new StoreConcept(db);
  console.log("--- Initialized DB and StoreConcept for the 'createStore' test suite ---");

  // --- Tests for createStore ---

  await t.step("createStore: should successfully create a new store", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("Store.stores").deleteMany({});
    console.log("--- Cleared 'Store.stores' collection for 'create store success' test ---");

    const name = "The Best Chinese Grocer";
    const address = "123 Main St, Anytown, USA";

    console.log(`Action: createStore(name: '${name}', address: '${address}')`);
    const result = await storeConcept.createStore({ name, address });
    console.log("Output:", result);

    assertExists((result as { storeId: ID }).storeId, "Expected a storeId on successful store creation.");
    const storeId = (result as { storeId: ID }).storeId;

    // Verification: Check if the store exists in the database
    const store = await (db.collection("Store.stores")).findOne({ _id: storeId });
    assertExists(store, `Expected store with storeId '${storeId}' to exist.`);
    assertEquals(store?.name, name, "Store name should match.");
    assertEquals(store?.address, address, "Store address should match.");
    console.log(`Verification: Store '${name}' with ID '${storeId}' confirmed in DB.`);
  });

  await t.step("createStore: should return an error if a store with the same name and address already exists", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("Store.stores").deleteMany({});
    console.log("--- Cleared 'Store.stores' collection for 'create store duplicate' test ---");

    const name = "Duplicate Grocer";
    const address = "456 Oak Ave, Anytown, USA";

    // Pre-condition: Create the first store successfully
    const initialResult = await storeConcept.createStore({ name, address });
    assertExists((initialResult as { storeId: ID }).storeId, "Pre-condition: Initial store creation must succeed.");
    console.log(`Pre-condition: Registered store '${name}' with ID '${(initialResult as { storeId: ID }).storeId}'`);

    // Action: Attempt to create another store with the exact same name and address
    console.log(`Action: createStore(name: '${name}', address: '${address}') (duplicate attempt)`);
    const result = await storeConcept.createStore({ name, address });
    console.log("Output:", result);

    // Assertions
    assertExists((result as { error: string }).error, "Expected an error for duplicate store.");
    assertEquals(
      (result as { error: string }).error,
      `Store with name '${name}' and address '${address}' already exists.`,
      "Error message should indicate duplicate store.",
    );
    console.log(`Verification: Correctly received error for duplicate store creation.`);
  });

  await t.step("createStore: should create a new store if only name or address is different (not both)", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("Store.stores").deleteMany({});
    console.log("--- Cleared 'Store.stores' collection for 'create store similar but not duplicate' test ---");

    const originalName = "Unique Grocer";
    const originalAddress = "789 Pine St, Anytown, USA";
    const similarName = "Unique Grocer Two"; // Different name
    const similarAddress = "101 Maple Ave, Anytown, USA"; // Different address

    // Pre-condition: Create the first store
    const initialResult = await storeConcept.createStore({ name: originalName, address: originalAddress });
    assertExists((initialResult as { storeId: ID }).storeId, "Pre-condition: Initial store creation must succeed.");
    console.log(`Pre-condition: Registered store '${originalName}' with ID '${(initialResult as { storeId: ID }).storeId}'`);

    // Scenario 1: Same name, different address
    const newAddress1 = "New Address 789 Pine St, Anytown, USA";
    console.log(`Action: createStore(name: '${originalName}', address: '${newAddress1}') (same name, diff address)`);
    const result1 = await storeConcept.createStore({ name: originalName, address: newAddress1 });
    console.log("Output 1:", result1);
    assertExists((result1 as { storeId: ID }).storeId, "Expected success for same name, different address.");
    console.log(`Verification 1: Store created with ID '${(result1 as { storeId: ID }).storeId}'.`);

    // Scenario 2: Different name, same address
    const newName2 = "Another Unique Grocer";
    console.log(`Action: createStore(name: '${newName2}', address: '${originalAddress}') (diff name, same address)`);
    const result2 = await storeConcept.createStore({ name: newName2, address: originalAddress });
    console.log("Output 2:", result2);
    assertExists((result2 as { storeId: ID }).storeId, "Expected success for different name, same address.");
    console.log(`Verification 2: Store created with ID '${(result2 as { storeId: ID }).storeId}'.`);
  });


  // --- Teardown for the entire test suite ---
  await client.close();
  console.log("--- Closed MongoDB client after Store Concept Actions (createStore) tests ---");
});
```
