# TrustWork — Android (TWA)

Android-приложение — это Trusted Web Activity: легкая обертка (~1–2 МБ), которая
открывает PWA (https://trustwork-pwa-production.up.railway.app) в полноэкранном
режиме через Chrome. Контент всегда актуален — при обновлении PWA пересобирать
APK не нужно. Пересборка нужна только при смене иконки, имени, домена или версии.

## Сборка релизного APK локально

Требования: JDK 17, Android SDK (пути прописаны в `~/.bubblewrap/config.json`).

**Особенность этого ПК:** у JDK не работают AF_UNIX-сокеты со стандартным temp-путем —
без обходного флага Gradle падает с «Unable to establish loopback connection».
Флаг уже прописан в `gradle.properties`, но также нужен в окружении (PowerShell):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_TOOL_OPTIONS = '-Djdk.net.unixdomain.tmpdir=D:\tmp'   # папка D:\tmp должна существовать
cd D:\trustwork\apps\android
npx @bubblewrap/cli update --skipVersionUpgrade   # регенерация проекта после правок twa-manifest.json
.\gradlew.bat assembleRelease
```

Подпись (пароль — в `keystore-passwords.txt`):

```powershell
$bt = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.1.0"
& "$bt\zipalign.exe" -f -p 4 app\build\outputs\apk\release\app-release-unsigned.apk aligned.apk
& "$bt\apksigner.bat" sign --ks android.keystore --ks-key-alias trustwork --ks-pass pass:<ПАРОЛЬ> --key-pass pass:<ПАРОЛЬ> --out TrustWork-X.Y.Z.apk aligned.apk
```

Внимание: `bubblewrap update` перезаписывает `gradle.properties` — после него
вернуть туда строку `org.gradle.jvmargs=-Xmx1536m -Djdk.net.unixdomain.tmpdir=D:\\tmp`.

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
