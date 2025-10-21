# Tagging Concept Design Changes

This concept did not exist as a standalone concept in assignment 2. It was a part of StoreDirectory, but I decided to extract it from StoreDirectory, make the Store concept less overloaded with actions, and have Tagging as a standalone option, separate from the Store concept.

Tags used to be stored within the StoreDirectory concept as part of each store's state, and actions like addTag and removeTag were actions in StoreDirectory that are now in Tagging. 

Having Tagging as its own concept allows me to arbitrarily classify using descriptive tags, using actions like addTag, removeTag, and getStoresByTag. This separates tagging functionality from Store management, improving modularity. This makes tagging polymorphic, all it takes is a storeId without relying on the Store concept's internal representation. This also means that searching will now use actions in the Tagging concept instead of actions in Store. 

Externalizing tags allows me to potentially support user-generated tags, regions, and multi-language tagging without modifying the Store concept or individual Stores' states. Other users can now tag stores, which was not possible before.