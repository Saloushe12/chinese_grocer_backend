---
timestamp: 'Sun Oct 19 2025 20:16:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201645.51c61581.md]]'
content_id: 022383d2c3027394958f388849e2d8b14318c320e06c0d3694f5404731887161
---

# Concept: Review

**purpose**\
Allow users to submit textual reviews and ratings for stores.

**state**\
Each Review record:

* reviewId: String
* storeId: String
* userId: String
* text: String
* rating: Number  // numeric rating such as 1-5

**actions**

* createReview(userId: String, storeId: String, text: String, rating: Number): reviewId\
  *requires* storeId exists\
  *effect* creates a review and returns the reviewId

* deleteReview(reviewId: String)\
  *requires* reviewId exists\
  *effect* deletes the review

* getReviewsForStore(storeId: String): Set<String>\
  *effect* returns all reviewIds associated with the store

* getReviewsByUser(userId: String): Set<String>\
  *effect* returns all reviewIds created by the user

***
