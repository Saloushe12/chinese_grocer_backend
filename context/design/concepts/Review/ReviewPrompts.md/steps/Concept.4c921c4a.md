---
timestamp: 'Tue Oct 21 2025 06:32:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_063252.e01f731c.md]]'
content_id: 4c921c4a61ad1366440b156ff7f2f3c3080452081d5d454cd8e290a302fbf9fa
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
