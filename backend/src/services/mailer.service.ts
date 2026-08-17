import nodemailer from 'nodemailer'

const port = Number(process.env.SMTP_PORT)

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null

if (!transporter) {
  console.warn('⚠️  SMTP-Zugangsdaten fehlen in der .env — E-Mail-Versand ist deaktiviert.')
}

interface SendMailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!transporter) {
    throw new Error('SMTP ist nicht konfiguriert')
  }

  await transporter.sendMail({
    from: `"Strothi's Hub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
