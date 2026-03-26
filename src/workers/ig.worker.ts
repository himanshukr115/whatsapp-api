import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { flowEngine } from '../services/flow.engine';
import { igMessagingService } from '../services/ig.messaging.service';

// Worker: process inbound Instagram DMs
export const igDmWorker = new Worker('message-queue', async (job: Job) => {
  if (job.name !== 'ig.inbound.dm') return;

  const { workspaceId, channelId, senderId, message, timestamp } = job.data;

  // Upsert contact
  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_channelType_externalId: {
        workspaceId,
        channelType: 'instagram',
        externalId: senderId,
      }
    },
    update: {},
    create: {
      workspaceId,
      channelType: 'instagram',
      externalId: senderId,
      name: null, // hydrate asynchronously
    }
  });

  // Upsert conversation
  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id, channelId, status: { not: 'resolved' } }
  });

  const isNewConversation = !conversation;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        contactId: contact.id,
        channelId,
        status: 'bot',
        lastMessageAt: new Date(timestamp * 1000),
      }
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(timestamp * 1000) }
    });
  }

  // Persist inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      workspaceId,
      direction: 'inbound',
      content: message,
      messageType: message.attachments ? 'attachment' : 'text',
      metaMessageId: message.mid,
    }
  });

  // Do not run flow if human has taken over
  if (conversation.botPaused) return;

  // Run flow engine
  await flowEngine.processInboundMessage({
    workspaceId,
    channelId,
    channelType: 'instagram',
    contact,
    conversation,
    message,
    isNewConversation,
  });

}, { connection: redis, concurrency: 20 });

// Worker: process Instagram comment events
export const igCommentWorker = new Worker('message-queue', async (job: Job) => {
  if (job.name !== 'ig.comment') return;

  const { workspaceId, channelId, comment } = job.data;

  // Find active flows with comment trigger
  const flows = await prisma.flow.findMany({
    where: {
      workspaceId,
      channelType: { in: ['instagram', 'both'] },
      triggerType: 'comment',
      isActive: true,
    }
  });

  for (const flow of flows) {
    const config = flow.triggerConfig as any;
    const commentText = comment.text?.toLowerCase() || '';
    
    // Keyword match (optional)
    if (config.keywords?.length) {
      const matched = config.keywords.some((kw: string) => commentText.includes(kw.toLowerCase()));
      if (!matched) continue;
    }

    // Auto-reply to comment (public)
    if (config.autoReplyComment && config.commentReplyText) {
      await igMessagingService.replyToComment({
        workspaceId,
        commentId: comment.id,
        text: config.commentReplyText,
      });
    }

    // Send DM to commenter
    if (config.sendDm && comment.from?.id) {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (channel) {
        await igMessagingService.sendDm({
          accessToken: await decrypt(channel.accessTokenEnc),
          recipientId: comment.from.id,
          text: config.dmText,
        });
      }
    }
  }
}, { connection: redis, concurrency: 10 });

// Placeholder decrypt helper — implement with AES-256-GCM
async function decrypt(encryptedToken: string): Promise<string> {
  // TODO: implement with node:crypto AES-256-GCM + KMS-stored key
  return encryptedToken;
}