<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { io } from 'socket.io-client';
import router from './router';

import '@/css/themes/default.css';

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
const mostCommonVote = ref(null);
const joining = ref(true);
const userName = ref('');
const loading = ref(false);

/**
 * Calculates the most common vote
 * in order to display the concurrence glow
 * @param users 
 */
const calculateMostCommonVote = (users) => {
    const voteCounts = {};
    // for each user, gather up the votes
    for (const user of users) {
        const vote = user.vote;
        if (vote === null || vote === undefined) {
            continue;
        }
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    }
    
    // if there are no votes, then
    // there cannot be concurrence
    if (Object.keys(voteCounts).length === 0) {
        return null;
    }
    
    // if there are at least two items, sort the
    // votes by the number of occurences
    const sortedItems = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1]);

    console.log(sortedItems);
    
    // if there is a tie between the top two votes
    // do not show concurrence glow
    if (sortedItems.length >= 2 && sortedItems[0][1] === sortedItems[1][1]) {
        return null;
    }

    // otherwise, return the most voted items
    return sortedItems[0][0];
};

const socket = io(import.meta.env.VITE_SOCKET_URL, {
    path: import.meta.env.VITE_SOCKET_PATH,
    transports: ["websocket", "polling"]
});

socket.on('connect_error', (error) => {
    console.error("Socket failed to connect!");

    alert("Failed to connect to server. Please try again later.");

    // push to new page
    router.push('/');

    throw error;
})

socket.on('room-update', (updatedRoom) => {
    isRevealed.value = updatedRoom.revealed;
    userList.value = Object.entries(updatedRoom.users)
        .map(([id, user]) => ({...user, id}))
        .sort((a, b) => a.name.localeCompare(b.name) );

    mostCommonVote.value = calculateMostCommonVote(userList.value);

    console.log(mostCommonVote.value);

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
                    <span v-twemoji class="logo-icon">♠️</span>
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
                
                <!-- Other Players Cards -->
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
                                :class="{
                                    'voted': user.vote !== null,
                                    'revealed': isRevealed,
                                    'concurrence': user.vote === mostCommonVote && mostCommonVote !== null
                                }"
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

<style scoped>

.card-container {
    background: var(--card-bg);
    backdrop-filter: blur(15px);
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    padding: 2.5rem;
    box-shadow: var(--card-shadow);
    width: 100%;
    box-sizing: border-box;
}
.app-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
    box-sizing: border-box;
}
.card-container.is-joining {
    max-width: 26.25rem;
    text-align: center;
}
.card-container.is-playing {
    max-width: 72rem;
}

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
    color: var(--text-on-accent);
    background: linear-gradient(135deg, var(--primary-accent) 0%, var(--primary-accent-dark) 100%);
    box-shadow: 0 0.25rem 0.75rem var(--accent-shadow);
}
.action-button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0.375rem 1.25rem var(--accent-shadow-hover);
}
.action-button.primary:disabled {
    background: var(--surface-dark);
    color: var(--text-disabled);
    cursor: not-allowed;
    box-shadow: none;
}
.action-button.secondary {
    background-color: var(--surface-dark);
    color: var(--text-light);
}
.action-button.secondary:hover {
    background-color: var(--surface-dark-hover);
}
.action-button.tertiary {
    background-color: var(--transparent);
    color: var(--text-muted);
}
.action-button.tertiary:hover {
    background-color: var(--surface-dark);
    color: var(--text-light);
}

/* 5. Join Form */
.form-group { margin-bottom: 1.5rem; }
.name-input {
    width: 100%; padding: 0.875rem 1.125rem; font-size: 1rem;
    background: var(--surface-input); border: 2px solid var(--border-input);
    border-radius: 0.75rem; color: var(--text-light);
    box-sizing: border-box; transition: all 0.25s ease;
}
.name-input:focus {
    outline: none; border-color: var(--primary-accent);
    box-shadow: 0 0 0 0.25rem var(--accent-shadow-focus);
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
    width: 3.75rem; border: 2px solid var(--border-card);
    background: var(--surface-card); cursor: pointer;
}
.vote-card:hover { transform: translateY(-0.5rem); border-color: var(--primary-accent); }
.vote-card.selected {
    transform: translateY(-0.25rem) scale(1.05);
    background: var(--primary-accent); border-color: var(--primary-accent-dark);
    color: var(--text-on-accent); box-shadow: 0 0.25rem 1rem var(--accent-shadow-selected);
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
    width: 4.375rem; background: var(--surface-card);
    border: 2px solid var(--border-input); position: relative;
    transform-style: preserve-3d;
}
.table-card.voted { border-color: var(--secondary-accent); }
.table-card.revealed { transform: rotateY(180deg); }
.table-card.concurrence.revealed { box-shadow: 0 0 20px var(--concurrence-glow) }

.card-face {
    position: absolute; width: 100%; height: 100%;
    backface-visibility: hidden; display: flex;
    justify-content: center; align-items: center; border-radius: 0.375rem;
}
.card-front { background: var(--card-front-bg); transform: rotateY(180deg); }
.card-back {
    background: linear-gradient(145deg, var(--card-back-start), var(--card-back-end));
    background-image: var(--card-back-pattern);
}

/* 8. Loading Spinner */
.loading-container {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1rem; min-height: 12.5rem;
    color: var(--text-muted);
}
.spinner {
    width: 3rem; height: 3rem; border: 0.25rem solid var(--surface-dark);
    border-bottom-color: var(--primary-accent); border-radius: 50%;
    display: inline-block; box-sizing: border-box;
    animation: rotation 1s linear infinite;
}
@keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.form-group {
    margin-bottom: 1.5rem;
    position: relative;
}

.name-input {
    width: 100%;
    padding: 14px 18px;
    font-size: 1rem;
    background: #0f172a;
    border: 2px solid #334155;
    border-radius: 12px;
    color: #f8fafc;
    box-sizing: border-box;
    transition: all 0.25s ease;
}

.name-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.name-input::placeholder {
    color: #64748b;
}

</style>
