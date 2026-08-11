import { config } from '../config.js'

// В dev-режиме SMS не отправляется — код пишется в лог сервера.
// TODO(production): интеграция SMS.ru или Firebase Phone Auth
export async function sendSms(phone, text) {
  if (config.smsProvider === 'dev') {
    console.log(`[SMS:dev] ${phone}: ${text}`)
    return
  }
  throw new Error(`SMS-провайдер "${config.smsProvider}" не настроен`)
}
