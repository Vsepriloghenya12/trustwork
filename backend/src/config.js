export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  isProd: process.env.NODE_ENV === 'production',
  smsProvider: process.env.SMS_PROVIDER || 'dev',
}

if (config.isProd && config.jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET обязателен в production')
}
