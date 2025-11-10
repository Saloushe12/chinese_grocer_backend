---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: a1f3c28ebfe88ce60a97a2a77894aeda4e1b549d97d799a1b8d062300c27ac96
---

# Concept: Tagging

**purpose**
To allow arbitrary classification of stores using descriptive tags.

**state**
Each `Tagging` record associates tags with a store:

* `storeId`: String (references a `Store`)
* `tags`: Set<String> (a collection of user-defined tags)

**actions**

* `addTag(storeId: String, tag: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged. Returns an `error` if `storeId` doesn't exist.
* `removeTag(storeId: String, tag: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist. The `tag` must be present in the store's tag set.
  * **Effect:** Removes the specified `tag` from the `storeId`'s set of tags. Returns an `error` if `storeId` or `tag` don't exist.
* `deleteTagsForStore(storeId: String): {} | (error: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Tagging` records associated with the specified `storeId`. This action is typically invoked by a synchronization. Returns an `error` if `storeId` doesn't exist.

**queries**

* `_getStoresByTag(tag: String): (storeId: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array of all `storeId`s that are currently associated with the given `tag`. (For `where` clause and `passthrough.ts`).
* `_getTagsForStore(storeId: String): (storeId: String, tags: Set<String>)`
  * **Requires:** `true`
  * **Effect:** Returns an array containing the `storeId` and its associated `tags`. (For `passthrough.ts`).

***
