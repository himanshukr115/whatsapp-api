import { Request, Response } from 'express';
import crypto from 'crypto';
import { messageQueue } from '../queues/queues';
import { prisma } from '../lib/prisma';

// CRITICAL: Verify Meta's HMAC-SHA256 signature on every webhook POST
export function verifyWhatsAppSignature(req: Request, res: Response, next: Function) {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) return res.sendStatus(403);

  const body = (req as any).rawBody; // requires express raw body middleware
  const appSecret = process.env.META_APP_SECRET!;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.sendStatus(403);
  }
  next();
}

// GET /webhooks/whatsapp — Meta verification challenge
export async function handleWhatsAppVerify(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Look up channel by verify token (supports multi-tenant)
  const channel = await prisma.channel.findFirst({
    where: { webhookVerifyToken: token as string, type: 'whatsapp' }
  });

  if (mode === 'subscribe' && channel) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

// POST /webhooks/whatsapp — receive events
export async function handleWhatsAppWebhook(req: Request, res: Response) {
  // Respond immediately to Meta (must respond within 20s or Meta retries)
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      
      // Idempotency: check if we've seen this event before
      for (const message of value.messages || []) {
        const existing = await prisma.message.findUnique({
          where: { metaMessageId: message.id }
        });
        if (existing) continue; // deduplicate

        // Find which workspace/channel this phone number belongs to
        const channel = await prisma.channel.findFirst({
          where: { phoneNumberId: value.metadata?.phone_number_id, type: 'whatsapp' }
        });
        if (!channel) continue;

        // Enqueue for async processing
        await messageQueue.add('wa.inbound', {
          workspaceId: channel.workspaceId,
          channelId: channel.id,
          message,
          contacts: value.contacts || [],
          metadata: value.metadata,
        }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        });
      }

      // Handle status updates (delivered, read, failed)
      for (const status of value.statuses || []) {
        await messageQueue.add('wa.status', { status }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
      }
    }
  }
}