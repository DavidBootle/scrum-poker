"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
// APP CREATION
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
const redis = new ioredis_1.default(process.env.DOCKER_CONTAINER === "true" ? { host: 'redis', port: 6379 } : { host: '127.0.0.1', port: 6379 });
/**
 * Helper functions to get room state from Redis
 */
function getRoom(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield redis.get(`room:${roomId}`);
        return data ? JSON.parse(data) : null;
    });
}
/**
 * Helper function to save room state to Redis with 24 hour expiration
 */
function saveRoom(roomId, roomData) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.set(`room:${roomId}`, JSON.stringify(roomData), 'EX', 86400);
    });
}
// IO CONNECTION
io.on('connection', (socket) => {
    console.debug(`User ${socket.id} connected`);
    /**
     * A client is attempting to join a room
     */
    socket.on('join-room', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, name, observer }) {
        var _b, _c;
        // Get room data and create room if it doesn't already exist
        let room = yield getRoom(roomId);
        if (!room) {
            room = { id: roomId, revealed: false, users: {} };
        }
        // verify no other users in the room have that name
        for (let userSocket in room.users) {
            let username = room.users[userSocket].name;
            if (username === name) {
                // this is invalid, two users cannot have the same name
                // the default behavior is to replace the old user with the new one
                // Remove the user from the users list
                delete room.users[userSocket];
                // remove tracking key for user-to-room mapping
                yield redis.del(`socket:${userSocket}`);
                // Send a user-removed to the removed user
                (_b = io.sockets.sockets.get(userSocket)) === null || _b === void 0 ? void 0 : _b.emit('user-removed');
                // disconnect their socket
                (_c = io.sockets.sockets.get(userSocket)) === null || _c === void 0 ? void 0 : _c.disconnect();
                console.debug(`User ${userSocket} was removed from ${roomId} due to duplicate`);
            }
        }
        // Add user to room state
        room.users[socket.id] = { name, vote: null, observer: observer || false };
        yield saveRoom(roomId, room);
        // Track socket to room id in redis
        yield redis.set(`socket:${socket.id}`, roomId, 'EX', 86400);
        // Join a (socket.io) room and push an update to all users in that room
        socket.join(roomId);
        io.to(roomId).emit('room-update', room);
        console.debug(`User ${socket.id} joined room ${roomId}`);
    }));
    /**
     * A client is attempting to vote in a room
     */
    socket.on('vote', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, vote }) {
        // get room info
        let room = yield getRoom(roomId);
        // if the room exists and the user is in the room
        if (room && room.users[socket.id]) {
            room.users[socket.id].vote = vote;
            yield saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            console.debug(`User ${socket.id} voted ${vote} in room ${roomId}`);
        }
        else {
            console.warn(`User ${socket.id} attempted to vote in room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`);
            socket.emit('invalid-command');
        }
    }));
    /**
     * A client is attempting to toggle the reveal
     */
    socket.on('reveal', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId }) {
        let room = yield getRoom(roomId);
        // if room exists then toggle reveal
        if (room && room.users[socket.id]) {
            room.revealed = !room.revealed;
            yield saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            console.debug(`User ${socket.id} set visibility to ${room.revealed} in room ${roomId}`);
        }
        else {
            console.warn(`User ${socket.id} attempted to toggle visibility in room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`);
            socket.emit('invalid-command');
        }
    }));
    /**
     * A client is attempting to reset everybody's points
     */
    socket.on('reset', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId }) {
        let room = yield getRoom(roomId);
        // if the room exists, then reset everyone's votes to null
        if (room && room.users[socket.id]) {
            room.revealed = false;
            const users = room.users;
            Object.keys(users).forEach(id => users[id].vote = null);
            yield saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            io.to(roomId).emit('room-reset');
            console.debug(`User ${socket.id} reset room ${roomId}`);
        }
        else {
            console.warn(`User ${socket.id} attempted to reset room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`);
            socket.emit('invalid-command');
        }
    }));
    /**
     * A client is attempting to change their observer state
     */
    socket.on('set-visibility', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, observer }) {
        let room = yield getRoom(roomId);
        // if the room exists and the user is in the room
        if (room && room.users[socket.id]) {
            room.users[socket.id].observer = observer;
            yield saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            console.debug(`User ${socket.id} set observer to ${observer} in room ${roomId}`);
        }
        else {
            console.warn(`User ${socket.id} attempted to set observer state in room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`);
            socket.emit('invalid-command');
        }
    }));
    /**
     * A client wishes to remove a user from a room.
     */
    socket.on('remove-user', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, name }) {
        var _b, _c;
        let room = yield getRoom(roomId);
        // if the room exists, remove any user with that username from the users list
        if (room) {
            const entryToRemove = Object.entries(room.users).find(([id, user]) => user.name === name);
            // if that user does exist
            if (entryToRemove) {
                const socketIdOfUser = entryToRemove[0];
                // Remove the user from the users list
                delete room.users[socketIdOfUser];
                // remove tracking key for user-to-room mapping
                yield redis.del(`socket:${socketIdOfUser}`);
                // Send a user-removed to the removed user
                (_b = io.sockets.sockets.get(socketIdOfUser)) === null || _b === void 0 ? void 0 : _b.emit('user-removed');
                // disconnect their socket
                (_c = io.sockets.sockets.get(socketIdOfUser)) === null || _c === void 0 ? void 0 : _c.disconnect();
                // update state in redis
                yield saveRoom(roomId, room);
                // emit room-update
                io.to(roomId).emit('room-update', room);
                console.debug(`User ${socketIdOfUser} was removed from ${roomId}`);
            }
        }
    }));
    /**
     * A client has disconnected. Remove their records
     */
    socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
        // see if this socket is associated with an active room
        const roomId = yield redis.get(`socket:${socket.id}`);
        // if it is, then remove the user from this room
        if (roomId) {
            let room = yield getRoom(roomId);
            if (room && room.users[socket.id]) {
                delete room.users[socket.id];
                yield saveRoom(roomId, room);
                io.to(roomId).emit('room-update', room);
                console.log(`User ${socket.id} disconnected from room ${roomId}`);
            }
            yield redis.del(`socket:${socket.id}`);
        }
        else {
            console.debug(`User ${socket.id} disconnected.`);
        }
    }));
});
app.get('/', (req, res) => {
    res.send('API IS ONLINE');
});
server.listen(3000, '0.0.0.0', () => console.log('🚀 Scrum Poker TS backend running on port 3000'));
