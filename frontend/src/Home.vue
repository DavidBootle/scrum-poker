<script setup>
import { onMounted } from 'vue';
import router from './router';

onMounted(() => {
    document.title = 'Scrum Poker';
});

function generateRoomId() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}

const newRoom = () => {

    // Generate new room id
    const roomId = generateRoomId();

    // push to new page
    router.push(`/${roomId}`)

};
</script>

<template>
    <div class="poker-container">
        <header class="poker-header">
            <span class="logo-icon" v-twemoji>♠️</span>
            <h1>Bootle's Scrum Poker</h1>
        </header>

        <!-- LOBBY SCREEN -->
        <main class="lobby-card">
            <h2>Create a New Room</h2>
            
            <button 
                @click="newRoom"
                class="join-button"
            >
                Get Started!
            </button>
        </main>
    </div>
</template>

<style>
.poker-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90vh;
    padding: 20px;
    box-sizing: border-box;
}

/* 4. The Card (Lobby Screen) */
.lobby-card {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4),
                0 0 50px rgba(99, 102, 241, 0.1);
    text-align: center;
    box-sizing: border-box;
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
