running 1 test from ./src/concepts/Store/StoreConcept.test.ts
Store Concept Comprehensive Tests ...
------- output -------
StoreConcept Setup: Initializing test database...
StoreConcept setup complete. Test database initialized and cleared.
----- output end -----
  Operational Principle: Create, Retrieve, and Query Multiple Stores ...
------- output -------
Creating Store A: Name="Grocery Central", Address="100 Market St"
Store A created: {"storeId":"019a060b-e688-7372-8da9-f53b127dcd42"}
Creating Store B: Name="Grocery Express", Address="200 Market St"
Store B created: {"storeId":"019a060b-e7a8-77ad-b487-994262e93363"}
Creating Store C: Name="Hardware Hub", Address="100 Market St"
Store C created: {"storeId":"019a060b-e7cc-72a5-9629-e40c0747a6ca"}
Retrieving Store A by ID: 019a060b-e688-7372-8da9-f53b127dcd42
Store A retrieved: {"name":"Grocery Central","address":"100 Market St"}
Querying stores by name: "Grocery Central"
Stores found by name "Grocery Central": ["019a060b-e688-7372-8da9-f53b127dcd42"]
Querying stores by name: "Grocery Express"
Stores found by name "Grocery Express": ["019a060b-e7a8-77ad-b487-994262e93363"]
Querying stores by address: "100 Market St"
Stores found by address "100 Market St": ["019a060b-e688-7372-8da9-f53b127dcd42","019a060b-e7cc-72a5-9629-e40c0747a6ca"]
----- output end -----
  Operational Principle: Create, Retrieve, and Query Multiple Stores ... ok (431ms)
  Scenario 1: Duplicate Creation and Non-Existent Retrieval Attempts ...
------- output -------
Creating initial store for duplication test: Name="Unique Corner Store", Address="789 Quiet St"
Initial store created: {"storeId":"019a060b-e837-72cf-85b4-0033a18ad2fa"}
Attempting to create duplicate store: Name="Unique Corner Store", Address="789 Quiet St"
Duplicate store creation failed as expected: {"error":"A store with the same name and address already exists."}
Attempting to retrieve non-existent store with ID: non_existent_id_123
Retrieval of non-existent store failed as expected: {"error":"Store with ID 'non_existent_id_123' not found."}
----- output end -----
  Scenario 1: Duplicate Creation and Non-Existent Retrieval Attempts ... ok (73ms)
  Scenario 2: Store Deletion Lifecycle and Error Handling ...
------- output -------
Creating store for deletion: Name="Ephemeral Pop-Up", Address="500 Temporary Ave"
Store created for deletion: {"storeId":"019a060b-e881-71f5-bf12-e9b1b469a016"}
Attempting to delete store with ID: 019a060b-e881-71f5-bf12-e9b1b469a016
Store deleted successfully: {}
Attempting to retrieve deleted store with ID: 019a060b-e881-71f5-bf12-e9b1b469a016
Retrieval of deleted store failed as expected: {"error":"Store with ID '019a060b-e881-71f5-bf12-e9b1b469a016' not found."}
Attempting to delete already deleted store with ID: 019a060b-e881-71f5-bf12-e9b1b469a016
Re-deletion of store failed as expected: {"error":"Store with ID '019a060b-e881-71f5-bf12-e9b1b469a016' not found."}
Attempting to delete fake store with ID: totally_fake_id
Deletion of fake store failed as expected: {"error":"Store with ID 'totally_fake_id' not found."}
----- output end -----
  Scenario 2: Store Deletion Lifecycle and Error Handling ... ok (121ms)
  Scenario 3: Edge Cases - Stores with Empty Name and/or Address ...
------- output -------
Creating store with empty name and address: Name="", Address=""
Empty-field store created: {"storeId":"019a060b-e8f9-7c44-a1d9-1cbbf46659dd"}
Empty-field store retrieved: {"name":"","address":""}
Attempting to create duplicate of empty-field store.
Duplicate empty-field store creation failed as expected: {"error":"A store with the same name and address already exists."}
Creating store with only name empty: Name="", Address="321 Data Dr"
Name-empty store created: {"storeId":"019a060b-ea2a-7f9a-b374-5d889ff454bd"}
Querying stores by empty name: ""
Stores found by empty name: ["019a060b-e8f9-7c44-a1d9-1cbbf46659dd","019a060b-ea2a-7f9a-b374-5d889ff454bd"]
Querying stores by empty address: ""
Stores found by empty address: ["019a060b-e8f9-7c44-a1d9-1cbbf46659dd"]
----- output end -----
  Scenario 3: Edge Cases - Stores with Empty Name and/or Address ... ok (601ms)
------- output -------
StoreConcept Teardown: Closing database client...
StoreConcept teardown complete. Database client closed.
----- output end -----
Store Concept Comprehensive Tests ... ok (1s)

ok | 1 passed (4 steps) | 0 failed (1s)