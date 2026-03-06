// controllers/tenant/whatsappController.js
const axios = require('axios');

exports.connectWhatsapp = async (req, res) => {
    const { phoneNumberId, accessToken, wabaId } = req.body;

    try {
        // Test the connection by fetching phone number details from Meta
        const response = await axios.get(
            `https://graph.facebook.com/v18.0/${phoneNumberId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // If successful, save to the tenant's business profile
        await Business.findByIdAndUpdate(req.user.businessId, {
            'whatsappConfig.phoneNumberId': phoneNumberId,
            'whatsappConfig.accessToken': accessToken,
            'whatsappConfig.wabaId': wabaId,
            'whatsappConfig.isActive': true
        });

        res.json({ success: true, message: "WhatsApp Connected Successfully!" });
    } catch (error) {
        res.status(400).json({ error: "Invalid Credentials. Check your Token and ID." });
    }
};