import express from 'express';
import { type Request, type Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

import { Room, JoinPayload, VotePayload, RoomActionPayload } from './interfaces';

// APP CREATION
const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: '*'}})
const redis = new Redis(process.env.DOCKER_CONTAINER === "true" ? { host: 'redis', port: 6379 } : {host: '127.0.0.1', port: 6379})

/**
 * Helper functions to get room state from Redis
 */
async function getRoom(roomId: string): Promise<Room | null> {
    const data = await redis.get(`room:${roomId}`);
    return data ? (JSON.parse(data) as Room) : null;
}

/**
 * Helper function to save room state to Redis with 24 hour expiration
 */
async function saveRoom(roomId: string, roomData: Room): Promise<void> {
    await redis.set(`room:${roomId}`, JSON.stringify(roomData), 'EX', 86400);
}

// IO CONNECTION
io.on('connection', (socket: Socket) => {

    console.debug(`User ${socket.id} connected`);

    /**
     * A client is attempting to join a room
     */
    socket.on('join-room', async ({ roomId, name }: JoinPayload) => {

        // Get room data and create room if it doesn't already exist
        let room = await getRoom(roomId);
        if (!room) {
            room = { id: roomId, revealed: false, users: {}}
        }

        // Add user to room state
        room.users[socket.id] = { name, vote: null };
        await saveRoom(roomId, room);

        // Track socket to room id in redis
        await redis.set(`socket:${socket.id}`, roomId, 'EX', 86400);

        // Join a (socket.io) room and push an update to all users in that room
        socket.join(roomId);
        io.to(roomId).emit('room-update', room);
        console.debug(`User ${socket.id} joined room ${roomId}`)
    });

    /**
     * A client is attempting to vote in a room
     */
    socket.on('vote', async ({ roomId, vote }: VotePayload) => {
        // get room info
        let room = await getRoom(roomId);

        // if the room exists and the user is in the room
        if (room && room.users[socket.id]) {
            room.users[socket.id].vote = vote;
            await saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            console.debug(`User ${socket.id} voted ${vote} in room ${roomId}`)
        } else {
            console.warn(`User ${socket.id} attempted to vote in room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`)
            socket.emit('invalid-command');
        }
    });

    /**
     * A client is attempting to toggle the reveal
     */
    socket.on('reveal', async ({ roomId }: RoomActionPayload) => {
        let room = await getRoom(roomId);

        // if room exists then toggle reveal
        if (room && room.users[socket.id]) {
            room.revealed = !room.revealed;
            await saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            console.debug(`User ${socket.id} set visibility to ${room.revealed} in room ${roomId}`)
        } else {
            console.warn(`User ${socket.id} attempted to toggle visibility in room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`)
            socket.emit('invalid-command');
        }
    });

    /**
     * A client is attempting to reset everybody's points
     */
    socket.on('reset', async ({ roomId }: RoomActionPayload) => {
        let room = await getRoom(roomId);

        // if the room exists, then reset everyone's votes to null
        if (room && room.users[socket.id]) {
            room.revealed = false;

            const users = room.users; 
            Object.keys(users).forEach(id => users[id].vote = null);
            await saveRoom(roomId, room);
            io.to(roomId).emit('room-update', room);
            io.to(roomId).emit('room-reset');
            console.debug(`User ${socket.id} reset room ${roomId}`);
        } else {
            console.warn(`User ${socket.id} attempted to reset room ${roomId}, a room that doesn't exist or they are not in. This attempt was ignored.`)
            socket.emit('invalid-command');
        }
    })

    /**
     * A client wishes to remove a user from a room.
     */
    socket.on('remove-user', async ({ roomId, name }: JoinPayload) => {
        let room = await getRoom(roomId);

        // if the room exists, remove any user with that username from the users list
        if (room) {
            const entryToRemove = Object.entries(room.users).find(
                ([id, user]) => user.name === name
            );

            // if that user does exist
            if (entryToRemove) {
                const socketIdOfUser = entryToRemove[0];

                // Remove the user from the users list
                delete room.users[socketIdOfUser];

                // remove tracking key for user-to-room mapping
                await redis.del(`socket:${socketIdOfUser}`)

                // Send a user-removed to the removed user
                io.sockets.sockets.get(socketIdOfUser)?.emit('user-removed');

                // disconnect their socket
                io.sockets.sockets.get(socketIdOfUser)?.disconnect();

                // update state in redis
                await saveRoom(roomId, room);

                // emit room-update
                io.to(roomId).emit('room-update', room);

                console.debug(`User ${socketIdOfUser} was removed from ${roomId}`);
            }
        }
    });

    /**
     * A client has disconnected. Remove their records
     */
    socket.on('disconnect', async () => {
        // see if this socket is associated with an active room
        const roomId = await redis.get(`socket:${socket.id}`);

        // if it is, then remove the user from this room
        if (roomId) {
            let room = await getRoom(roomId);
            if (room && room.users[socket.id]) {
                delete room.users[socket.id];
                await saveRoom(roomId, room);
                io.to(roomId).emit('room-update', room);
                console.log(`User ${socket.id} disconnected from room ${roomId}`);
            }
            await redis.del(`socket:${socket.id}`);
        } else {
            console.debug(`User ${socket.id} disconnected.`)
        }
    })
});

app.get('/', (req: Request, res: Response) => {
    res.send('API IS ONLINE');
});

server.listen(3000, () => console.log('🚀 Scrum Poker TS backend running on port 3000'));