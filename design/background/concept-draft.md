# Concept: Store

**purpose**  
Represent the identity and physical address of a store.

**principle**  
A store exists independently; it may later be tagged, reviewed, or rated, but those are external interactions via syncs.

**state**  
Each Store is represented by:
- storeId: String (document identifier)
- name: String
- address: String  // use a string representation, not a composite object

**actions**
- createStore(name: String, address: String): storeId  
  *requires* no existing store has both the same name and address  
  *effect* creates a new store and returns its storeId

- deleteStore(storeId: String)  
  *requires* storeId exists  
  *effect* removes the store

- getStore(storeId: String): (name: String, address: String)  
  *requires* storeId exists  
  *effect* returns the name and address of the store

- getStoresByName(name: String): Set<String>  
  *effect* returns all storeIds matching the given name

- getStoresByAddress(address: String): Set<String>  
  *effect* returns all storeIds matching the given address

---

# Concept: Tagging

**purpose**  
Allow classification of stores using tags such as "Chinese", "Halal", "Budget", etc.

**state**  
Each Tagging record:
- storeId: String
- tags: Set<String>

**actions**
- addTag(storeId: String, tag: String)  
  *requires* storeId exists  
  *effect* adds tag to the store’s tag set

- removeTag(storeId: String, tag: String)  
  *requires* tag exists for storeId  
  *effect* removes tag from the store’s tag set

- getStoresByTag(tag: String): Set<String>  
  *effect* returns all storeIds that currently have the given tag

---

# Concept: Review

**purpose**  
Allow users to submit textual reviews and ratings for stores.

**state**  
Each Review record:
- reviewId: String
- storeId: String
- userId: String
- text: String
- rating: Number  // numeric rating such as 1-5

**actions**
- createReview(userId: String, storeId: String, text: String, rating: Number): reviewId  
  *requires* storeId exists  
  *effect* creates a review and returns the reviewId

- deleteReview(reviewId: String)  
  *requires* reviewId exists  
  *effect* deletes the review

- getReviewsForStore(storeId: String): Set<String>  
  *effect* returns all reviewIds associated with the store

- getReviewsByUser(userId: String): Set<String>  
  *effect* returns all reviewIds created by the user

---

# Concept: Rating

**purpose**  
Maintain an aggregated rating score for a store.

**state**  
Each Rating record:
- storeId: String
- rating: Number  // aggregated rating (e.g., average)
- reviewCount: Number

**actions**
- updateRating(storeId: String, newRating: Number)  
  *requires* storeId exists  
  *effect* updates aggregate rating and increments reviewCount

- getRating(storeId: String): Number  
  *requires* storeId exists  
  *effect* returns the store’s rating

---

# Concept: Localization

**purpose**  
Track a user’s preferred display language.

**state**  
Each Localization record:
- userId: String
- preferredLanguage: String

**actions**
- setLanguage(userId: String, language: String)  
  *requires* language is supported  
  *effect* sets user preference

- getLanguage(userId: String): String  
  *effect* returns user’s preferred language

---

# Syncs

### Sync: UpdateRatingOnReview
```
when Review.createReview(userId, storeId, text, rating)
then Rating.updateRating(storeId, rating)
```

### Sync: TagBasedSearch (example stub for features)
```
Feature queries use:
- Tagging.getStoresByTag(tag)
- Store.getStore(storeId)
- Rating.getRating(storeId)
```
> Note: This is a feature, not a concept. Filtering is done by orchestrating concept actions.