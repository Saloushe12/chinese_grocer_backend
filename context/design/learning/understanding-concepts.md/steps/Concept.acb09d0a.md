---
timestamp: 'Sun Oct 19 2025 20:16:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201645.51c61581.md]]'
content_id: acb09d0afe9d3eff4580cff8706ae93eeac232c667e3a1ded3b31a0532592dcf
---

# Concept: Tagging

**purpose**\
Allow classification of stores using tags such as "Chinese", "Halal", "Budget", etc.

**state**\
Each Tagging record:

* storeId: String
* tags: Set<String>

**actions**

* addTag(storeId: String, tag: String)\
  *requires* storeId exists\
  *effect* adds tag to the store’s tag set

* removeTag(storeId: String, tag: String)\
  *requires* tag exists for storeId\
  *effect* removes tag from the store’s tag set

* getStoresByTag(tag: String): Set<String>\
  *effect* returns all storeIds that currently have the given tag

***
