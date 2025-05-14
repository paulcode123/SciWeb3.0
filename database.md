# SciWeb 3.0 Firebase Database Schema

This document outlines the collections, fields, and data types used in the SciWeb 3.0 Firebase database.

## Collections

### Members
Stores user account information.

| Field | Type | Description |
|-------|------|-------------|
| first_name | String | User's first name |
| last_name | String | User's last name |
| email | String | User's email address (unique) |
| username | String | Optional username |
| password | String | User's password (should be hashed) |
| grade | String | User's academic grade level |
| verification_code | String | Email verification code |
| profilePicUrl | String | URL to user's profile picture |
| createdAt | Timestamp | Account creation timestamp |
| updatedAt | Timestamp | Last account update timestamp |
| userType | String | Type of user (e.g., "student", "teacher", "admin") |
| bio | String | User's bio or self-description |
| settings | Object | User preferences and settings |
| settings.privacy | Object | Privacy settings |
| settings.privacy.profileVisibility | String | Who can see profile ("private", "friends", "everyone") |
| settings.privacy.webVisibility | String | Who can see knowledge web ("private", "friends", "everyone") |
| settings.privacy.classesVisibility | String | Who can see classes ("private", "friends", "everyone") |
| settings.privacy.motivationsVisibility | String | Who can see motivations ("private", "friends", "everyone") |
| settings.privacy.friendsVisibility | String | Who can see friends list ("private", "friends", "everyone") |
| settings.appearance | Object | UI appearance preferences |
| settings.appearance.theme | String | UI theme preference ("light", "dark", "system") |
| settings.appearance.colorAccent | String | UI color accent ("pink", "blue", "purple", "green", "orange") |
| classes | Array<Object> | Array of user's classes |
| classes[].id | String | Unique class identifier |
| classes[].name | String | Class name |
| classes[].teacher | String | Teacher name |
| classes[].period | String | Class period |
| classes[].createdAt | Timestamp | When class was added |
| classes[].updatedAt | Timestamp | When class was last updated |
| friends | Array<String> | Array of friend user IDs (references to Members) |
| friendRequests | Object | Friend request management |
| friendRequests.incoming | Array<Object> | Incoming friend requests |
| friendRequests.incoming[].userId | String | User ID of requester |
| friendRequests.incoming[].requestedAt | Timestamp | When request was sent |
| friendRequests.outgoing | Array<Object> | Outgoing friend requests |
| friendRequests.outgoing[].userId | String | User ID of recipient |
| friendRequests.outgoing[].requestedAt | Timestamp | When request was sent |

### Trees
Stores user's tree data including nodes and connections.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | Reference to Members collection |
| nodes | Array<Object> | Array of node objects |
| nodes[].id | String | Unique node identifier |
| nodes[].type | String | Node type (motivator, task, challenge, etc.) |
| nodes[].title | String | Node title/name |
| nodes[].position | Object | Node position on canvas |
| nodes[].position.x | Number | X coordinate |
| nodes[].position.y | Number | Y coordinate |
| nodes[].dueDate | Timestamp | Optional due date for task-like nodes |
| nodes[].content | String | Optional content (e.g., image URL) |
| edges | Array<Object> | Array of edge objects connecting nodes |
| edges[].from | String | Source node ID |
| edges[].to | String | Target node ID |
| createdAt | Timestamp | Tree creation timestamp |
| updatedAt | Timestamp | Last tree update timestamp |

### FriendConnections
Stores friend relationships between users.

| Field | Type | Description |
|-------|------|-------------|
| user1Id | String | First user ID (reference to Members) |
| user2Id | String | Second user ID (reference to Members) |
| status | String | Relationship status ("friends", "pending", "blocked") |
| requestedBy | String | ID of user who initiated the request |
| requestedAt | Timestamp | When the friendship was requested |
| acceptedAt | Timestamp | When the friendship was accepted |
| updatedAt | Timestamp | Last update timestamp |

### Classes
Stores information about classes, their members, channels, and units.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique class identifier |
| name | String | Class name |
| description | String | Class description |
| teacherId | String | Reference to teacher in Members collection |
| teacherName | String | Name of the teacher |
| period | String | Class period |
| yearGroup | String | Academic year group |
| subject | String | Subject area |
| createdAt | Timestamp | Class creation timestamp |
| updatedAt | Timestamp | Last class update timestamp |
| members | Array<Object> | Array of class members |
| members[].userId | String | User ID (reference to Members) |
| members[].role | String | Role in class ("teacher", "student", "ta", "observer") |
| members[].joinedAt | Timestamp | When user joined the class |
| members[].status | String | Status in class ("active", "inactive", "banned") |
| channels | Array<Object> | Array of communication channels |
| channels[].id | String | Unique channel identifier |
| channels[].name | String | Channel name |
| channels[].description | String | Channel description |
| channels[].type | String | Channel type ("announcement", "general", "help", "group") |
| channels[].createdAt | Timestamp | Channel creation timestamp |
| channels[].createdBy | String | User ID of channel creator |
| channels[].isPrivate | Boolean | Whether channel is private |
| channels[].allowedMembers | Array<String> | User IDs with access (if private) |
| units | Array<Object> | Course curriculum units |
| units[].id | String | Unique unit identifier |
| units[].title | String | Unit title |
| units[].description | String | Unit description |
| units[].position | Number | Order in curriculum |
| units[].status | String | Unit status ("draft", "active", "archived") |
| units[].startDate | Timestamp | Unit start date |
| units[].endDate | Timestamp | Unit end date |
| units[].associatedFiles | Array<String> | References to ClassFiles collection |
| units[].associatedProblems | Array<String> | References to Problems collection |
| settings | Object | Class settings |
| settings.joinCode | String | Code for students to join class |
| settings.visibility | String | Class visibility ("public", "school", "private") |
| settings.gradingSystem | Object | Class grading system configuration |

