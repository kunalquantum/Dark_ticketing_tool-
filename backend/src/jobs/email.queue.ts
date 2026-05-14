import Bull from 'bull';
import { config } from '../config/index.js';
import { sendEmail } from '../services/email.service.js';
import { logger } from '../lib/logger.js';

interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

export const emailQueue = new Bull<EmailJob>('email', config.redisUrl);

emailQueue.process(async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
});

emailQueue.on('completed', (job) => {
  logger.debug(`Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} failed: ${err.message}`);
});

export function queueEmail(to: string, subject: string, html: string) {
  emailQueue.add({ to, subject, html }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}
