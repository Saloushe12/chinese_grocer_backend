---
timestamp: 'Sun Oct 19 2025 20:16:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201654.4997e51b.md]]'
content_id: d7c89db00ef82743aa688a0e0b1c85c84c3718a1fe0a1b2d11cf63bdaafeb3f6
---

# Concept: Store

**purpose**
Represent the identity and physical address of a store.

**principle**
A store's existence and location are fundamental. Interactions related to its classification, user feedback, or popularity are external concerns managed by other concepts through synchronizations.

**state**
Each `Store` is represented by:

* `storeId`: String (unique document identifier)
* `name`: String
* `address`: String // A string representation is sufficient for basic identification. Complex address parsing or validation is a concern for a dedicated address concept if needed elsewhere.

**actions**

* `createStore(name: String, address: String): storeId`
  * **Requires:** No existing store has both the exact same `name` and `address`.
  * **Effect:** Creates a new store record and returns its unique `storeId`.
* `deleteStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the store record.
* `getStore(storeId: String): (name: String, address: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the `name` and `address` of the specified store.
* `getStoresByName(name: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `name`.
* `getStoresByAddress(address: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `address`.

***
