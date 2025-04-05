const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');

// Get chat history between doctor and patient
router.get('/conversation/:doctorId/:patientId',
    authenticate,
    async (req, res) => {
        try {
            // Verify the requesting user is part of this conversation
            if (![req.params.doctorId, req.params.patientId].includes(req.user.id)) {
                return res.status(403).json({ error: 'Unauthorized access to conversation' });
            }

            const messages = await Message.find({
                $or: [
                    { sender: req.params.doctorId, receiver: req.params.patientId },
                    { sender: req.params.patientId, receiver: req.params.doctorId }
                ]
            })
                .sort('timestamp')
                .populate('sender', 'name role')  // Include sender details
                .populate('receiver', 'name role'); // Include receiver details

            res.json(messages);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

// Send message
router.post('/send',
    authenticate,
    validateMessage,
    async (req, res) => {
        try {
            const { sender, receiver, content, roomId } = req.body;

            // Verify the authenticated user is the sender
            if (sender !== req.user.id) {
                return res.status(403).json({ error: 'You can only send messages as yourself' });
            }

            const newMessage = new Message({
                sender,
                receiver,
                content,
                roomId,
                isRead: false,
                attachments: req.body.attachments || [],
                timestamp: new Date() // Explicit timestamp
            });

            await newMessage.save();

            // Emit socket event for real-time update
            if (req.io) {
                req.io.to(roomId).emit('newMessage', newMessage);
            }

            res.status(201).json(newMessage);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

// Get all conversations for a user (with doctor/patient info)
router.get('/conversations/:userId',
    authenticate,
    async (req, res) => {
        try {
            // Verify the requesting user is the same as the requested userId
            if (req.params.userId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }

            // Get distinct conversations
            const conversations = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: mongoose.Types.ObjectId(req.params.userId) },
                            { receiver: mongoose.Types.ObjectId(req.params.userId) }
                        ]
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$sender", mongoose.Types.ObjectId(req.params.userId)] },
                                "$receiver",
                                "$sender"
                            ]
                        },
                        lastMessage: { $last: "$$ROOT" },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$receiver", mongoose.Types.ObjectId(req.params.userId)] },
                                            { $eq: ["$isRead", false] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "participant"
                    }
                },
                { $unwind: "$participant" },
                {
                    $project: {
                        participant: {
                            _id: 1,
                            name: 1,
                            role: 1,
                            specialty: 1, // For doctors
                            profilePicture: 1
                        },
                        lastMessage: 1,
                        unreadCount: 1
                    }
                },
                { $sort: { "lastMessage.timestamp": -1 } }
            ]);

            res.json(conversations);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

// Mark messages as read
router.patch('/mark-read', authenticate, async (req, res) => {
    try {
        const { messageIds, conversationId } = req.body;

        await Message.updateMany(
            {
                _id: { $in: messageIds },
                receiver: req.user.id
            },
            { $set: { isRead: true } }
        );

        // Notify other participant that messages were read
        if (req.io && conversationId) {
            req.io.to(conversationId).emit('messagesRead', {
                readerId: req.user.id,
                messageIds
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread message count for user
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user.id,
            isRead: false
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;