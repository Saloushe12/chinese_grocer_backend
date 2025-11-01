---
timestamp: 'Tue Oct 21 2025 20:40:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204048.ffcfe94e.md]]'
content_id: c4b30947db8d845440caf1e15d59e4c8dfb877ebec5f402c2dddfb1b8f3ab248
---

# API Specification: Review Concept

**Purpose:** To capture textual reviews and individual ratings submitted by users for specific stores.

***

## API Endpoints

### POST /api/Review/createReview

**Description:** Creates a new `Review` record and returns its unique `reviewId`.

**Requirements:**

* The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).

**Effects:**

* Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.

**Request Body:**

```json
{
  "userId": "string",
  "storeId": "string",
  "text": "string",
  "rating": "number"
}
```

**Success Response Body (Action):**

```json
{
  "reviewId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/deleteReview

**Description:** Deletes the specified `Review` record.

**Requirements:**

* The `reviewId` must exist.

**Effects:**

* Deletes the specified `Review` record.

**Request Body:**

```json
{
  "reviewId": "string"
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

### POST /api/Review/getReviewsForStore

**Description:** Returns a set of all `reviewId`s associated with the specified `storeId`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `reviewId`s associated with the specified `storeId`.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/getReviewsByUser

**Description:** Returns a set of all `reviewId`s created by the specified `userId`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `reviewId`s created by the specified `userId`.

**Request Body:**

```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
