---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: c061f81d5a6557d2b48ac457f6718a2d0cd05755dd734a75fd27d19b01ec21fa
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

* `createStore(name: String, address: String): (storeId: String) | (error: String)`
  * **Requires:** No existing store has both the exact same `name` and `address`.
  * **Effect:** Creates a new store record and returns its unique `storeId`. Returns an `error` if a duplicate exists.
* `deleteStore(storeId: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the store record. Cascading deletion of associated data (tags, reviews, ratings) is handled by synchronizations. Returns an `error` if the `storeId` does not exist.

**queries**

* `_storeExists(storeId: String): (storeId: String)`
  * **Requires:** `true`
  * **Effect:** Returns `storeId` in an array if a store with that `storeId` exists, otherwise an empty array. (For `where` clause existence checks).
* `_getStoreDetails(storeId: String): (storeId: String, name: String, address: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns an array containing the `storeId`, `name`, and `address` of the specified store. (For `passthrough.ts` and general lookup).
* `_listAllStores(): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all `storeId`s, their `name`, and `address`. (For `passthrough.ts`).
* `_getStoresByName(name: String): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all `storeId`s, their `name`, and `address` matching the given `name`. (For `passthrough.ts`).
* `_getStoresByAddress(address: String): (storeId: String, name: String, address: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all `storeId`s, their `name`, and `address` matching the given `address`. (For `passthrough.ts`).

***
