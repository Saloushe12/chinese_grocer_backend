# Review Concept Design Changes 

Reviews used to be tied to users and were part of a user's profile, but now they are their own standalone concept and independent of any other concepts, which clarified their modularity. 

Previously the Reviews' states were a part of User states: “a set of Users with a set of reviews.” Now, the state is just a set of Review records, each with the fields reviewId, storeId, userId, text, and rating. This change shifted reviews from user-centric to self-centric, with an independent structure.

One large change is that now each review has its own identifier, where previously reviews were just strings inside a set that was under the user. This allows for review persistence and other functionalities like easy querying.

Previously, the store reference was implicit and not specifically mentioned in the spec. Now, each review explicitly has a userId and a storeId. Additionally, ratings are now per-review as opposed to being associated with a user.

New actions were added like deleteReview, getReviewsForStore, getReviewsByUser, adding extra functionality to the concept.

Finally, rating aggregation is explicitly stated to be handled outside of the concept by a sync.