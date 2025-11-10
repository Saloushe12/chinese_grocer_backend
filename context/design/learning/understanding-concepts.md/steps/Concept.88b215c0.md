---
timestamp: 'Fri Nov 07 2025 21:07:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210756.a26c4c14.md]]'
content_id: 88b215c0cd55f3a0b1e62aad7f8bc55431d2c38517545380c85b1ac57210faf2
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
* `getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.
* `deleteTagsForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Tagging` records associated with the specified `storeId`. This action is typically invoked by a synchronization.

**queries**

* `_getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

***
