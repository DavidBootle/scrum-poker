<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { io } from 'socket.io-client';
import router from './router';

onMounted(() => {
    document.title = 'Scrum Poker Room'
    if (!socket.connected) {
        socket.connect();
    }
});

const route = useRoute();
const cardValues = ref(['?', '0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '∞', '🦀'])
const currentVote = ref(null);
const isRevealed = ref(false);
const userList = ref([]);
const joining = ref(true);
const userName = ref('');
const loading = ref(false);
const socket = io(import.meta.env.VITE_SOCKET_URL);

socket.on('connect_error', (error) => {
    console.error("Socket failed to connect!");
    console.error(error);

    alert("Failed to connect to server. Please try again later.");

    // push to new page
    router.push('/');
})

socket.on('room-update', (updatedRoom) => {
    isRevealed.value = updatedRoom.revealed;
    // CRITICAL FIX: Add socket ID for a unique :key in v-for
    userList.value = Object.entries(updatedRoom.users)
        .map(([id, user]) => ({...user, id}))
        .sort((a, b) => a.name.localeCompare(b.name) );
    loading.value = false;
});

/**
 * Somebody has triggered the removal of this user from the room
 * Reload the page. If the user was still logged in, this will
 * Send them back to join and allow them to choose a new name.
 * Otherwise, this will have no effect.
 */
socket.on('user-removed', () => {
    window.location.reload()
})

/**
 * Somebody has triggered room reset. Set your
 * vote back to null.
 */
socket.on('room-reset', () => {
    currentVote.value = null;
})

/**
 * The server is upset that something we did
 * wasn't allowed. This usually means that
 * something went wrong on the client or server
 * or that the data in the database expired.
 * Send the user back to the home page
 * with a warning.
 */
socket.on('invalid-command', () => {

    alert('Something went wrong. Please create a new room or use a different link.');

    // push to new page
    window.navigation.navigate('/');
});

const joinRoom = () => {
    const roomId = route.params.id;
    socket.emit('join-room', {
        roomId: roomId,
        name: userName.value
    });
    joining.value = false;
    loading.value = true;
};

const selectVote = (value) => {
    const newVote = currentVote.value === value ? null : value;
    currentVote.value = newVote;
    
    const roomId = route.params.id;
    socket.emit('vote', {
        roomId: roomId,
        vote: newVote 
    });
};

const removeUser = (userNameValue) => {
    const roomId = route.params.id;
    
    // verify with browser confirmation
    if(confirm(`Are you sure you want to remove ${userNameValue}?`)) {
        socket.emit('remove-user', {
            roomId, roomId,
            name: userNameValue
        })
    }
}

const toggleReveal = () => {
    const roomId = route.params.id;
    socket.emit('reveal', { roomId: roomId });
};

const resetRoom = () => {
    const roomId = route.params.id;
    socket.emit('reset', { roomId: roomId });
}

// When the app is dismounted, delete the socket
onUnmounted(() => {
    socket.disconnect();
})

</script>

<template>
    <!-- New wrapper for centering content -->
    <div class="app-container">
        <main :class="['card-container', joining ? 'is-joining' : 'is-playing']">
            <!-- LOADING SPINNER -->
            <div v-if="loading" class="loading-container">
                 <div class="spinner"></div>
            </div>

            <!-- JOINING SCREEN -->
            <div v-if="!loading && joining" class="join-screen">
                <h2>Join Room</h2>
                <p class="subtitle">Enter your name to start the session.</p>
                <div class="form-group">
                    <input 
                        v-model="userName" 
                        placeholder="Your Display Name" 
                        class="name-input"
                        maxlength="20"
                        @keyup.enter="() => userName.trim() && joinRoom()"
                    />
                </div>
                <button 
                    :disabled="!userName.trim()" 
                    @click="joinRoom"
                    class="action-button primary"
                >
                    Join Room
                </button>
            </div>

            <!-- GAME SCREEN -->
            <div v-if="!loading && !joining" class="game-board">
                <header class="poker-header centered">
                    <span class="logo-icon">♠️</span>
                    <h1>Bootle's Scrum Poker</h1>
                </header>
                <!-- Current Player's Voting Hand -->
                <section class="player-hand">
                     <h3 class="section-title">You are <span class="highlight">{{ userName }}</span></h3>
                    <div class="pointSelectionContainer">
                        <div
                            v-for="value in cardValues"
                            :key="value"
                            class="card vote-card"
                            :class="{ 'selected': value === currentVote }"
                            @click="selectVote(value)"
                        >
                            {{ value }}
                        </div>
                    </div>
                     <div class="action-buttons-group">
                        <button @click="toggleReveal" class="action-button secondary">{{ isRevealed ? 'Hide Votes' : 'Reveal Votes' }}</button>
                        <button @click="resetRoom" class="action-button tertiary">Reset Room</button>
                    </div>
                </section>
                
                <div class="divider-line"></div>
                
                <!-- Other Players' Cards -->
                <section class="player-table">
                    <div class="userCardsContainer">
                        <div
                            v-for="user in userList"
                            :key="user.id"
                            class="userContainer"
                            @click="() => removeUser(user.name)"
                        >
                            <div 
                                class="card table-card"
                                :class="{ 'voted': user.vote !== null, 'revealed': isRevealed }"
                            >
                                <div class="card-face card-front">{{ isRevealed ? user.vote || '?' : '' }}</div>
                                <div class="card-face card-back"></div>
                            </div>
                            <div v-if="user.name !== userName" class="playerName">{{ user.name }}</div>
                            <div v-else class="playerName highlight">{{ user.name }}</div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>
</template>

<style>
/* 1. Global Styles & Theme */
:root {
    --bg-color: #0f172a;
    --card-bg: rgba(30, 41, 59, 0.7);
    --border-color: rgba(255, 255, 255, 0.1);
    --primary-accent: #6366f1;
    --primary-accent-dark: #4f46e5;
    --secondary-accent: #a78bfa;
    --text-light: #f8fafc;
    --text-muted: #94a3b8;
    --card-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.4);
}
body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-color);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text-light);
}

