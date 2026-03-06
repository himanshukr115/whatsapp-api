const User = require('../../models/User');
const TokenUsage = require('../../models/TokenUsage');
const Business = require('../../models/Business'); // Added Business model

exports.getDashboard = async (req, res) => {
    try {
        const businessId = req.user.businessId;

        // Run all queries in parallel for maximum speed
        const [totalOperators, totalViewers, recentUsage, businessData] = await Promise.all([
            User.countDocuments({ businessId, role: 'operator' }),
            User.countDocuments({ businessId, role: 'viewer' }),
            TokenUsage.find({ businessId }).sort({ createdAt: -1 }).limit(5),
            Business.findById(businessId).select('whatsappConfig tokenBalance') // Get fresh token & API status
        ]);

        res.render('tenant/dashboard', {
            title: 'Business Overview',
            user: req.user,
            // Merge fresh business data with stats
            stats: {
                totalOperators,
                totalViewers,
                recentUsage,
                tokenBalance: businessData ? businessData.tokenBalance : 0,
                isApiConnected: businessData?.whatsappConfig?.isApiConnected || false
            }
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).render('error', { 
            message: "Unable to load dashboard. Please try again later." 
        });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const user = req.user;
        const businessData = await Business.findById(user.businessId);

        res.render('tenant/settings', {
            title: 'Settings',
            user: user,
            business: businessData
        });
    } catch (error) {
        console.error("Settings Error:", error);
        res.status(500).render('error', { 
            message: "Unable to load settings. Please try again later." 
        });
    }
};