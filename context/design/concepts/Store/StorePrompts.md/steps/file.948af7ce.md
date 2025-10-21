---
timestamp: 'Tue Oct 21 2025 05:03:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_050313.1f08c3b7.md]]'
content_id: 948af7ce86ae00d6204473a244f51b00d5acedee748a120601fa803d55beb54c
---

# file: src/Store/StoreConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { testDb } from "@utils/database.ts";
import StoreConcept from "./StoreConcept.ts";
import { MongoClient, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";

let db: Db | null = null;
let client: MongoClient | null = null;
let storeConcept: StoreConcept;

// Setup before all tests
Deno.test({
  name: "StoreConcept Setup",
  fn: async () => {
    [db, client] = await testDb(); // testDb automatically drops all collections in the test database
    storeConcept = new StoreConcept(db!);
    console.log("StoreConcept setup complete. Test database initialized and cleared.");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Teardown after all tests
Deno.test({
  name: "StoreConcept Teardown",
  fn: async () => {
    if (client) {
      await client.close();
      console.log("StoreConcept teardown complete. Database client closed.");
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test("Store Concept Tests", async (test) => {
  let storeId1: ID; // For "Big Box Store"
  let storeId_coffeeHouse1: ID; // For first "Coffee House"
  let storeId_coffeeHouse2: ID; // For second "Coffee House"
  let storeId_bookNook: ID; // For "Book Nook"
  let storeId_readingCorner: ID; // For "Reading Corner"
  let storeId_emptyFields: ID; // For store with empty name/address

  await test.step("Action: createStore - Operational Principle: Successfully create a unique store", async () => {
    const name = "Big Box Store";
    const address = "123 Main St";
    console.log(`Attempting to create store: Name="${name}", Address="${address}"`);
    const result = await storeConcept.createStore({ name, address });

    assertExists((result as { storeId: ID }).storeId, "Should return a storeId on success.");
    assertNotEquals((result as { storeId: ID }).storeId, "", "storeId should not be empty.");
    console.log(`Store created successfully: ${JSON.stringify(result)}`);

    storeId1 = (result as { storeId: ID }).storeId;
    // Verify it exists in the database using the public _getStore query
    const createdStore = await storeConcept._getStore({ storeId: storeId1 });
    assertExists((createdStore as { name: string }).name, "The created store should exist and be retrievable.");
    assertEquals((createdStore as { name: string }).name, name, "The store's name should match.");
    assertEquals((createdStore as { address: string }).address, address, "The store's address should match.");
  });

  await test.step("Action: createStore - Interesting Scenario 1: Attempt to create a duplicate store (same name and address)", async () => {
    const name = "Local Market";
    const address = "456 Oak Ave";

    // First, create the store successfully
    console.log(`Creating initial store for duplication test: Name="${name}", Address="${address}"`);
    const initialResult = await storeConcept.createStore({ name, address });
    assertExists((initialResult as { storeId: ID }).storeId, "Initial store creation should succeed.");
    console.log(`Initial store created: ${JSON.stringify(initialResult)}`);

    // Now, attempt to create it again
    console.log(`Attempting to create duplicate store: Name="${name}", Address="${address}"`);
    const duplicateResult = await storeConcept.createStore({ name, address });

    assertExists((duplicateResult as { error: string }).error, "Should return an error for duplicate store.");
    assertEquals(
      (duplicateResult as { error: string }).error,
      "A store with the same name and address already exists.",
      "Error message should indicate duplicate store.",
    );
    console.log(`Duplicate store creation failed as expected: ${JSON.stringify(duplicateResult)}`);
  });

  await test.step("Action: createStore - Interesting Scenario 2: Create multiple stores with the same name but different addresses", async () => {
    const commonName = "Coffee House";
    const address1 = "789 Pine Ln";
    const address2 = "101 Elm Blvd";

    console.log(`Creating first store with common name: Name="${commonName}", Address="${address1}"`);
    const result1 = await storeConcept.createStore({ name: commonName, address: address1 });
    assertExists((result1 as { storeId: ID }).storeId, "First store creation should succeed.");
    console.log(`First store created: ${JSON.stringify(result1)}`);
    storeId_coffeeHouse1 = (result1 as { storeId: ID }).storeId; // Save for later tests

    console.log(`Creating second store with common name: Name="${commonName}", Address="${address2}"`);
    const result2 = await storeConcept.createStore({ name: commonName, address: address2 });
    assertExists((result2 as { storeId: ID }).storeId, "Second store creation should succeed.");
    console.log(`Second store created: ${JSON.stringify(result2)}`);
    storeId_coffeeHouse2 = (result2 as { storeId: ID }).storeId; // Save for later tests

    assertNotEquals(storeId_coffeeHouse1, storeId_coffeeHouse2, "Store IDs should be different.");

    const storeFromDb1 = await storeConcept._getStore({ storeId: storeId_coffeeHouse1 }) as { name: string, address: string };
    const storeFromDb2 = await storeConcept._getStore({ storeId: storeId_coffeeHouse2 }) as { name: string, address: string };
    assertExists(storeFromDb1);
    assertExists(storeFromDb2);
    assertEquals(storeFromDb1.name, commonName);
    assertEquals(storeFromDb2.name, commonName);
    assertNotEquals(storeFromDb1.address, storeFromDb2.address);
  });

  await test.step("Action: createStore - Interesting Scenario 3: Create multiple stores with the same address but different names", async () => {
    const commonAddress = "202 Birch Rd";
    const name1 = "Book Nook";
    const name2 = "Reading Corner";

    console.log(`Creating first store with common address: Name="${name1}", Address="${commonAddress}"`);
    const result1 = await storeConcept.createStore({ name: name1, address: commonAddress });
    assertExists((result1 as { storeId: ID }).storeId, "First store creation should succeed.");
    console.log(`First store created: ${JSON.stringify(result1)}`);
    storeId_bookNook = (result1 as { storeId: ID }).storeId; // Capture ID

    console.log(`Creating second store with common address: Name="${name2}", Address="${commonAddress}"`);
    const result2 = await storeConcept.createStore({ name: name2, address: commonAddress });
    assertExists((result2 as { storeId: ID }).storeId, "Second store creation should succeed.");
    console.log(`Second store created: ${JSON.stringify(result2)}`);
    storeId_readingCorner = (result2 as { storeId: ID }).storeId; // Capture ID

    assertNotEquals(storeId_bookNook, storeId_readingCorner, "Store IDs should be different.");

    const storeFromDb1 = await storeConcept._getStore({ storeId: storeId_bookNook }) as { name: string, address: string };
    const storeFromDb2 = await storeConcept._getStore({ storeId: storeId_readingCorner }) as { name: string, address: string };
    assertExists(storeFromDb1);
    assertExists(storeFromDb2);
    assertNotEquals(storeFromDb1.name, storeFromDb2.name);
    assertEquals(storeFromDb1.address, commonAddress);
    assertEquals(storeFromDb2.address, commonAddress);
  });

  await test.step("Action: createStore - Interesting Scenario 4: Create a store with empty name and address", async () => {
    const name = "";
    const address = "";
    console.log(`Attempting to create store with empty name and address: Name="${name}", Address="${address}"`);
    const result = await storeConcept.createStore({ name, address });

    assertExists((result as { storeId: ID }).storeId, "Should succeed in creating a store with empty name and address if no such store exists.");
    assertNotEquals((result as { storeId: ID }).storeId, "", "storeId should not be empty.");
    console.log(`Store with empty name and address created successfully: ${JSON.stringify(result)}`);

    storeId_emptyFields = (result as { storeId: ID }).storeId; // Save for later tests
    const createdStore = await storeConcept._getStore({ storeId: storeId_emptyFields }) as { name: string, address: string };
    assertExists(createdStore);
    assertEquals(createdStore.name, name);
    assertEquals(createdStore.address, address);
  });

  await test.step("Action: createStore - Interesting Scenario 5: Attempt to create a duplicate of an empty-named/addressed store", async () => {
    const name = "";
    const address = "";

    // This scenario assumes the previous test created this store, so we're testing duplication.
    console.log(`Attempting to create duplicate of empty-named/addressed store: Name="${name}", Address="${address}"`);
    const duplicateResult = await storeConcept.createStore({ name, address });

    assertExists((duplicateResult as { error: string }).error, "Should return an error for duplicate empty store.");
    assertEquals(
      (duplicateResult as { error: string }).error,
      "A store with the same name and address already exists.",
      "Error message should indicate duplicate store for empty fields.",
    );
    console.log(`Duplicate empty store creation failed as expected: ${JSON.stringify(duplicateResult)}`);
  });

  await test.step("Action: _getStore - Operational Principle: Retrieve an existing store by ID", async () => {
    console.log(`Attempting to retrieve store with ID: ${storeId1}`);
    const result = await storeConcept._getStore({ storeId: storeId1 });

    assertExists((result as { name: string }).name, "Should return store details on success.");
    assertEquals((result as { name: string }).name, "Big Box Store", "Retrieved store name should match.");
    assertEquals((result as { address: string }).address, "123 Main St", "Retrieved store address should match.");
    console.log(`Store retrieved successfully: ${JSON.stringify(result)}`);
  });

  await test.step("Action: _getStore - Interesting Scenario: Attempt to retrieve a non-existent store", async () => {
    const nonExistentId = "non_existent_id" as ID;
    console.log(`Attempting to retrieve non-existent store with ID: ${nonExistentId}`);
    const result = await storeConcept._getStore({ storeId: nonExistentId });

    assertExists((result as { error: string }).error, "Should return an error for non-existent store.");
    assertEquals(
      (result as { error: string }).error,
      `Store with ID '${nonExistentId}' not found.`,
      "Error message should indicate store not found.",
    );
    console.log(`Retrieval of non-existent store failed as expected: ${JSON.stringify(result)}`);
  });

  await test.step("Action: deleteStore - Operational Principle: Delete an existing store by ID", async () => {
    console.log(`Attempting to delete store with ID: ${storeId1}`);
    const result = await storeConcept.deleteStore({ storeId: storeId1 });

    assertEquals(result, {}, "Should return an empty object on successful deletion.");
    console.log(`Store deleted successfully: ${JSON.stringify(result)}`);

    // Verify it's no longer retrievable
    const checkDeleted = await storeConcept._getStore({ storeId: storeId1 });
    assertExists((checkDeleted as { error: string }).error, "Deleted store should no longer be retrievable.");
  });

  await test.step("Action: deleteStore - Interesting Scenario: Attempt to delete a non-existent store", async () => {
    const nonExistentId = "another_non_existent_id" as ID;
    console.log(`Attempting to delete non-existent store with ID: ${nonExistentId}`);
    const result = await storeConcept.deleteStore({ storeId: nonExistentId });

    assertExists((result as { error: string }).error, "Should return an error for non-existent store deletion.");
    assertEquals(
      (result as { error: string }).error,
      `Store with ID '${nonExistentId}' not found.`,
      "Error message should indicate store not found for deletion.",
    );
    console.log(`Deletion of non-existent store failed as expected: ${JSON.stringify(result)}`);
  });

  await test.step("Action: _getStoresByName - Operational Principle: Retrieve stores by an existing name", async () => {
    const commonName = "Coffee House"; // Used in scenario 2
    console.log(`Attempting to get stores by name: "${commonName}"`);
    const result = await storeConcept._getStoresByName({ name: commonName });

    assertEquals(result instanceof Set, true, "Result should be a Set.");
    assertEquals(result.size, 2, "Should return 2 stores with the name 'Coffee House'.");
    assertArrayIncludes(Array.from(result), [storeId_coffeeHouse1, storeId_coffeeHouse2], "The set should contain the correct store IDs.");
    console.log(`Stores retrieved by name "${commonName}": ${JSON.stringify(Array.from(result))}`);
  });

  await test.step("Action: _getStoresByName - Interesting Scenario: Retrieve stores by a non-existent name", async () => {
    const nonExistentName = "Non-existent Cafe";
    console.log(`Attempting to get stores by name: "${nonExistentName}"`);
    const result = await storeConcept._getStoresByName({ name: nonExistentName });

    assertEquals(result instanceof Set, true, "Result should be a Set.");
    assertEquals(result.size, 0, "Should return an empty set for a non-existent name.");
    console.log(`Stores retrieved by non-existent name "${nonExistentName}": ${JSON.stringify(Array.from(result))}`);
  });

  await test.step("Action: _getStoresByAddress - Operational Principle: Retrieve stores by an existing address", async () => {
    const commonAddress = "202 Birch Rd"; // Used in scenario 3
    console.log(`Attempting to get stores by address: "${commonAddress}"`);
    const result = await storeConcept._getStoresByAddress({ address: commonAddress });

    assertEquals(result instanceof Set, true, "Result should be a Set.");
    assertEquals(result.size, 2, "Should return 2 stores with the address '202 Birch Rd'.");
    assertArrayIncludes(Array.from(result), [storeId_bookNook, storeId_readingCorner], "The set should contain the correct store IDs.");
    console.log(`Stores retrieved by address "${commonAddress}": ${JSON.stringify(Array.from(result))}`);
  });

  await test.step("Action: _getStoresByAddress - Interesting Scenario: Retrieve stores by a non-existent address", async () => {
    const nonExistentAddress = "999 Fantasy Rd";
    console.log(`Attempting to get stores by address: "${nonExistentAddress}"`);
    const result = await storeConcept._getStoresByAddress({ address: nonExistentAddress });

    assertEquals(result instanceof Set, true, "Result should be a Set.");
    assertEquals(result.size, 0, "Should return an empty set for a non-existent address.");
    console.log(`Stores retrieved by non-existent address "${nonExistentAddress}": ${JSON.stringify(Array.from(result))}`);
  });
});
```
