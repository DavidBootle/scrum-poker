Building a Scrum Poker app is the perfect use case for Vue, Express, and Redis. It requires low latency (when someone votes or flips the cards, everyone should see it instantly) and temporary state storage (rooms don't need to be saved permanently in a database like PostgreSQL).

Here is exactly how to structure the Redis data model and build the application.

### 🧠 The Redis Data Model

Instead of complex SQL tables, we will use Redis **String** types to store a stringified JSON object for each room. We will also use a **TTL (Time to Live)** so rooms automatically delete themselves after 24 hours, keeping your local Redis clean.

**Redis Key structure:** `room:{roomId}`
**Value (JSON):**
```json
{
  "id": "abc-123",
  "revealed": false,
  "users": {
    "socketId_1": { "name": "Alice", "vote": "5" },
    "socketId_2": { "name": "Bob", "vote": null }
  }
}
```

---

### 🔌 Backend (Express & Socket.io)

This backend script handles creating rooms, joining, voting, and the "flip" action. It also handles cleanup when a user disconnects.

**`server.js`**
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const redis = new Redis({ host: '127.0.0.1', port: 6379 });

// Helper: Fetch room state from Redis
async function getRoom(roomId) {
  const data = await redis.get(`room:${roomId}`);
  return data ? JSON.parse(data) : null;
}

// Helper: Save room state to Redis (with a 24-hour expiration)
async function saveRoom(roomId, roomData) {
  await redis.set(`room:${roomId}`, JSON.stringify(roomData), 'EX', 86400);
}

io.on('connection', (socket) => {
  
  socket.on('join-room', async ({ roomId, name }) => {
    // 1. Fetch or create room
    let room = await getRoom(roomId);
    if (!room) {
      room = { id: roomId, revealed: false, users: {} };
    }

    // 2. Add user to room state
    room.users[socket.id] = { name, vote: null };
    await saveRoom(roomId, room);

    // 3. Track which room this socket is in (for disconnects)
    await redis.set(`socket:${socket.id}`, roomId, 'EX', 86400);

    // 4. Join socket channel and broadcast update
    socket.join(roomId);
    io.to(roomId).emit('room-update', room);
  });

  socket.on('vote', async ({ roomId, vote }) => {
    let room = await getRoom(roomId);
    if (room && room.users[socket.id] && !room.revealed) {
      room.users[socket.id].vote = vote;
      await saveRoom(roomId, room);
      io.to(roomId).emit('room-update', room);
    }
  });

  socket.on('reveal', async ({ roomId }) => {
    let room = await getRoom(roomId);
    if (room) {
      room.revealed = true;
      await saveRoom(roomId, room);
      io.to(roomId).emit('room-update', room);
    }
  });

  socket.on('reset', async ({ roomId }) => {
    let room = await getRoom(roomId);
    if (room) {
      room.revealed = false;
      // Clear all votes
      Object.keys(room.users).forEach(id => room.users[id].vote = null);
      await saveRoom(roomId, room);
      io.to(roomId).emit('room-update', room);
    }
  });

  socket.on('disconnect', async () => {
    const roomId = await redis.get(`socket:${socket.id}`);
    if (roomId) {
      let room = await getRoom(roomId);
      if (room && room.users[socket.id]) {
        delete room.users[socket.id];
        await saveRoom(roomId, room);
        io.to(roomId).emit('room-update', room);
      }
      await redis.del(`socket:${socket.id}`);
    }
  });
});

server.listen(3000, () => console.log('🚀 Scrum Poker backend running on port 3000'));
```

---

### ⚡ Frontend (Vue 3 Composition API)

This single-file Vue component manages two states: the "Lobby" (where you pick a name and room) and the "Poker Table".

**`App.vue`**
```vue
<template>
  <div class="app">
    <h1>🃏 Scrum Poker</h1>

    <!-- LOBBY SCREEN -->
    <div v-if="!joined" class="card lobby">
      <h2>Join a Room</h2>
      <input v-model="displayName" placeholder="Your Display Name" />
      <input v-model="roomId" placeholder="Room Code (e.g., sprint-12)" />
      <button :disabled="!displayName || !roomId" @click="joinRoom">Join Table</button>
    </div>

    <!-- POKER TABLE SCREEN -->
    <div v-else class="table-view">
      <div class="header">
        <h2>Room: {{ roomId }}</h2>
        <div class="controls">
          <button v-if="!roomState.revealed" @click="revealCards" class="btn-primary">Flip Cards</button>
          <button v-else @click="resetTable" class="btn-secondary">New Round</button>
        </div>
      </div>

      <!-- PLAYERS GRID -->
      <div class="players">
        <div v-for="(user, id) in roomState.users" :key="id" class="player-card">
          <div class="card-face" :class="{ 'has-voted': user.vote && !roomState.revealed, 'revealed': roomState.revealed }">
             <!-- Hide vote unless revealed -->
             <span v-if="!roomState.revealed">{{ user.vote ? '✔️' : '...' }}</span>
             <span v-else>{{ user.vote || 'No Vote' }}</span>
          </div>
          <div class="player-name">{{ user.name }}</div>
        </div>
      </div>

      <!-- VOTING CONTROLS -->
      <div class="voting-deck" v-if="!roomState.revealed">
        <h3>Select your estimate:</h3>
        <div class="deck">
          <button 
            v-for="point in points" 
            :key="point" 
            @click="castVote(point)"
            :class="{ 'selected': myVote === point }"
          >
            {{ point }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// App State
const joined = ref(false);
const displayName = ref('');
const roomId = ref('');
const roomState = ref({ users: {}, revealed: false });
const points = [1, 2, 3, 5, 8, 13, 21, '?'];

// Computed: find my own vote based on socket ID
const myVote = computed(() => {
  return roomState.value.users[socket.id]?.vote || null;
});

// Actions
const joinRoom = () => {
  socket.emit('join-room', { roomId: roomId.value, name: displayName.value });
  joined.value = true;
};

const castVote = (point) => {
  socket.emit('vote', { roomId: roomId.value, vote: point });
};

const revealCards = () => socket.emit('reveal', { roomId: roomId.value });
const resetTable = () => socket.emit('reset', { roomId: roomId.value });

// Socket Listeners
socket.on('room-update', (newRoomState) => {
  roomState.value = newRoomState;
});
</script>

<style scoped>
.app { max-width: 800px; margin: 40px auto; font-family: sans-serif; text-align: center; }
.card { background: #f4f4f5; padding: 30px; border-radius: 12px; display: inline-block; }
.lobby input { display: block; margin: 10px auto; padding: 10px; width: 80%; }
.lobby button { margin-top: 15px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.btn-primary { background: #16a34a; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-secondary { background: #ef4444; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;}
.players { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-bottom: 40px; }
.player-card { display: flex; flex-direction: column; align-items: center; }
.card-face { width: 60px; height: 90px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 8px; background: #f8fafc; color: #94a3b8; transition: 0.3s; }
.card-face.has-voted { background: #3b82f6; border-color: #2563eb; color: white; }
.card-face.revealed { background: white; border: 2px solid #10b981; color: #0f766e; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.voting-deck { background: #f1f5f9; padding: 20px; border-radius: 12px; }
.deck { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.deck button { width: 50px; height: 70px; font-size: 20px; font-weight: bold; background: white; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; }
.deck button:hover { border-color: #3b82f6; }
.deck button.selected { background: #3b82f6; color: white; border-color: #2563eb; transform: translateY(-5px); }
</style>
```

**Key Takeaway:** Notice how the frontend is completely "dumb". It just emits an action (e.g., `castVote`) and waits for the backend to emit `room-update`. This single-source-of-truth model prevents the UI from desyncing across different browsers.

# File System
```
scrumpoker/
├── backend/                  # Express + Redis Server
│   ├── node_modules/
│   ├── server.js             # Entry point (Express + Socket.io setup)
│   ├── redisClient.js        # Redis connection pooling & helper exports
│   ├── package.json
│   └── .env
└── frontend/                 # Vue 3 App (Vite)
    ├── src/
    │   ├── services/
    │   │   └── socket.js     # Global Socket.io configuration
    │   ├── App.vue
    │   └── main.js
    ├── package.json
    └── vite.config.js
```