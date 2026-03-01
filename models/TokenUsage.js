const tokenUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    action: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    type: { 
        type: String, 
        enum: ['purchase', 'ai_generation', 'whatsapp_conversation', 'refund'], 
        required: true 
    },
    description: { type: String }, // e.g., "Conversation with +91XXXXXXXXXX"
    balanceAfter: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('TokenUsage', tokenUsageSchema);