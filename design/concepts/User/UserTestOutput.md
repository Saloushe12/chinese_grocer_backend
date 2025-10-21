User Concept Comprehensive Tests ...
------- output -------
--- Initialized DB and UserConcept for comprehensive suite ---
----- output end -----
  Operational Principle: User registration, authentication, profile retrieval, and email update ...
------- output -------
--- Cleared 'User.users' collection for Operational Principle test ---
Scenario: Operational Principle - Register, Authenticate, Get Profile, Update Email
  Action: registerUser(username: 'principleUser', email: 'principle@example.com', password: '***')
  Output: { userId: "019a0568-5ad2-761f-8011-8a54f269aa78" }
  Verification: User registered with ID: 019a0568-5ad2-761f-8011-8a54f269aa78
  Action: authenticateUser(usernameOrEmail: 'principleUser', password: '***')
  Output: { userId: "019a0568-5ad2-761f-8011-8a54f269aa78" }
  Verification: Authenticated by username.
  Action: getUserById(userId: '019a0568-5ad2-761f-8011-8a54f269aa78')
  Output: {
  username: "principleUser",
  email: "principle@example.com",
  creationDate: 2025-10-21T06:15:16.434Z
}
  Verification: User profile retrieved.
  Action: updateUserEmail(userId: '019a0568-5ad2-761f-8011-8a54f269aa78', newEmail: 'new_principle@example.com')
  Output: {}
  Verification: Email updated to new_principle@example.com.
  Action: getUserById(userId: '019a0568-5ad2-761f-8011-8a54f269aa78') (after update)
  Output: {
  username: "principleUser",
  email: "new_principle@example.com",
  creationDate: 2025-10-21T06:15:16.434Z
}
  Verification: Updated email confirmed.
----- output end -----
  Operational Principle: User registration, authentication, profile retrieval, and email update ... ok (652ms)
  Scenario 1: Full User Lifecycle (Register -> Auth -> Update -> Delete -> Re-register) ...
------- output -------
--- Cleared 'User.users' collection for 'User Lifecycle' test ---
Scenario: User Lifecycle - Register, Auth, Update, Delete, Re-register with same username
  Registered user 'lifecycleUser' with ID '019a0568-5d56-79fc-9578-204861f4ce69'
  Authenticated user 'lifecycleUser'
  Email updated for user 'lifecycleUser' to 'new_lifecycle@example.com'
  Action: deleteUser(userId: '019a0568-5d56-79fc-9578-204861f4ce69')
  Output: {}
  Verification: User 'lifecycleUser' deleted.
  Action: authenticateUser(usernameOrEmail: 'lifecycleUser', password: '***') (after deletion)
  Verification: Authentication failed for deleted user (as expected).
  Action: getUserById(userId: '019a0568-5d56-79fc-9578-204861f4ce69') (after deletion)
  Verification: Get profile failed for deleted user (as expected).
  Action: registerUser(username: 'lifecycleUser', email: 're_register@example.com', password: '***') (re-register)
  Output: { userId: "019a0568-5ede-7f63-afdb-94823f8e2916" }
  Verification: New user re-registered with username 'lifecycleUser' and ID '019a0568-5ede-7f63-afdb-94823f8e2916'.
----- output end -----
  Scenario 1: Full User Lifecycle (Register -> Auth -> Update -> Delete -> Re-register) ... ok (567ms)
  Scenario 2: Multiple authentication attempts (fail then succeed) ...
------- output -------
--- Cleared 'User.users' collection for 'Authentication Failures' test ---
Scenario: Authentication failures and eventual success
  Registered user 'authTestUser' with ID '019a0568-5f94-7cb4-86f7-53df725f671d'
  Action: authenticateUser(usernameOrEmail: 'authTestUser', password: '***') (wrong password)
  Verification: Authentication failed with wrong password (as expected).
  Action: authenticateUser(usernameOrEmail: 'ghostUser', password: '***') (non-existent)
  Verification: Authentication failed for non-existent user (as expected).
  Action: authenticateUser(usernameOrEmail: 'authtest@example.com', password: '***') (success by email)
  Verification: User 'authTestUser' successfully authenticated by email.
----- output end -----
  Scenario 2: Multiple authentication attempts (fail then succeed) ... ok (460ms)
  Scenario 3: Registration attempts with existing username/email and weak password ...
------- output -------
--- Cleared 'User.users' collection for 'Registration Errors' test ---
Scenario: Registration error cases
  Registered base user 'baseUser' with ID '019a0568-6159-70d4-a8c1-353c3fad61d5'
  Action: registerUser(username: 'baseUser', email: 'new@example.com', password: '***') (duplicate username)
  Verification: Registration failed for duplicate username (as expected).
  Action: registerUser(username: 'anotherUser', email: 'base@example.com', password: '***') (duplicate email)
  Verification: Registration failed for duplicate email (as expected).
  Action: registerUser(username: 'weakPwdUser', email: 'weak@example.com', password: '***') (weak password)
  Verification: Registration failed for weak password (as expected).
----- output end -----
  Scenario 3: Registration attempts with existing username/email and weak password ... ok (246ms)
------- output -------
--- Closed MongoDB client after User Concept Comprehensive Tests ---
----- output end -----
User Concept Comprehensive Tests ... ok (2s)

ok | 1 passed (4 steps) | 0 failed (2s)