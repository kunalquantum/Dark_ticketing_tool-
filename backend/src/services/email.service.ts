import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (config.nodeEnv === 'development' && !config.email.user) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info(`Ethereal email account: ${testAccount.user}`);
  } else {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({ from: config.email.from, to, subject, html });
    if (config.nodeEnv === 'development') {
      logger.info(`Email preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err}`);
  }
}

export const emailTemplates = {
  ticketCreated: (ticketTitle: string, ticketId: string) => ({
    subject: `New ticket: ${ticketTitle}`,
    html: `<p>A new ticket has been created.</p><p><strong>${ticketTitle}</strong></p><p>Ticket ID: ${ticketId}</p>`,
  }),
  ticketAssigned: (ticketTitle: string, ticketId: string, agentName: string) => ({
    subject: `Ticket assigned to you: ${ticketTitle}`,
    html: `<p>Hi ${agentName},</p><p>Ticket <strong>${ticketTitle}</strong> (${ticketId}) has been assigned to you.</p>`,
  }),
  ticketUpdated: (ticketTitle: string, ticketId: string, field: string, newValue: string) => ({
    subject: `Ticket updated: ${ticketTitle}`,
    html: `<p>Ticket <strong>${ticketTitle}</strong> (${ticketId}) was updated.</p><p>${field} changed to <strong>${newValue}</strong>.</p>`,
  }),
};
