const validateMessage = (req, res, next) => {
    const { sender, receiver, content, roomId } = req.body;

    // Check required fields
    if (!sender || !receiver || !content || !roomId) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: {
                sender: !sender ? 'Sender ID is required' : null,
                receiver: !receiver ? 'Receiver ID is required' : null,
                content: !content ? 'Message content is required' : null,
                roomId: !roomId ? 'Room ID is required' : null
            }
        });
    }

    // Validate content length
    if (content.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid message content',
            details: 'Message content cannot be empty'
        });
    }

    if (content.length > 5000) {
        return res.status(400).json({
            error: 'Invalid message content',
            details: 'Message content cannot exceed 5000 characters'
        });
    }

    // Validate attachments if present
    if (req.body.attachments) {
        if (!Array.isArray(req.body.attachments)) {
            return res.status(400).json({
                error: 'Invalid attachments',
                details: 'Attachments must be an array'
            });
        }

        for (const attachment of req.body.attachments) {
            if (!attachment.url || !attachment.type || !attachment.name) {
                return res.status(400).json({
                    error: 'Invalid attachment format',
                    details: 'Each attachment must have url, type, and name'
                });
            }
        }
    }

    next();
};

module.exports = {
    validateMessage
}; 