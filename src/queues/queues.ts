import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const messageQueue = new Queue('message-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
});

export const campaignQueue = new Queue('campaign-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  }
});