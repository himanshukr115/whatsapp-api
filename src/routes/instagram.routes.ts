import { Router } from 'express';
import { handleInstagramVerify, handleInstagramWebhook, verifyInstagramSignature } from '../webhooks/instagram.webhook.ts';
import { authenticateJWT } from '../middleware/auth';
import { igOAuthController } from '../controllers/ig.oauth.controller';
import { igInboxController } from '../controllers/ig.inbox.controller';

const router = Router();

// Meta webhook challenge
router.get('/webhooks/instagram', handleInstagramVerify);
// Meta webhook events
router.post('/webhooks/instagram', verifyInstagramSignature, handleInstagramWebhook);

// Instagram OAuth
router.get('/instagram/oauth/callback', authenticateJWT, igOAuthController.handleCallback);
router.post('/instagram/connect', authenticateJWT, igOAuthController.initiateOAuth);

// Inbox API
router.get('/instagram/conversations', authenticateJWT, igInboxController.listConversations);
router.get('/instagram/conversations/:id/messages', authenticateJWT, igInboxController.getMessages);
router.post('/instagram/conversations/:id/messages', authenticateJWT, igInboxController.sendMessage);
router.patch('/instagram/conversations/:id/assign', authenticateJWT, igInboxController.assignAgent);
router.patch('/instagram/conversations/:id/pause-bot', authenticateJWT, igInboxController.toggleBotPause);

export default router;