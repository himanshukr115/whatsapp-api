import { Request, Response } from 'express';
import crypto from 'crypto';
import { messageQueue } from '../queues/queues.ts';
import { prisma } from '../lib/prisma';

export function verifyInstagramSignature(req: Request, res: Response, next: Function) {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) return res.sendStatus(403);

  const body = (req as any).rawBody;
  const appSecret = process.env.META_APP_SECRET!;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.sendStatus(403);
  }
  next();
}

export async function handleInstagramVerify(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const channel = await prisma.channel.findFirst({
    where: { webhookVerifyToken: token as string, type: 'instagram' }
  });

  if (mode === 'subscribe' && channel) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

export async function handleInstagramWebhook(req: Request, res: Response) {
  // Respond to Meta immediately
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    const igAccountId = entry.id;
    
    const channel = await prisma.channel.findFirst({
      where: { igAccountId, type: 'instagram' }
    });
    if (!channel) continue;

    // DM messages
    for (const messaging of entry.messaging || []) {
      if (messaging.message) {
        // Skip echos (messages we sent)
        if (messaging.message.is_echo) continue;

        const msgId = messaging.message.mid;
        const existing = await prisma.message.findUnique({ where: { metaMessageId: msgId } });
        if (existing) continue;

        await messageQueue.add('ig.inbound.dm', {
          workspaceId: channel.workspaceId,
          channelId: channel.id,
          senderId: messaging.sender.id,
          recipientId: messaging.recipient.id,
          message: messaging.message,
          timestamp: messaging.timestamp,
        }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }

      // Story mention
      if (messaging.message?.attachments?.[0]?.type === 'story_mention') {
        await messageQueue.add('ig.story_mention', {
          workspaceId: channel.workspaceId,
          channelId: channel.id,
          senderId: messaging.sender.id,
          storyData: messaging.message.attachments[0],
        }, { attempts: 3 });
      }
    }

    // Comment events (if subscribed to comments webhook field)
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        await messageQueue.add('ig.comment', {
          workspaceId: channel.workspaceId,
          channelId: channel.id,
          comment: change.value,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
      }
    }
  }
}
