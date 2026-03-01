const planSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    price: { type: Number, required: true },
    tokensAllocated: { type: Number, required: true }, // Shared for AI & WhatsApp
    validityDays: { type: Number, required: true },
    allowedAIModels: [{ 
        type: String, 
        enum: ['OpenAI', 'Gemini', 'DeepSeek'] 
    }],
    features: {
        maxTemplates: { type: Number, default: 10 },
        bulkBroadcast: { type: Boolean, default: false }
    },
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);