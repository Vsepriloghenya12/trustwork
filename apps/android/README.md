# TrustWork — Android (TWA)

Android-приложение — это Trusted Web Activity: легкая обертка (~1–2 МБ), которая
открывает PWA (https://trustwork-pwa-production.up.railway.app) в полноэкранном
режиме через Chrome. Контент всегда актуален — при обновлении PWA пересобирать
APK не нужно. Пересборка нужна только при смене иконки, имени, домена или версии.

## Сборка релизного APK локально

Требования: JDK 17, Android SDK (пути прописаны в `~/.bubblewrap/config.json`).

```bash
cd apps/android
npx @bubblewrap/cli update --skipVersionUpgrade
BUBBLEWRAP_KEYSTORE_PASSWORD=<из keystore-passwords.txt> BUBBLEWRAP_KEY_PASSWORD=<тот же> npx @bubblewrap/cli build
```

Результат: `app-release-signed.apk` (подписан, готов к установке и RuStore).

## Ключ подписи — КРИТИЧНО

- `android.keystore` + `keystore-passwords.txt` лежат только локально (в git не попадают).
- **Сделайте резервную копию обоих файлов.** Потеря ключа = невозможность
  обновить приложение у пользователей (придется менять packageId).
- Отпечаток ключа прописан в `apps/pwa/public/.well-known/assetlinks.json` —
  это убирает адресную строку браузера в приложении. При смене ключа обновить
  отпечаток: `keytool -list -v -keystore android.keystore` → SHA256.

## Новая версия

В `twa-manifest.json` увеличить `appVersionCode` (+1) и `appVersionName`,
затем `update` + `build` как выше.
