import { config } from '../config.js'

// Отправка SMS. Провайдер выбирается переменной SMS_PROVIDER:
//  dev    — SMS не отправляется, код пишется в лог сервера (для разработки);
//  sms_ru — боевая отправка через sms.ru (нужен SMSRU_API_KEY).
export async function sendSms(phone, text) {
  if (config.smsProvider === 'dev') {
    console.log(`[SMS:dev] ${phone}: ${text}`)
    return
  }
  if (config.smsProvider === 'sms_ru') {
    return sendViaSmsRu(phone, text)
  }
  throw new Error(`SMS-провайдер "${config.smsProvider}" не настроен`)
}

async function sendViaSmsRu(phone, text) {
  const apiKey = process.env.SMSRU_API_KEY
  if (!apiKey) throw new Error('SMSRU_API_KEY не задан')
  const url = new URL('https://sms.ru/sms/send')
  url.searchParams.set('api_id', apiKey)
  url.searchParams.set('to', phone.replace('+', ''))
  url.searchParams.set('msg', text)
  url.searchParams.set('json', '1')
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  const smsStatus = data?.sms?.[Object.keys(data?.sms ?? {})[0]]
  if (data?.status !== 'OK' || (smsStatus && smsStatus.status !== 'OK')) {
    console.error('[SMS:sms_ru] ошибка отправки:', JSON.stringify(data))
    throw new Error('Не удалось отправить SMS, попробуйте позже')
  }
}
