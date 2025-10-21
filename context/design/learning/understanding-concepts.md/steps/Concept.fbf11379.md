---
timestamp: 'Sun Oct 19 2025 20:16:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201645.51c61581.md]]'
content_id: fbf113793004640a3e45f01f03d0a35f8a0fb579599fdd4c880aa5f51f8ed0d6
---

# Concept: Rating

**purpose**\
Maintain an aggregated rating score for a store.

**state**\
Each Rating record:

* storeId: String
* rating: Number  // aggregated rating (e.g., average)
* reviewCount: Number

**actions**

* updateRating(storeId: String, newRating: Number)\
  *requires* storeId exists\
  *effect* updates aggregate rating and increments reviewCount

* getRating(storeId: String): Number\
  *requires* storeId exists\
  *effect* returns the store’s rating

***
