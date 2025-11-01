---
timestamp: 'Tue Oct 21 2025 20:37:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_203735.6db4d841.md]]'
content_id: 3c9b99a4662fbe05b3de008d0483a338006e8c2dd69ff919e060e501b6cddb45
---

# API Specification: Tagging Concept

**Purpose:** To manage the association of tags with stores.

***

## API Endpoints

### POST /api/Tagging/addTag

**Description:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.

**Requirements:**

* The `storeId` must exist (conceptually, in the `Store` concept).
* The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.

**Effects:**

* Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* If no `Tagging` record exists for the `storeId`, a new one is created.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/removeTag

**Description:** Removes the specified `tag` from the `storeId`'s set of tags.

**Requirements:**

* The `storeId` must exist (i.e., there is a tagging record for it).
* The `tag` must be present in the store's tag set.

**Effects:**

* Removes the specified `tag` from the `storeId`'s set of tags.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/\_getStoresByTag

**Description:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
