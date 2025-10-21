# Rating Concept Design Changes

This concept did not exist in Assignment 2, it arose due to a separation of concerns from StoreDirectory, which used to hold ratings for stores. I decided to make Ratings its own concept because the StoreDirectory was too overloaded, and it should only handle the nuclear task of managing Store objects, with no other external functionality. The old StoreDirectory contained a rating number as well as a set of Reviews, each with their own rating number. Reviews implicitly updated the store rating through StoreDirectory. 

Now, the new Rating concept is responsible for aggregating review ratings, tracking the number of reviews, and maintaining the store's overall rating independent of the Review and Store concepts. The Store concept no longer stores review data or rating values.

The Review concept previously stored review texts, review ratings, and aggregate ratings for each store, but now it only creates individual Review entries with text and rating and does not support aggregation.

Each Rating Record stores the storeId as _id, the aggregatedRating as a computed average, and reviewCount which is the number of reviews. This allows for dynamic updates, deletion of reviews, and independent querying of rating info as opposed to it all being within StoreDirectory. Future features like weighted reviews, verified purchases, or category-specific ratings can be added without modifying the Review or Store concepts.