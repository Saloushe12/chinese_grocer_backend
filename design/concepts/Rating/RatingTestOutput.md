running 6 tests from ./src/concepts/Rating/RatingConcept.test.ts
Rating Concept: Operational Principle - Aggregating Reviews ...
------- output -------
--- getRating ---
Inputs: {
  "storeId": "019a07f4-5208-7b5d-abe4-46c79948f29f"
}
Outputs: {
  "aggregatedRating": 0,
  "reviewCount": 0
}
-------------------

--- getRating ---
Inputs: {
  "storeId": "019a07f4-5208-7b5d-abe4-46c79948f29f"
}
Outputs: {
  "aggregatedRating": 5,
  "reviewCount": 1
}
-------------------

--- getRating ---
Inputs: {
  "storeId": "019a07f4-5208-7b5d-abe4-46c79948f29f"
}
Outputs: {
  "aggregatedRating": 4,
  "reviewCount": 2
}
-------------------

--- getRating ---
Inputs: {
  "storeId": "019a07f4-5208-7b5d-abe4-46c79948f29f"
}
Outputs: {
  "aggregatedRating": 4,
  "reviewCount": 3
}
-------------------

----- output end -----
Rating Concept: Operational Principle - Aggregating Reviews ... ok (1s)
Scenario 1: No Reviews Initially ...
------- output -------
--- getRating ---
Inputs: {
  "storeId": "019a07f4-5789-7690-b9ed-d8e903fe84e6"
}
Outputs: {
  "aggregatedRating": 0,
  "reviewCount": 0
}
-------------------

----- output end -----
Scenario 1: No Reviews Initially ... ok (771ms)
Scenario 2: Zero Weight Contribution (No Change) ...
------- output -------
--- updateRating ---
Inputs: {
  "storeId": "019a07f4-5992-7cb9-8c5b-b71d6ec73085",
  "weight": 0
}
Outputs: {}
-------------------

----- output end -----
  "reviewCount": 0
}
-------------------

----- output end -----
Scenario 1: No Reviews Initially ... ok (771ms)
Scenario 2: Zero Weight Contribution (No Change) ...
------- output -------
--- updateRating ---
Inputs: {
  "storeId": "019a07f4-5992-7cb9-8c5b-b71d6ec73085",
  "weight": 0
}
Outputs: {}
-------------------

----- output end -----
-------------------

----- output end -----
Scenario 1: No Reviews Initially ... ok (771ms)
Scenario 2: Zero Weight Contribution (No Change) ...
------- output -------
--- updateRating ---
Inputs: {
  "storeId": "019a07f4-5992-7cb9-8c5b-b71d6ec73085",
  "weight": 0
}
Outputs: {}
-------------------

----- output end -----
----- output end -----
Scenario 1: No Reviews Initially ... ok (771ms)
Scenario 2: Zero Weight Contribution (No Change) ...
------- output -------
--- updateRating ---
Inputs: {
  "storeId": "019a07f4-5992-7cb9-8c5b-b71d6ec73085",
  "weight": 0
}
Outputs: {}
-------------------

----- output end -----
--- updateRating ---
Inputs: {
  "storeId": "019a07f4-5992-7cb9-8c5b-b71d6ec73085",
  "weight": 0
}
Outputs: {}
-------------------

----- output end -----
Scenario 2: Zero Weight Contribution (No Change) ... ok (590ms)
}
Outputs: {}
-------------------

----- output end -----
Scenario 2: Zero Weight Contribution (No Change) ... ok (590ms)

----- output end -----
Scenario 2: Zero Weight Contribution (No Change) ... ok (590ms)
Scenario 3: Negative Weight (Simulating Review Deletion) ... ok (1s)
Scenario 2: Zero Weight Contribution (No Change) ... ok (590ms)
Scenario 3: Negative Weight (Simulating Review Deletion) ... ok (1s)
Scenario 3: Negative Weight (Simulating Review Deletion) ... ok (1s)
Scenario 4: Error when Negative Review Count Would Occur ... ok (842ms)
Scenario 5: Multiple Independent Stores ... ok (786ms)

ok | 6 passed | 0 failed (5s)