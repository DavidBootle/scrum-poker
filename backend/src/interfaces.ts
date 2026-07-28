export interface User {
    name: string,           // display name of the user
    vote: string | null,    // selected point amount (1, 2, 3, ? , or null)
}

export interface Room {
    id: string,                     // The unique room id (displayed in browser)
    revealed: boolean,              // Whether point totals are showing to all users
    users: Record<string, User>,    // Dictionary of users where key is the socket id
}

/**
 * Represents a socket 'join-room' data field.
 * A client trying to join a room.
 */
export interface JoinPayload {
    roomId: string,
    name: string,
}

export interface VotePayload {
    roomId: string,
    vote: string | null;
}

export interface RoomActionPayload {
    roomId: string
}