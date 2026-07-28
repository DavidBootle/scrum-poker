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
            <span class="logo-icon">♠️</span>
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
/* 1. Global Reset & Theme Variables */
body {
    margin: 0;
    padding: 0;
    background-color: #0f172a; /* Deep slate background */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
}

/* 2. Layout Wrapper */
.poker-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90vh;
    padding: 20px;
    box-sizing: border-box;
}

/* 3. Header Styling */
.poker-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 2rem;
    animation: fadeInDown 0.6s ease;
}

.logo-icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5));
}

h1 {
    font-size: 2.25rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
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

h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 0.5rem 0;
}

.subtitle {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-bottom: 2rem;
}

/* 5. Input Fields */
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

/* 6. Primary Button */
.join-button {
    width: 100%;
    padding: 14px;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    transition: all 0.2s ease;
}

.join-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    background: linear-gradient(135deg, #818cf8 0%, #4338ca 100%);
}

.join-button:active:not(:disabled) {
    transform: translateY(1px);
}

.join-button:disabled {
    background: #334155;
    color: #64748b;
    cursor: not-allowed;
    box-shadow: none;
}

/* 7. Keyframe Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
