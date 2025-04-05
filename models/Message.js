const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    roomId: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    },
    attachments: [{
        url: String,
        type: String,
        name: String,
        size: Number
    }],
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'prescription', 'report'],
        default: 'text'
    },
    isUrgent: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Map,
        of: String,
        default: new Map()
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ roomId: 1 });
MessageSchema.index({ timestamp: -1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;