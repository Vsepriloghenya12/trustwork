import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'

// Push работает, только если заданы ключи VAPID. Без них уведомления
// продолжают копиться внутри приложения — просто не прилетают на телефон.
const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

export const pushEnabled = Boolean(publicKey && privateKey)

if (pushEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@trustwork.app',
    publicKey,
    privateKey,
  )
}

export function vapidPublicKey() {
  return publicKey ?? null
}

// Отправка на все устройства пользователя. Мертвые подписки удаляем:
// браузер отвечает 404 или 410, когда разрешение отозвано.
export async function sendPush(userId, payload) {
  if (!pushEnabled) return
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushEnabled: true, pushDevices: true },
  })
  if (!user?.pushEnabled || user.pushDevices.length === 0) return

  const body = JSON.stringify(payload)
  await Promise.all(
    user.pushDevices.map(async (device) => {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          body,
        )
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await prisma.pushDevice.delete({ where: { id: device.id } }).catch(() => {})
        } else {
          console.error('[push]', e.statusCode, e.body ?? e.message)
        }
      }
    }),
  )
}