### ClassFiles
Stores files associated with classes like practice tests, worksheets, and study guides.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique file identifier |
| classId | String | Reference to Classes collection |
| unitId | String | Reference to specific unit (optional) |
| title | String | File title |
| description | String | File description |
| type | String | File type ("worksheet", "study_guide", "practice_test", "lecture_note", "mindweb") |
| fileUrl | String | URL to stored file |
| fileType | String | File extension/MIME type |
| fileSize | Number | File size in bytes |
| uploadedBy | String | User ID who uploaded (reference to Members) |
| uploadedAt | Timestamp | Upload timestamp |
| updatedAt | Timestamp | Last update timestamp |
| numProblems | Number | Number of problems (for worksheets/tests) |
| tags | Array<String> | Categorization tags |
| visibility | String | Who can see the file ("class", "unit", "group", "individual") |
| allowedUsers | Array<String> | Users with access (if restricted) |
| views | Number | View count |
| downloads | Number | Download count |

### Assignments
Stores information about class assignments.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique assignment identifier |
| classId | String | Reference to Classes collection |
| unitId | String | Reference to specific unit (optional) |
| title | String | Assignment title |
| description | String | Assignment description |
| type | String | Assignment type ("problem_set", "essay", "project", "exam", "quiz") |
| fileUrl | String | URL to assignment file (if applicable) |
| createdBy | String | User ID who created (reference to Members) |
| createdAt | Timestamp | Creation timestamp |
| dueDate | Timestamp | Assignment due date |
| points | Number | Total possible points |
| weight | Number | Assignment weight in grading |
| status | String | Assignment status ("draft", "published", "expired") |
| visibleToStudents | Boolean | Whether assignment is visible to students |
| associatedFiles | Array<String> | References to ClassFiles collection |
| submissions | Object | Student submission tracking |
| submissions.count | Number | Number of submissions received |
| submissions.graded | Number | Number of graded submissions |
| submissions.average | Number | Average score |

### Events
Stores information about class events such as review sessions, study groups, etc.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique event identifier |
| classId | String | Reference to Classes collection |
| title | String | Event title |
| description | String | Event description |
| type | String | Event type ("review_session", "study_group", "exam", "lab", "field_trip") |
| location | String | Event location |
| startDate | Timestamp | Event start date and time |
| endDate | Timestamp | Event end date and time |
| createdBy | String | User ID who created (reference to Members) |
| createdAt | Timestamp | Creation timestamp |
| updatedAt | Timestamp | Last update timestamp |
| hostId | String | User ID of event host (reference to Members) |
| recurring | Boolean | Whether event is recurring |
| recurrencePattern | String | Pattern of recurrence (if applicable) |
| attendees | Array<Object> | Array of event attendees |
| attendees[].userId | String | User ID (reference to Members) |
| attendees[].status | String | Attendance status ("going", "maybe", "declined") |
| attendees[].responseTime | Timestamp | When response was recorded |
| reminderSent | Boolean | Whether reminders were sent |
| attachments | Array<String> | References to ClassFiles collection |

### Problems
Stores information about academic problems for practice and assessment.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique problem identifier |
| classId | String | Reference to Classes collection |
| unitId | String | Reference to specific unit (optional) |
| fileId | String | Reference to ClassFiles collection (if part of a file) |
| title | String | Problem title |
| content | String | Problem content/question |
| type | String | Problem type ("conceptual", "computational", "application") |
| difficulty | String | Problem difficulty ("basic", "intermediate", "advanced") |
| skill | String | Skill being assessed |
| source | String | Source of the problem |
| solution | String | Problem solution (hidden from students) |
| hints | Array<String> | Progressive hints for solving |
| createdBy | String | User ID who created (reference to Members) |
| createdAt | Timestamp | Creation timestamp |
| points | Number | Points value |
| tags | Array<String> | Categorization tags |
| imageUrls | Array<String> | URLs to problem images (if any) |
| isPublic | Boolean | Whether problem is publicly available |

### Messages
Stores chat messages for class channels.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique message identifier |
| classId | String | Reference to Classes collection |
| channelId | String | Reference to channel in Classes.channels |
| senderId | String | User ID of sender (reference to Members) |
| content | String | Message text content |
| sentAt | Timestamp | Message sent timestamp |
| edited | Boolean | Whether message was edited |
| editedAt | Timestamp | Last edit timestamp |
| attachments | Array<Object> | Message attachments |
| attachments[].type | String | Attachment type ("file", "image", "link") |
| attachments[].url | String | URL to attachment |
| attachments[].name | String | Display name of attachment |
| attachments[].fileType | String | File type (if applicable) |
| attachments[].fileSize | Number | File size in bytes (if applicable) |
| reactions | Array<Object> | Message reactions |
| reactions[].emoji | String | Reaction emoji |
| reactions[].count | Number | Count of this reaction |
| reactions[].users | Array<String> | User IDs who reacted (reference to Members) |
| replyTo | String | ID of message being replied to (if applicable) |
| threadId | String | Thread identifier (for threaded conversations) |
| isThreadParent | Boolean | Whether message is a thread parent |
| readBy | Array<String> | User IDs who have read the message |
| mentions | Array<String> | User IDs mentioned in message |

### NodeTypes
Stores information about node types.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique node type identifier |
| name | String | Node type name |
| description | String | Node type description |
| color | String | Node type color |
| icon | String | Node type icon |
| features | Array<String> | Features associated with node type |
| features[].name | String | Feature name |
| features[].description | String | Feature description |
| features[].icon | String | Feature icon |
| features[].color | String | Feature color |





