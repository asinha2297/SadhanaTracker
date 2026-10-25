import type { SmsConfig } from '../config'
import type { Logger } from '../logger'

export interface SentSms {
  to: string
  message: string
}

export interface SmsSender {
  send(message: SentSms): Promise<void>
}

/** Development: the message, code included, goes to the server log instead of a phone. */
export const logSender = (logger: Logger): SmsSender => ({
  send: async ({ to, message }) => {
    logger.info({ to }, `SMS not sent (SMS_PROVIDER=log): ${message}`)
  },
})

export const twilioSender = ({ accountSid, authToken, from }: Extract<SmsConfig, { provider: 'twilio' }>): SmsSender => ({
  send: async ({ to, message }) => {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    })
    if (!response.ok) throw new Error(`Twilio refused the SMS: HTTP ${response.status}`)
  },
})

export const smsSender = (config: SmsConfig, logger: Logger): SmsSender =>
  config.provider === 'twilio' ? twilioSender(config) : logSender(logger)
