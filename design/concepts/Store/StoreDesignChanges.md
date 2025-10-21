# Changes from Assignment 2

Original spec was a full store directory concept featuring tags, ratings, reviews, and searching. The current Store concept is a minimal identity-only registry with only storeId, store name, and address. The scope has been reduced to just necessary metadata about the store. 

Core actions such as createStore and deleteStore are still present, just renamed. Auxiliary aka out-of-scope actions like addTag, removeTag, updateRating, addReview are removed because I reduced the scope of the concept.

Query functions such as getStore, getStoreByName, and getStoreByAddress are present, but getStoreByTag has been removed because the Store concept no longer keeps track of tags.

Functions used to return full Store objects but now return either storeId or { error }, which is more aligned with the API style and also reduces vulnerability and exposure of internal elements. 