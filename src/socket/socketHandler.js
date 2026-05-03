import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:board', ({ boardId }) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave:board', ({ boardId }) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit task moved to all board members
export const emitTaskMoved = (boardId, data) => {
  try {
    const io = getIO();
    io.to(`board:${boardId}`).emit('task:moved', data);
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};

// Emit task created
export const emitTaskCreated = (boardId, data) => {
  try {
    const io = getIO();
    io.to(`board:${boardId}`).emit('task:created', data);
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};

// Emit task updated
export const emitTaskUpdated = (boardId, data) => {
  try {
    const io = getIO();
    io.to(`board:${boardId}`).emit('task:updated', data);
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};

// Emit task deleted
export const emitTaskDeleted = (boardId, data) => {
  try {
    const io = getIO();
    io.to(`board:${boardId}`).emit('task:deleted', data);
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};