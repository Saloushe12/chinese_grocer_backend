---
timestamp: 'Sun Oct 19 2025 20:16:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201645.51c61581.md]]'
content_id: f3e084b36e54d1462878650aa7b5150e993e54ad96e2c2562927754c0a376eb8
---

# Concept: Store

**purpose**\
Represent the identity and physical address of a store.

**principle**\
A store exists independently; it may later be tagged, reviewed, or rated, but those are external interactions via syncs.

**state**\
Each Store is represented by:

* storeId: String (document identifier)
* name: String
* address: String  // use a string representation, not a composite object

**actions**

* createStore(name: String, address: String): storeId\
  *requires* no existing store has both the same name and address\
  *effect* creates a new store and returns its storeId

* deleteStore(storeId: String)\
  *requires* storeId exists\
  *effect* removes the store

* getStore(storeId: String): (name: String, address: String)\
  *requires* storeId exists\
  *effect* returns the name and address of the store

* getStoresByName(name: String): Set<String>\
  *effect* returns all storeIds matching the given name

* getStoresByAddress(address: String): Set<String>\
  *effect* returns all storeIds matching the given address

***
