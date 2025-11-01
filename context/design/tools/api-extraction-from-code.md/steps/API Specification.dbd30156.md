---
timestamp: 'Tue Oct 21 2025 20:32:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_203250.038944be.md]]'
content_id: dbd30156088ae3bf3591623d6d54bf756057fe94d3fe032855b972d0920a9b4e
---

# API Specification: Store Concept

**Purpose:** Represent the identity and physical address of a store.

***

## API Endpoints

### POST /api/Store/createStore

**Description:** Creates a new store record and returns its unique `storeId`.

**Requirements:**

* No existing store has both the exact same `name` and `address`.

**Effects:**

* Creates a new store record and returns its unique `storeId`.

**Request Body:**

```json
{
  "name": "string",
  "address": "string"
}
```

**Success Response Body (Action):**

```json
{
  "storeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/deleteStore

**Description:** Removes the store record.

**Requirements:**

* The `storeId` must exist.

**Effects:**

* Removes the store record.

**Request Body:**

```json
{
  "storeId": "string"
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

### POST /api/Store/\_getStore

**Description:** Returns the `name` and `address` of the specified store.

**Requirements:**

* The `storeId` must exist.

**Effects:**

* Returns the `name` and `address` of the specified store.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "name": "string",
    "address": "string"
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

### POST /api/Store/\_getStoresByName

**Description:** Returns a set of all `storeId`s matching the given `name`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `storeId`s matching the given `name`.

**Request Body:**

```json
{
  "name": "string"
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

### POST /api/Store/\_getStoresByAddress

**Description:** Returns a set of all `storeId`s matching the given `address`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `storeId`s matching the given `address`.

**Request Body:**

```json
{
  "address": "string"
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
