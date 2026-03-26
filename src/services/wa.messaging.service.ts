import axios, { AxiosError } from 'axios';
import { prisma } from '../lib/prisma';
import { messageQueue } from '../queues/queues.ts';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export const waMessagingService = {
  async sendText({ accessToken, recipientPhone, text, workspaceId, channelId, conversationId }: {
    accessToken: string;
    recipientPhone: string;
    text: string;
    workspaceId: string;
    channelId: string;
    conversationId: string;
  }) {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel?.phoneNumberId) throw new Error('Channel not found');

    const idempotencyKey = `wa-${channelId}-${recipientPhone}-${Date.now()}`;

    try {
      const response = await axios.post(
        `${GRAPH_API}/${channel.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'text',
          text: { body: text, preview_url: false },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      await prisma.message.create({
        data: {
          conversationId,
          workspaceId,
          direction: 'outbound',
          content: { text },
          messageType: 'text',
          metaMessageId: response.data.messages?.[0]?.id,
          idempotencyKey,
          status: 'sent',
        }
      });

      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError<any>;
      const errData = axiosErr.response?.data;
      
      // Log failed message
      await prisma.message.create({
        data: {
          conversationId,
          workspaceId,
          direction: 'outbound',
          content: { text, error: errData },
          messageType: 'text',
          idempotencyKey,
          status: 'failed',
        }
      });

      throw err;
    }
  },

  async sendTemplate({ accessToken, recipientPhone, templateName, language, components, workspaceId, channelId, conversationId }: {
    accessToken: string;
    recipientPhone: string;
    templateName: string;
    language: string;
    components: any[];
    workspaceId: string;
    channelId: string;
    conversationId: string;
  }) {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel?.phoneNumberId) throw new Error('Channel not found');

    const response = await axios.post(
      `${GRAPH_API}/${channel.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components,
        }
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      }
    );

    return response.data;
  },
};
