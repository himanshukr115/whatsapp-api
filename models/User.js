// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true, lowercase: true },
//     password: { type: String, required: true },
//     // Role identifies if they are Super Admin or a Client-side role
//     role: { 
//         type: String, 
//         enum: ['super_admin', 'tenant_admin', 'operator', 'viewer'], 
//         default: 'tenant_admin' 
//     },
//     // For Multi-tenancy: Every user (except super_admin) belongs to a business
//     businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
//     tokenBalance: { type: Number, default: 0 },
//     currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
//     planExpiry: { type: Date },
//     isActive: { type: Boolean, default: true }
// }, { timestamps: true });

// module.exports = mongoose.model('User', userSchema);



const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Changed: password is no longer 'required: true' to support Google OAuth users
    password: { type: String }, 
    
    // New Feature: Google Login Fields
    googleId: { type: String, unique: true, sparse: true }, 
    authMethod: { 
        type: String, 
        enum: ['local', 'google'], 
        default: 'local' 
    },
    avatar: { type: String }, // To store Google profile picture

    // Existing Fields preserved exactly as they were
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
userSchema.pre('save', async function(next) {
    // Only hash if password exists and is modified (prevents error on Google login)
    if (!this.password || !this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

module.exports = mongoose.model('User', userSchema);