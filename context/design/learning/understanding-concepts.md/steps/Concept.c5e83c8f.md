---
timestamp: 'Sat Nov 08 2025 22:58:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_225836.a5c426e2.md]]'
content_id: c5e83c8f9d22294756d754f6ad602f3042db717efc9a64ccca0b986cc094174b
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
* `address`: String // A string representation is sufficient for basic identification.

**actions**

* `createStore(name: String, address: String): storeId`
  * **Requires:** No existing store has both the exact same `name` and `address`.
  * **Effect:** Creates a new store record and returns its unique `storeId`.
* `deleteStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the store record. Cascading deletion of associated data (tags, reviews, ratings) is handled by synchronizations.

**queries**

* `_storeExists(storeId: String): (storeId: String)`
  * **Requires:** `true`
  * **Effect:** Returns the `storeId` if it exists, otherwise an empty array. (For `where` clause existence checks).
* `_getStoreDetails(storeId: String): (storeId: String, name: String, address: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the `storeId`, `name`, and `address` of the specified store. (For `passthrough.ts` and general lookup).
* `_listAllStores(): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns a list of all `storeId`s, their `name`, and `address`. (For `passthrough.ts`).
* `_getStoresByName(name: String): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns all `storeId`s, their `name`, and `address` matching the given `name`. (For `passthrough.ts`).
* `_getStoresByAddress(address: String): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns all `storeId`s, their `name`, and `address` matching the given `address`. (For `passthrough.ts`).

***
