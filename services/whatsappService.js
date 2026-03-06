// services/whatsappService.js
exports.sendMessage = async (businessId, recipient, text) => {
    const business = await Business.findById(businessId);
    const config = business.whatsappConfig;

    if (!config.isActive) throw new Error("WhatsApp not connected");

    return axios.post(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
        { messaging_product: "whatsapp", to: recipient, text: { body: text } },
        { headers: { Authorization: `Bearer ${config.accessToken}` } }
    );
};