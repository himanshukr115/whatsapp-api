const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    senderId: { type: String, required: true }, // Customer Phone Number
    receiverId: { type: String, required: true }, // Business Phone Number
    messageType: { type: String, enum: ['text', 'image', 'template', 'document'] },
    content: { type: String },
    whatsappMessageId: { type: String, unique: true }, // Meta's unique ID
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'read', 'failed'], 
        default: 'sent' 
    },
    direction: { type: String, enum: ['inbound', 'outbound'] },
    // TTL Index: Automatically deletes document 30 days after 'createdAt'
    createdAt: { type: Date, default: Date.now, expires: '30d' } 
}, { timestamps: true });

module.exports = mongoose.model('WhatsappMessage', whatsappMessageSchema);