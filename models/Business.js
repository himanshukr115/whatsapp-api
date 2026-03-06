const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Existing WhatsApp Configuration
    whatsappConfig: {
        phoneNumberId: { type: String }, // From Meta Developer Portal
        wabaId: { type: String },        // WhatsApp Business Account ID
        accessToken: { type: String },   // Permanent Access Token (Encrypted)
        verifyToken: { type: String },   // For Webhook verification
        
        // NEW: Status and connection details
        isApiConnected: { type: Boolean, default: false },
        displayPhoneNumber: { type: String }, // The verified WhatsApp number
        qualityRating: { type: String, default: 'UNKNOWN' } // Meta quality rating
    },

    // Existing Onboarding Status
    onboardingStatus: {
        type: String,
        enum: ['pending', 'verified', 'suspended'],
        default: 'pending'
    },

    // NEW: Subscription & Usage Tracking
    subscription: {
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
        status: { 
            type: String, 
            enum: ['active', 'past_due', 'canceled', 'trialing'], 
            default: 'trialing' 
        },
        currentPeriodEnd: { type: Date }
    },

    // NEW: Metadata for SaaS scaling
    timezone: { type: String, default: 'UTC' },
    settings: {
        autoReply: { type: Boolean, default: true },
        dailyMessageLimit: { type: Number, default: 1000 }
    }

}, { timestamps: true });

// Index for faster lookups by Owner or Phone ID
businessSchema.index({ ownerId: 1 });
businessSchema.index({ 'whatsappConfig.phoneNumberId': 1 });

module.exports = mongoose.model('Business', businessSchema);