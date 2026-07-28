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
          <div class="card-face" :class="{ 'has-voted': user.vote !== null && !roomState.revealed, 'revealed': roomState.revealed }">
             <span v-if="!roomState.revealed">{{ user.vote !== null ? '✔️' : '...' }}</span>
             <span v-else>{{ user.vote !== null ? user.vote : 'No Vote' }}</span>
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

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue';
import { io, Socket } from 'socket.io-client';

// ─── TYPESCRIPT INTERFACES (Must match the backend) ──────────────────
interface User {
  name: string;
  vote: number | string | null;
}

interface Room {
  id: string;
  revealed: boolean;
  users: Record<string, User>;
}
// ───────────────────────────────────────────────────────────────────

// Connect to the backend server running on port 3000
const socket: Socket = io('http://localhost:3000');

// App State
const joined: Ref<boolean> = ref(false);
const displayName: Ref<string> = ref('');
const roomId: Ref<string> = ref('');
const roomState: Ref<Room> = ref({ id: '', revealed: false, users: {} });
const points: (number | string)[] = [0, 1, 2, 3, 5, 8, 13, 21, '?'];

// Computed property to find the current user's vote
const myVote = computed<number | string | null>(() => {
  return roomState.value.users[socket.id as string]?.vote ?? null;
});

// --- Actions that EMIT events to the backend ---
const joinRoom = (): void => {
  socket.emit('join-room', { roomId: roomId.value, name: displayName.value });
  joined.value = true;
};

const castVote = (point: number | string): void => {
  socket.emit('vote', { roomId: roomId.value, vote: point });
};

const revealCards = (): void => {
  socket.emit('reveal', { roomId: roomId.value });
};

const resetTable = (): void => {
  socket.emit('reset', { roomId: roomId.value });
};

// --- Listener that REACTS to events from the backend ---
socket.on('room-update', (newRoomState: Room) => {
  roomState.value = newRoomState;
});
</script>

<style scoped>
.app { max-width: 800px; margin: 40px auto; font-family: sans-serif; text-align: center; color: #333; }
.card { background: #f9fafb; padding: 30px; border-radius: 12px; display: inline-block; border: 1px solid #e5e7eb; }
.lobby input { display: block; margin: 12px auto; padding: 12px; width: 250px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 1rem; }
.lobby button { margin-top: 15px; padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold; }
.lobby button:disabled { background: #a5b4fc; cursor: not-allowed; }
.table-view { text-align: left; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.header h2 { margin: 0; }
.btn-primary { background: #16a34a; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-secondary { background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;}
.players { display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; margin-bottom: 40px; min-height: 150px; }
.player-card { display: flex; flex-direction: column; align-items: center; }
.player-name { margin-top: 8px; font-weight: 500; }
.card-face { width: 60px; height: 90px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; background: #f8fafc; color: #94a3b8; transition: all 0.3s ease; }
.card-face.has-voted { background: #3b82f6; border-color: #2563eb; color: white; transform: translateY(-5px); }
.card-face.revealed { background: white; border: 2px solid #10b981; color: #0f766e; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transform: rotateY(180deg); }
.voting-deck { background: #f1f5f9; padding: 20px; border-radius: 12px; margin-top: 20px; }
.deck { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.deck button { width: 50px; height: 70px; font-size: 20px; font-weight: bold; background: white; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
.deck button:hover { border-color: #3b82f6; }
.deck button.selected { background: #3b82f6; color: white; border-color: #2563eb; transform: translateY(-5px); box-shadow: 0 6px 10px -3px #3b82f6; }
</style>