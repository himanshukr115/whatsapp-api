import axios from 'axios';
import { prisma } from '../lib/prisma';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export const igMessagingService = {
  async sendText({ accessToken, recipientId, text, workspaceId, channelId, conversationId }: {
    accessToken: string;
    recipientId: string;
    text: string;
    workspaceId?: string;
    channelId?: string;
    conversationId?: string;
  }) {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel?.igAccountId) throw new Error('IG account not found');

    const idempotencyKey = `ig-${channelId}-${recipientId}-${Date.now()}`;

    const response = await axios.post(
      `${GRAPH_API}/${channel.igAccountId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );

    if (workspaceId && conversationId) {
      await prisma.message.create({
        data: {
          conversationId,
          workspaceId,
          direction: 'outbound',
          content: { text },
          messageType: 'text',
          metaMessageId: response.data.message_id,
          idempotencyKey,
          status: 'sent',
        }
      });
    }

    return response.data;
  },

  async sendMedia({ accessToken, recipientId, type, url }: {
    accessToken: string;
    recipientId: string;
    type: 'image' | 'video' | 'audio';
    url: string;
  }) {
    // Uses page/ig account id — must be looked up
    // This is a simplified version; production should look up igAccountId from DB
    throw new Error('Not yet implemented — look up igAccountId and POST to /{igAccountId}/messages');
  },

  async replyToComment({ workspaceId, commentId, text }: {
    workspaceId: string;
    commentId: string;
    text: string;
  }) {
    const channel = await prisma.channel.findFirst({
      where: { workspaceId, type: 'instagram' }
    });
    if (!channel) throw new Error('Channel not found');

    const accessToken = channel.accessTokenEnc; // decrypt in production

    const response = await axios.post(
      `${GRAPH_API}/${commentId}/replies`,
      { message: text },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return response.data;
  },

  async sendDm({ accessToken, recipientId, text }: {
    accessToken: string;
    recipientId: string;
    text: string;
  }) {
    // Alias for sendText without DB persistence (e.g. from comment trigger)
    return this.sendText({ accessToken, recipientId, text });
  },

  // Mark message as seen (reduces unread count in IG inbox)
  async markSeen({ accessToken, igAccountId, recipientId }: {
    accessToken: string;
    igAccountId: string;
    recipientId: string;
  }) {
    await axios.post(
      `${GRAPH_API}/${igAccountId}/messages`,
      {
        recipient: { id: recipientId },
        sender_action: 'mark_seen',
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }
};