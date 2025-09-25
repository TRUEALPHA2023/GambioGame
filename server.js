// Simple Socket.IO server for Gambio online multiplayer
import { Server } from 'socket.io';
const io = new Server(3000, { cors: { origin: '*' } });

let rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerIndex = null;

  socket.on('joinGame', ({ roomId }) => {
    currentRoom = roomId;
    if (!rooms[roomId]) rooms[roomId] = { players: [], state: null };
    playerIndex = rooms[roomId].players.length;
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('playerList', rooms[roomId].players.length);
    // Start game if enough players
  });

  socket.on('playerMove', (move) => {
    if (currentRoom) {
      // Broadcast move to all in room
      socket.to(currentRoom).emit('playerMove', move);
    }
  });

  socket.on('syncState', (state) => {
    if (currentRoom) {
      rooms[currentRoom].state = state;
      socket.to(currentRoom).emit('syncState', state);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players = rooms[currentRoom].players.filter(id => id !== socket.id);
      io.to(currentRoom).emit('playerList', rooms[currentRoom].players.length);
      if (rooms[currentRoom].players.length === 0) delete rooms[currentRoom];
    }
  });
});

console.log('Gambio Socket.IO server running on port 3000');
