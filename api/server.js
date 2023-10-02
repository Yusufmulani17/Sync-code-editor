const express = require('express');
const app = express();
// http module is inbuild in node
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./Actions');
const path = require('path');

const server = http.createServer(app);
const io = new Server(server);

// app.use(express.static('client'));

// app.get('/*', function (req, res) {
//   res.sendFile(path.join(__dirname, '..', 'client/build', 'index.html'));
// });

// Serve static files from the 'client/build' directory
app.use(express.static(path.resolve(__dirname, '..', 'client', 'build')));

// Catch-all route to serve the 'index.html' file
app.get('/*', function (req, res) {
  res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
  //Map
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // console.log(clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    // io.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    // socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listiening on port ${PORT}`));
