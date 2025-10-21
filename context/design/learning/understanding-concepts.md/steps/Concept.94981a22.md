---
timestamp: 'Sun Oct 19 2025 20:16:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201654.4997e51b.md]]'
content_id: 94981a221f965bf2c7290bf2503d05170e2f0ec68395918e037931e97a293f36
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
  * **Requires:** The `storeId` must exist. The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.
  * **Effect:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* `removeTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist. The `tag` must be present in the store's tag set.
  * **Effect:** Removes the specified `tag` from the `storeId`'s set of tags.
* `getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

***
