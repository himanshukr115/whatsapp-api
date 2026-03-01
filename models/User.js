const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Password is optional to support Google OAuth users
    password: { type: String },

    // Google auth fields
    googleId: { type: String, unique: true, sparse: true },
    authMethod: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    avatar: { type: String },

    // Email verification fields
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },

    role: {
        type: String,
        enum: ['super_admin', 'tenant_admin', 'operator', 'viewer'],
        default: 'tenant_admin'
    },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    tokenBalance: { type: Number, default: 0 },
    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planExpiry: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.password || !this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

// Compare plain text password with hashed password
userSchema.methods.comparePassword = function(candidatePassword) {
    if (!this.password) {
        return false;
    }

    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
