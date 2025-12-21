# Tagum UYnite - Real-Time Messaging API Documentation

## Base URL
```
Production: https://your-railway-app.railway.app
Development: http://localhost:3000
```

## Authentication
Store user information in localStorage as `user_token` with the following structure:
```javascript
{
  id: 1,
  username: "user123",
  email: "user@example.com",
  role: "user", // or "admin"
  firstName: "John",
  lastName: "Doe",
  department_id: 1 // for admins only
}
```

## WebSocket Connection (Socket.IO)

### Connect to Socket.IO
```javascript
const socket = io('http://localhost:3000'); // or your production URL

socket.on('connect', () => {
    console.log('Connected to messaging server');
});
```

### Join a Conversation Room
```javascript
socket.emit('join_conversation', conversationId);
```

### Listen for New Messages
```javascript
socket.on('new_message', (data) => {
    console.log('New message received:', data);
    // data structure:
    // {
    //   id: 123,
    //   sender_id: 1,
    //   conversation_id: 5,
    //   message: "Hello!",
    //   sender_name: "John Doe",
    //   created_at: "2025-12-22T03:00:00.000Z"
    // }
});
```

### Leave a Conversation Room
```javascript
socket.emit('leave_conversation', conversationId);
```

---

## REST API Endpoints

### 1. Get User's Conversations
**Endpoint:** `GET /api/conversations/:userId`

**Query Parameters:**
- `role` (optional): "user" or "admin"
- `department_id` (optional): Required if role is "admin"

**Example Request (User):**
```javascript
const userId = 1;
const response = await fetch(`http://localhost:3000/api/conversations/${userId}?role=user`);
const conversations = await response.json();
```

**Example Request (Admin):**
```javascript
const userId = 2;
const departmentId = 1;
const response = await fetch(
    `http://localhost:3000/api/conversations/${userId}?role=admin&department_id=${departmentId}`
);
const conversations = await response.json();
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "department_id": 1,
    "created_at": "2025-12-21T15:56:50.000Z",
    "updated_at": "2025-12-21T16:31:44.000Z",
    "department_name": "Engineering",
    "user_name": "John Doe",
    "profile_photo": "https://example.com/photo.jpg",
    "last_message": "Hello, I need help",
    "last_message_time": "2025-12-21T16:31:44.000Z"
  }
]
```

---

### 2. Create New Conversation
**Endpoint:** `POST /api/conversations`

**Request Body:**
```json
{
  "user_id": 1,
  "department_id": 2
}
```

**Example Request:**
```javascript
const response = await fetch('http://localhost:3000/api/conversations', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        user_id: 1,
        department_id: 2
    })
});
const result = await response.json();
```

**Response:**
```json
{
  "id": 5,
  "message": "Conversation created successfully"
}
```

---

### 3. Get Messages in a Conversation
**Endpoint:** `GET /api/conversations/:id/messages`

**Example Request:**
```javascript
const conversationId = 1;
const response = await fetch(`http://localhost:3000/api/conversations/${conversationId}/messages`);
const messages = await response.json();
```

**Response:**
```json
[
  {
    "id": 1,
    "sender_id": 1,
    "conversation_id": 1,
    "message": "Hello!",
    "created_at": "2025-12-21T15:56:50.000Z",
    "sender_name": "John Doe",
    "profile_photo": "https://example.com/photo.jpg",
    "role": "user"
  },
  {
    "id": 2,
    "sender_id": 2,
    "conversation_id": 1,
    "message": "Hi! How can I help you?",
    "created_at": "2025-12-21T16:00:00.000Z",
    "sender_name": "Admin User",
    "profile_photo": null,
    "role": "admin"
  }
]
```

---

### 4. Send a Message
**Endpoint:** `POST /api/messages`

**Request Body:**
```json
{
  "sender_id": 1,
  "conversation_id": 1,
  "message": "Hello, I need assistance"
}
```

**Example Request:**
```javascript
const response = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        sender_id: 1,
        conversation_id: 1,
        message: "Hello, I need assistance"
    })
});
const result = await response.json();
```

**Response:**
```json
{
  "success": true,
  "id": 123,
  "message": "Message sent successfully"
}
```

**Note:** This endpoint automatically broadcasts the message to all participants in the conversation via Socket.IO.

---

## Complete Integration Example

```javascript
// Initialize Socket.IO
const socket = io('http://localhost:3000');

// Get current user
const user = JSON.parse(localStorage.getItem('user_token'));

// Load conversations
async function loadConversations() {
    const queryParams = user.role === 'admin' 
        ? `?role=admin&department_id=${user.department_id}`
        : `?role=user`;
    
    const response = await fetch(`http://localhost:3000/api/conversations/${user.id}${queryParams}`);
    const conversations = await response.json();
    
    // Display conversations in UI
    conversations.forEach(conv => {
        console.log(`${conv.user_name} - ${conv.department_name}: ${conv.last_message}`);
    });
}

// Open a conversation
async function openConversation(conversationId) {
    // Join the conversation room
    socket.emit('join_conversation', conversationId);
    
    // Load messages
    const response = await fetch(`http://localhost:3000/api/conversations/${conversationId}/messages`);
    const messages = await response.json();
    
    // Display messages in UI
    messages.forEach(msg => {
        console.log(`${msg.sender_name}: ${msg.message}`);
    });
}

// Send a message
async function sendMessage(conversationId, messageText) {
    const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sender_id: user.id,
            conversation_id: conversationId,
            message: messageText
        })
    });
    
    const result = await response.json();
    console.log('Message sent:', result);
}

// Listen for new messages
socket.on('new_message', (data) => {
    console.log('New message:', data);
    // Update UI with new message
    // Only update if the message is for the currently open conversation
});

// Start the app
loadConversations();
```

---

## User Flow

### For Regular Users:
1. User selects a department they want to message
2. System creates a conversation (or uses existing one) via `POST /api/conversations`
3. User joins the conversation room via Socket.IO
4. User can send messages via `POST /api/messages`
5. User receives real-time messages via Socket.IO `new_message` event

### For Admins:
1. Admin sees all conversations for their assigned department
2. Admin can respond to any conversation in their department
3. Messages are delivered in real-time to the user

---

## Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing parameters)
- `401`: Unauthorized (invalid credentials)
- `404`: Not Found
- `500`: Server Error
- `503`: Service Unavailable (no database connection)

---

## Database Schema Reference

### conversations table
- `id`: bigint (primary key)
- `user_id`: bigint (foreign key to users)
- `department_id`: bigint (foreign key to departments)
- `created_at`: timestamp
- `updated_at`: timestamp

### messages table
- `id`: bigint (primary key)
- `sender_id`: bigint (foreign key to users)
- `conversation_id`: bigint (foreign key to conversations)
- `message`: text
- `created_at`: timestamp
- `updated_at`: timestamp

---

## Support

For questions or issues, contact the development team.

**Server Status:** Check `GET /api/health` for server health status.
