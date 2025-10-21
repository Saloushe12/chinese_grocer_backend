Tagging Concept - Core Workflow and Edge Cases ...
  Operational Principle: Successfully add multiple tags and query stores by tags ...
------- output -------
--- Running 'Operational Principle' test ---
Action: addTag({ storeId: '019a0649-efb9-79ad-b1a0-4f5d41a7a960', tag: 'Electronics' })
Action: addTag({ storeId: '019a0649-efb9-79ad-b1a0-4f5d41a7a960', tag: 'Gadgets' })
Action: addTag({ storeId: '019a0649-efb9-79ad-b1a0-4f5d41a7a960', tag: 'Popular' })
Action: addTag({ storeId: '019a0649-efb9-7638-86a2-af4ac076d43b', tag: 'Books' })
Action: addTag({ storeId: '019a0649-efb9-7638-86a2-af4ac076d43b', tag: 'Popular' })
Action: _getStoresByTag({ tag: 'Electronics' })
Action: _getStoresByTag({ tag: 'Books' })
Action: _getStoresByTag({ tag: 'Popular' })
--- End 'Operational Principle' test ---
----- output end -----
  Operational Principle: Successfully add multiple tags and query stores by tags ... ok (219ms)
  Scenario 1: Full Lifecycle & Idempotency (Add, Remove, Re-add, Re-remove, Query) ...
------- output -------
--- Running 'Full Lifecycle & Idempotency' test ---
Action: addTag({ storeId: '019a0649-efb9-78ac-ba45-c7a2b085e676', tag: 'Fashion' })
Action: addTag({ storeId: '019a0649-efb9-78ac-ba45-c7a2b085e676', tag: 'Clothing' })
Action: addTag({ storeId: '019a0649-efb9-78ac-ba45-c7a2b085e676', tag: 'Fashion' }) (again)
Action: removeTag({ storeId: '019a0649-efb9-78ac-ba45-c7a2b085e676', tag: 'Fashion' })
Action: removeTag({ storeId: '019a0649-efb9-78ac-ba45-c7a2b085e676', tag: 'Unused' })
Action: _getStoresByTag({ tag: 'Clothing' })
Action: _getStoresByTag({ tag: 'Fashion' })
--- End 'Full Lifecycle & Idempotency' test ---
----- output end -----
  Scenario 1: Full Lifecycle & Idempotency (Add, Remove, Re-add, Re-remove, Query) ... ok (238ms)
  Scenario 2: Edge Cases (Empty Tags, Non-Existent Entities, Document Deletion) ...
------- output -------
--- Running 'Edge Cases' test ---
Action: addTag({ storeId: '019a0649-efb9-7739-b936-f8887a893f78', tag: '' }) (empty string)
Action: addTag({ storeId: '019a0649-efb9-7739-b936-f8887a893f78', tag: 'Food & Drink (Vegan)' }) (special characters)
Action: _getStoresByTag({ tag: '' })
Action: removeTag({ storeId: '019a0649-f183-759b-9e54-26608b8b63d3', tag: 'any_tag' }) from non-existent store
Action: addTag({ storeId: '019a0649-efb9-7639-b66e-f60634da04a5', tag: 'SoloTag' })
Action: _getStoresByTag({ tag: 'SoloTag' }) before removal
Action: removeTag({ storeId: '019a0649-efb9-7639-b66e-f60634da04a5', tag: 'SoloTag' }) (last tag)
Action: _getStoresByTag({ tag: 'SoloTag' }) after removal
--- End 'Edge Cases' test ---
----- output end -----
  Scenario 2: Edge Cases (Empty Tags, Non-Existent Entities, Document Deletion) ... ok (479ms)
------- output -------
Closing MongoDB client after all Tagging Concept Deno.test steps.
----- output end -----
Tagging Concept - Core Workflow and Edge Cases ... ok (1s)

ok | 1 passed (3 steps) | 0 failed (1s)