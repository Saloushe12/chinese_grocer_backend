ReviewConcept: All Scenarios ...
------- output -------

--- Starting ReviewConcept Tests for Database: test-chinese_grocer_db ---
----- output end -----
  Operational Principle - Create a review and retrieve it for the store ...
------- output -------

--- Test Step: Operational Principle ---
1. Action: createReview. Input: userId='019a068a-13e7-7fb3-ae04-2847bbd9aa4c', storeId='019a068a-13e7-7e84-8a4b-7d315ddef0bf', text='Great food and service!', rating=5
1. Output: {"reviewId":"019a068a-13e8-7aca-a197-04c32a045072"}
2. Action: getReviewsForStore. Input: storeId='019a068a-13e7-7e84-8a4b-7d315ddef0bf'
2. Output: {"reviewIds":{}}
Verified DB state for reviewId '019a068a-13e8-7aca-a197-04c32a045072': {"_id":"019a068a-13e8-7aca-a197-04c32a045072","userId":"019a068a-13e7-7fb3-ae04-2847bbd9aa4c","storeId":"019a068a-13e7-7e84-8a4b-7d315ddef0bf","text":"Great food and service!","rating":5}
--- Test Step Finished ---
----- output end -----
  Operational Principle - Create a review and retrieve it for the store ... ok (83ms)
  Scenario 1 - createReview with an invalid rating ...
------- output -------

--- Test Step: Scenario 1 ---
Action: createReview. Input: userId='019a068a-143a-7e7c-9600-a5eeb66f1c84', storeId='019a068a-143a-7a19-8d11-bcca2b386c47', text='Bad rating value test', rating=0
Output: {"error":"Rating must be between 1 and 5."}
--- Test Step Finished ---
----- output end -----
  Scenario 1 - createReview with an invalid rating ... ok (16ms)
  Scenario 2 - Delete an existing review and verify its absence ...
------- output -------

--- Test Step: Scenario 2 ---
1. Action: createReview. Input: userId='019a068a-144b-740c-90c8-069270be96b1', storeId='019a068a-144b-7608-bfdc-a60a52dc32e1', text='Review to be deleted', rating=4
1. Output: {"reviewId":"019a068a-144b-7797-9292-85eaf1b5f7b8"}
2. Action: deleteReview. Input: reviewId='019a068a-144b-7797-9292-85eaf1b5f7b8'
2. Output: {}
3. Action: getReviewsForStore. Input: storeId='019a068a-144b-7608-bfdc-a60a52dc32e1'
3. Output: {"reviewIds":{}}
Verified DB state for reviewId '019a068a-144b-7797-9292-85eaf1b5f7b8' after deletion: null
--- Test Step Finished ---
----- output end -----
  Scenario 2 - Delete an existing review and verify its absence ... ok (82ms)
  Scenario 3 - Attempt to delete a non-existent review ...
------- output -------

--- Test Step: Scenario 3 ---
Action: deleteReview. Input: reviewId='019a068a-149e-73e9-be5f-542ae7623715'
Output: {"error":"Review with ID '019a068a-149e-73e9-be5f-542ae7623715' not found."}
--- Test Step Finished ---
----- output end -----
  Scenario 3 - Attempt to delete a non-existent review ... ok (16ms)
  Scenario 4 - Multiple reviews for the same store from different users ...
------- output -------

--- Test Step: Scenario 4 ---
1. Action: createReview. Input: userId='019a068a-14ae-785b-b9ec-f2855947a883', storeId='019a068a-14ad-7038-824f-7c112a24fbf0', text='Review 1', rating=5
1. Output: {"reviewId":"019a068a-14ae-74d7-a0e7-ada9901a9ec2"}
2. Action: createReview. Input: userId='019a068a-14ae-7593-a8d9-7f59e8a7d5fc', storeId='019a068a-14ad-7038-824f-7c112a24fbf0', text='Review 2', rating=3
2. Output: {"reviewId":"019a068a-14c0-798d-b831-564b625021d1"}
3. Action: getReviewsForStore. Input: storeId='019a068a-14ad-7038-824f-7c112a24fbf0'
3. Output: {"reviewIds":{}}
--- Test Step Finished ---
----- output end -----
  Scenario 4 - Multiple reviews for the same store from different users ... ok (53ms)
  Scenario 5 - Multiple reviews by the same user for different stores ...
------- output -------

--- Test Step: Scenario 5 ---
1. Action: createReview. Input: userId='019a068a-14e2-7a43-9728-f5206f08917f', storeId='019a068a-14e2-729a-8bae-a4b49dfec1ea', text='User review for store 1', rating=4
1. Output: {"reviewId":"019a068a-14e2-7dfd-a9a4-734514fe3715"}
2. Action: createReview. Input: userId='019a068a-14e2-7a43-9728-f5206f08917f', storeId='019a068a-14e2-7257-84c1-76d5622299c6', text='User review for store 2', rating=2
2. Output: {"reviewId":"019a068a-14f4-7065-ac4a-2cffd5e4f9fa"}
3. Action: getReviewsByUser. Input: userId='019a068a-14e2-7a43-9728-f5206f08917f'
3. Output: {"reviewIds":{}}
--- Test Step Finished ---
----- output end -----
  Scenario 5 - Multiple reviews by the same user for different stores ... ok (50ms)
------- output -------
--- All ReviewConcept Tests Finished for Database: test-chinese_grocer_db ---
----- output end -----
ReviewConcept: All Scenarios ... ok (813ms)

ok | 1 passed (6 steps) | 0 failed (826ms)