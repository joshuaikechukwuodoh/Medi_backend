const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const http = require('http');
const io = require('socket.io');

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.log(err);
    });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to make io accessible in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

//api connection routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const server = http.createServer(app);
const ioServer = io(server, {
    cors: {
        origin: "*", // In production, replace with specific origin
        methods: ["GET", "POST"]
    }
});

// Socket.io connection handling
ioServer.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

