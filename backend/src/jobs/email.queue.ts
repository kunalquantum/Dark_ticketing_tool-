import { sendEmail } from '../services/email.service.js';
import { logger } from '../lib/logger.js';

export function queueEmail(to: string, subject: string, html: string) {
  sendEmail(to, subject, html).catch(err => {
    logger.error(`Failed to send email: ${err}`);
  });
}

