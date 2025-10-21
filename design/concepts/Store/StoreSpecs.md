Concept: Store
Purpose

Represent the identity and physical address of a store.

Principle

A store's existence and location are fundamental. All other aspects such as tags, ratings, or reviews are managed by other independent concepts through synchronizations, ensuring separation of concerns.

State

Each Store is represented by:

Field	Type	Description
storeId	String	Unique identifier (document ID)
name	String	Store name
address	String	Store address
Actions
1. createStore(name: String, address: String): storeId | error

Requires: No existing store has both the same name and address.

Effect: Creates a new store record and returns its unique storeId.

Returns:

{ storeId: String } on success

{ error: String } if a store with the same name and address already exists

2. deleteStore(storeId: String): Empty | error

Requires: The storeId must exist.

Effect: Removes the store record.

Returns:

{} (empty object) on success

{ error: String } if the store does not exist

3. _getStore(storeId: String): { name: String, address: String } | error

Requires: The storeId must exist.

Effect: Returns the store's name and address.

Returns:

{ name: String, address: String } on success

{ error: String } if the store is not found

4. _getStoresByName(name: String): Set<String>

Effect: Returns a set of all storeIds matching the given name.

Returns:

Set<String> (may be empty if no stores match)

5. _getStoresByAddress(address: String): Set<String>

Effect: Returns a set of all storeIds matching the given address.

Returns:

Set<String> (may be empty if no stores match)