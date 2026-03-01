const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    whatsappConfig: {
        phoneNumberId: { type: String }, // From Meta Developer Portal
        wabaId: { type: String },        // WhatsApp Business Account ID
        accessToken: { type: String },    // Permanent Access Token (Encrypted)
        verifyToken: { type: String },    // For Webhook verification
    },
    onboardingStatus: {
        type: String,
        enum: ['pending', 'verified', 'suspended'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);