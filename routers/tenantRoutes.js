const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/tenant/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// Role-based access control middleware
const isTenantAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'tenant_admin') {
        return next();
    }
    return res.status(403).send('Access Denied: Tenant Admins Only');
};

// All routes here are protected
router.use(authMiddleware, isTenantAdmin);

router.get('/dashboard', dashboardController.getDashboard);
router.get('/settings', dashboardController.getSettings);

module.exports = router;