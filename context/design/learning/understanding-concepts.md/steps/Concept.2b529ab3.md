---
timestamp: 'Sat Nov 08 2025 22:58:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_225836.a5c426e2.md]]'
content_id: 2b529ab3a359143ad152198e41beec0ccac31d56c8ae8650d6899b692cfc4e73
---

# Concept: Tagging

**purpose**
To allow arbitrary classification of stores using descriptive tags.

**state**
Each `Tagging` record associates tags with a store:

* `storeId`: String (references a `Store`)
* `tags`: Set<String> (a collection of user-defined tags)

**actions**

* `addTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* `removeTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist. The `tag` must be present in the store's tag set.
  * **Effect:** Removes the specified `tag` from the `storeId`'s set of tags.
* `deleteTagsForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Tagging` records associated with the specified `storeId`. This action is typically invoked by a synchronization.

**queries**

* `_getStoresByTag(tag: String): (storeId: String)`
  * **Requires:** `true`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`. (For `where` clause and `passthrough.ts`).
* `_getTagsForStore(storeId: String): (storeId: String, tags: Set<String>)`
  * **Requires:** `true`
  * **Effect:** Returns the `storeId` and its associated `tags`. (For `passthrough.ts`).

***
