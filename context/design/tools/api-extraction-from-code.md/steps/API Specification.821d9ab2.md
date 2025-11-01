---
timestamp: 'Tue Oct 21 2025 20:41:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204100.142771bc.md]]'
content_id: 821d9ab2f59bf1622e382edb66c3513db1a1d2e3bdd38b2d030915c9820ba5d8
---

# API Specification: Rating Concept

**Purpose:** To maintain an aggregated rating score and count for a store, derived from individual reviews.

***

## API Endpoints

### POST /api/Rating/updateRating

**Description:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. If no rating record exists for the `storeId`, it is initialized with the contribution.

**Requirements:**

* The `storeId` must conceptually refer to an existing store in the system.
* The `contribution.weight` should not lead to a negative `reviewCount` for the store.

**Effects:**

* Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`.
* If no rating record exists for the `storeId`, it is initialized with the contribution.

**Request Body:**

```json
{
  "storeId": "string",
  "contribution": {
    "rating": "number",
    "weight": "number"
  }
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

### POST /api/Rating/getRating

**Description:** Returns the current aggregated rating and the count of reviews for the specified store.

**Requirements:**

* The `storeId` must conceptually refer to an existing store in the system.

**Effects:**

* Returns the current aggregated rating and the count of reviews for the specified store.
* If no rating record exists for the `storeId`, returns `{ aggregatedRating: 0, reviewCount: 0 }`, indicating that the store has not yet received any reviews. This is considered a valid, non-error state, representing a store with no rating data.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "aggregatedRating": "number",
  "reviewCount": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
