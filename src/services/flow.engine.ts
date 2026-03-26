import { prisma } from '../lib/prisma';
import { waMessagingService } from './wa.messaging.service';
import { igMessagingService } from './ig.messaging.service';

interface FlowContext {
  workspaceId: string;
  channelId: string;
  channelType: 'whatsapp' | 'instagram';
  contact: any;
  conversation: any;
  message: any;
  isNewConversation: boolean;
}

export const flowEngine = {
  async processInboundMessage(ctx: FlowContext) {
    const { workspaceId, channelType, message, isNewConversation, conversation } = ctx;

    // Load matching active flows (ordered by priority)
    const flows = await prisma.flow.findMany({
      where: {
        workspaceId,
        channelType: { in: [channelType, 'both'] },
        isActive: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    for (const flow of flows) {
      if (await this.matchesTrigger(flow, ctx)) {
        await this.executeFlow(flow, ctx);
        return; // first matching flow wins
      }
    }
  },

  async matchesTrigger(flow: any, ctx: FlowContext): Promise<boolean> {
    const config = flow.triggerConfig;
    const msgText = ctx.message.text?.body?.toLowerCase() || ctx.message.text?.toLowerCase() || '';

    switch (flow.triggerType) {
      case 'welcome':
        return ctx.isNewConversation;
      case 'keyword':
        return config.keywords?.some((kw: string) => msgText.includes(kw.toLowerCase())) ?? false;
      case 'any_message':
        return true;
      case 'story_mention':
        return ctx.message.attachments?.[0]?.type === 'story_mention';
      default:
        return false;
    }
  },

  async executeFlow(flow: any, ctx: FlowContext) {
    const nodes: any[] = flow.nodes;
    const edges: any[] = flow.edges;

    // Find start node
    let currentNode = nodes.find((n: any) => n.type === 'trigger');
    if (!currentNode) return;

    const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
    if (!channel) return;

    const accessToken = channel.accessTokenEnc; // TODO: decrypt in production

    // Walk the node graph (BFS for linear flows, DFS for branching)
    const visited = new Set<string>();
    const queue = [currentNode.id];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node || node.type === 'trigger') {
        // Follow edges from trigger
        const nextEdges = edges.filter((e: any) => e.source === nodeId);
        queue.push(...nextEdges.map((e: any) => e.target));
        continue;
      }

      await this.executeNode(node, ctx, accessToken);

      // Add child nodes to queue
      const nextEdges = edges.filter((e: any) => e.source === nodeId);
      queue.push(...nextEdges.map((e: any) => e.target));
    }
  },

  async executeNode(node: any, ctx: FlowContext, accessToken: string) {
    const { channelType, contact, conversation } = ctx;
    const messaging = channelType === 'whatsapp' ? waMessagingService : igMessagingService;

    switch (node.type) {
      case 'send_text':
        await messaging.sendText({
          accessToken,
          recipientId: contact.externalId,
          text: interpolate(node.data.text, { contact }),
          channelId: ctx.channelId,
          workspaceId: ctx.workspaceId,
          conversationId: conversation.id,
        });
        break;

      case 'send_image':
        await messaging.sendMedia({
          accessToken,
          recipientId: contact.externalId,
          type: 'image',
          url: node.data.imageUrl,
        });
        break;

      case 'add_tag':
        await prisma.contact.update({
          where: { id: contact.id },
          data: { tags: { push: node.data.tag } }
        });
        break;

      case 'assign_agent':
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { assignedToId: node.data.agentId, status: 'human', botPaused: true }
        });
        break;

      case 'condition':
        // Branching logic — handled at edge level via conditional edges
        break;

      case 'delay':
        // Schedule next node execution via BullMQ delayed job
        // TODO: implement with BullMQ delay option
        break;

      case 'set_custom_field':
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            customFields: {
              ...(contact.customFields as object),
              [node.data.fieldKey]: node.data.fieldValue,
            }
          }
        });
        break;

      case 'send_wa_template':
        if (channelType === 'whatsapp') {
          await waMessagingService.sendTemplate({
            accessToken,
            recipientPhone: contact.phone || contact.externalId,
            templateName: node.data.templateName,
            language: node.data.language || 'en_US',
            components: node.data.components || [],
            channelId: ctx.channelId,
            workspaceId: ctx.workspaceId,
            conversationId: conversation.id,
          });
        }
        break;
    }
  }
};

function interpolate(text: string, vars: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, obj, key) => {
    return vars[obj]?.[key] ?? '';
  });
}