const socketio = require('socket.io');

module.exports = function (server) {
    const io = socketio(server, {
        cors: {
            origin: "*", // Change in production
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('New user connected:', socket.id);

        // Join a room (doctor-patient pair)
        socket.on('join-room', (roomId) => {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);
        });

        // Handle chat messages
        socket.on('send-message', async ({ roomId, sender, receiver, content }) => {
            // Save to database (optional)
            const message = new Message({ sender, receiver, content });
            await message.save();

            // Broadcast to the room
            io.to(roomId).emit('receive-message', { sender, content });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};