/* 2. Main Layout & Centering */
.app-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1.25rem;
    box-sizing: border-box;
}
.card-container {
    background: var(--card-bg);
    backdrop-filter: blur(15px);
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    padding: 2.5rem;
    box-shadow: var(--card-shadow);
    width: 100%;
}
.card-container.is-joining {
    max-width: 26.25rem;
    text-align: center;
}
.card-container.is-playing {
    max-width: 67rem;
}

/* 3. Typography & Shared */
h2 { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem 0; }
.subtitle, .section-title { font-size: 1rem; color: var(--text-muted); margin-bottom: 2rem; }
.section-title { text-align: center; font-weight: 600; }
.highlight { color: var(--primary-accent) !important; font-weight: 700 !important; }
.divider-line { height: 1px; width: 100%; background: var(--border-color); margin: 2.5rem 0; }

/* 4. Action Buttons (Refactored) */
.action-button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%; /* Default to full width */
}
.action-button.primary {
    color: white;
    background: linear-gradient(135deg, var(--primary-accent) 0%, var(--primary-accent-dark) 100%);
    box-shadow: 0 0.25rem 0.75rem rgba(99, 102, 241, 0.3);
}
.action-button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0.375rem 1.25rem rgba(99, 102, 241, 0.45);
}
.action-button.primary:disabled {
    background: #334155;
    color: #64748b;
    cursor: not-allowed;
    box-shadow: none;
}
.action-button.secondary {
    background-color: #334155;
    color: var(--text-light);
}
.action-button.secondary:hover {
    background-color: #475569;
}
.action-button.tertiary {
    background-color: transparent;
    color: var(--text-muted);
}
.action-button.tertiary:hover {
    background-color: #334155;
    color: var(--text-light);
}

/* 5. Join Form */
.form-group { margin-bottom: 1.5rem; }
.name-input {
    width: 100%; padding: 0.875rem 1.125rem; font-size: 1rem;
    background: #0f172a; border: 2px solid #334155;
    border-radius: 0.75rem; color: var(--text-light);
    box-sizing: border-box; transition: all 0.25s ease;
}
.name-input:focus {
    outline: none; border-color: var(--primary-accent);
    box-shadow: 0 0 0 0.25rem rgba(99, 102, 241, 0.15);
}

/* 6. Player Hand & Vote Cards */
.pointSelectionContainer {
    display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;
}
.action-buttons-group {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    flex-wrap: wrap;
}
.action-buttons-group > .action-button {
    width: auto; /* Override full-width for grouped buttons */
}
.card {
    aspect-ratio: 2.5 / 3.5; border-radius: 0.5rem;
    display: flex; justify-content: center; align-items: center;
    font-size: 1.75rem; font-weight: bold; user-select: none;
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.vote-card {
    width: 3.75rem; border: 2px solid #4a5568;
    background: #1e293b; cursor: pointer;
}
.vote-card:hover { transform: translateY(-0.5rem); border-color: var(--primary-accent); }
.vote-card.selected {
    transform: translateY(-0.25rem) scale(1.05);
    background: var(--primary-accent); border-color: var(--primary-accent-dark);
    color: white; box-shadow: 0 0.25rem 1rem rgba(99, 102, 241, 0.4);
}

/* 7. Player Table */
.userCardsContainer {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.625rem, 1fr));
    gap: 2rem 1rem;
    justify-content: center; /* This centers the items in the grid */
}
.userContainer { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.playerName { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); text-align: center; }
.table-card {
    width: 4.375rem; background: #1e293b;
    border: 2px solid #334155; position: relative;
    transform-style: preserve-3d;
}
.table-card.voted { border-color: var(--secondary-accent); }
.table-card.revealed { transform: rotateY(180deg); }
.card-face {
    position: absolute; width: 100%; height: 100%;
    backface-visibility: hidden; display: flex;
    justify-content: center; align-items: center; border-radius: 0.375rem;
}
.card-front { background: #312e81; transform: rotateY(180deg); }
.card-back {
    background: linear-gradient(145deg, #4f46e5, #7c3aed);
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23DDDDDD44' stroke-width='4' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
}

/* 8. Loading Spinner */
.loading-container {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1rem; min-height: 12.5rem;
    color: var(--text-muted);
}
.spinner {
    width: 3rem; height: 3rem; border: 0.25rem solid #334155;
    border-bottom-color: var(--primary-accent); border-radius: 50%;
    display: inline-block; box-sizing: border-box;
    animation: rotation 1s linear infinite;
}
@keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.poker-header.centered {
    justify-content: center;
}
</style>
