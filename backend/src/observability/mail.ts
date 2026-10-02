export interface OutboundMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailTransport {
  send(message: OutboundMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export function paymentActivatedMessage(input: {
  name: string;
  courseTitle: string;
  amount: string;
  courseUrl: string;
}): OutboundMessage {
  return {
    to: '',
    subject: `Payment received for ${input.courseTitle}`,
    text: [
      `Hello ${input.name},`,
      '',
      `We received your payment of IDR ${input.amount} and activated your enrollment in ${input.courseTitle}.`,
      `Open the course: ${input.courseUrl}`,
    ].join('\n'),
  };
}

export function enrollmentGrantedMessage(input: {
  name: string;
  courseTitle: string;
  courseUrl: string;
  temporaryPassword: string | null;
}): OutboundMessage {
  const lines = [
    `Hello ${input.name},`,
    '',
    `Your enrollment in ${input.courseTitle} is active.`,
    `Open the course: ${input.courseUrl}`,
  ];
  if (input.temporaryPassword) {
    lines.push('', `Temporary password: ${input.temporaryPassword}`, 'Sign in and change it after your first visit.');
  }
  return { to: '', subject: `Enrollment active for ${input.courseTitle}`, text: lines.join('\n') };
}

export function passwordResetMessage(input: { name: string; resetUrl: string }): OutboundMessage {
  return {
    to: '',
    subject: 'Reset your Fluentis password',
    text: [
      `Hello ${input.name},`,
      '',
      'A password reset was requested for your Fluentis account.',
      `Choose a new password: ${input.resetUrl}`,
      '',
      'This link expires in 15 minutes and can be used once.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  };
}

export function courseCompletedMessage(input: {
  name: string;
  courseTitle: string;
  certificateUrl: string;
  dashboardUrl: string;
}): OutboundMessage {
  return {
    to: '',
    subject: `You completed ${input.courseTitle}`,
    text: [
      `Hello ${input.name},`,
      '',
      `You completed every module of ${input.courseTitle}.`,
      `Verify the certificate: ${input.certificateUrl}`,
      `Download it from your dashboard: ${input.dashboardUrl}`,
    ].join('\n'),
  };
}

export class ResendTransport implements MailTransport {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly post: (url: string, init: RequestInit) => Promise<Response> = fetch,
  ) {}

  async send(message: OutboundMessage): Promise<void> {
    const response = await this.post('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend responded with status ${response.status}.`);
    }
  }
}
