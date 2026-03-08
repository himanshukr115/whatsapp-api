const axios = require('axios');
const Business = require('../../models/Business');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v18.0';

const getLongLivedUserToken = async (shortLivedToken) => {
    const params = {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken
    };

    const { data } = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, { params });
    return data.access_token;
};

const getEmbeddedSignupAssets = async (accessToken) => {
    const params = {
        fields: 'id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}',
        access_token: accessToken
    };

    const { data } = await axios.get(`${GRAPH_BASE_URL}/me/businesses`, { params });
    const businesses = data?.data || [];

    for (const business of businesses) {
        const waba = business.owned_whatsapp_business_accounts?.[0];
        const phone = waba?.phone_numbers?.[0];

        if (waba && phone) {
            return {
                wabaId: waba.id,
                phoneNumberId: phone.id,
                displayPhoneNumber: phone.display_phone_number
            };
        }
    }

    return null;
};

exports.connectWhatsapp = async (req, res) => {
    const { phoneNumberId, accessToken, wabaId } = req.body;

    try {
        // Test the connection by fetching phone number details from Meta
        await axios.get(
            `https://graph.facebook.com/v18.0/${phoneNumberId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // If successful, save to the tenant's business profile
        await Business.findByIdAndUpdate(req.user.businessId, {
            'whatsappConfig.phoneNumberId': phoneNumberId,
            'whatsappConfig.accessToken': accessToken,
            'whatsappConfig.wabaId': wabaId,
            'whatsappConfig.isApiConnected': true
        });

        res.json({ success: true, message: "WhatsApp Connected Successfully!" });
    } catch (error) {
        res.status(400).json({ error: "Invalid Credentials. Check your Token and ID." });
    }
};

exports.connectEmbeddedSignup = async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Missing access token from Facebook login.' });
    }

    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
        return res.status(500).json({ success: false, error: 'Meta credentials are not configured on server.' });
    }

    try {
        const longLivedToken = await getLongLivedUserToken(accessToken);
        const assets = await getEmbeddedSignupAssets(longLivedToken);

        if (!assets) {
            return res.status(400).json({
                success: false,
                error: 'No WhatsApp Business Account/Phone found. Complete embedded signup steps in Meta popup.'
            });
        }

        await Business.findByIdAndUpdate(req.user.businessId, {
            'whatsappConfig.accessToken': longLivedToken,
            'whatsappConfig.wabaId': assets.wabaId,
            'whatsappConfig.phoneNumberId': assets.phoneNumberId,
            'whatsappConfig.displayPhoneNumber': assets.displayPhoneNumber,
            'whatsappConfig.isApiConnected': true
        });

        return res.json({ success: true, message: 'WhatsApp embedded signup completed successfully.' });
    } catch (error) {
        console.error('Embedded signup error:', error.response?.data || error.message);
        return res.status(400).json({
            success: false,
            error: 'Unable to complete Embedded Signup. Check Meta app permissions and try again.'
        });
    }
};
