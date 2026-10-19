# Android 소스 전달 및 소유자 서명

이 문서는 고정된 게임 소스·웹 dist·Android 프로젝트를 받은 소유자가 재현과 서명을 준비하는 안내입니다. 아래 명령은 이 문서 작성 과정에서 실행하지 않았습니다. 키 생성·읽기, 계정 로그인, 서명, 설치, 스토어 업로드를 수행하지 않았습니다.

## 확인된 unsigned 빌드

`mobile/.work/android-build-2026-10-18T04-39-09-867Z/receipt.json`의 SHA-256은 `eb869b34015ce2b5a4e5cd7f9d55ceaa9f2aff587b98168a60167af9e2b0e400`입니다. 원 Gradle 로그는 252 actionable tasks, BUILD SUCCESSFUL, 4분 52초를 기록합니다. 해당 영수증의 웹 payload는 1.0.0-rc.1/source69/dist90/런타임 GLB14/asset map71입니다. 이 수량은 그 빌드의 이력이며 미래 전달본의 최종 inventory를 대신하지 않습니다.

| 산출물 | bytes | SHA-256 |
|---|---:|---|
| app-release-unsigned.apk | 81,962,396 | ab90760842dd135aff691b886c5acf682d24361c9080f17b6311674aecc7fe5d |
| app-release.aab | 80,929,524 | 1ff98af03d50382c3a6fa0b90ae38c1ca281931cf945e16d8177bd048e3fae8b |

영수증은 `unsignedRequested:true`, `signingAttempted:false`, `signaturesAudited:false`, `gameRuntimeValidated:false`, `storeReady:false`입니다. 성공한 빌드와 APK/AAB 서명·구조 검사, 실제 기기 게임 실행은 별도입니다. 별도 후속 검사 결과는 해당 보고서가 확정된 뒤에만 덧붙이세요. 이후 UI·코드·자산을 바꾸었다면 이 원 산출물이 새 변경을 포함한다고 주장할 수 없습니다.

## 소유자가 시작할 위치

ZIP의 SHA와 `NATIVE-SOURCE-MANIFEST.json`의 파일별 SHA/길이를 검증하고 새 소유 폴더에 추출합니다. `wandering-hearth/mobile`, `wandering-hearth/dist`, `wandering-hearth/src` 형제 배치를 유지합니다. `mobile`의 `webDir: ../dist`와 고정 origin은 바꾸지 않습니다. 웹 package 버전과 native 1.0.0/build1은 서로 다른 필드입니다.

`com.wanderinghearth.game`는 현재 소스의 임시 App ID입니다. 개발자 계정 소유권·Google Play 등록·상표/자산 권리·생산 서명·실기기 동작은 확인하지 않았습니다. 소유자가 ID를 바꾸면 applicationId/namespace/Capacitor config 및 관련 네이티브 프로젝트를 함께 검토하고, 원 저장 origin·복구와 새 앱의 관계도 재검증해야 합니다.

전달본에는 원 루트 PNPM lock과 별도 `mobile/package-lock.json`이 있습니다. 루트에 npm install을 실행해 PNPM 잠금 파일을 대체하지 마세요. 전달된 dist를 그대로 사용할 때 루트의 웹 dependency 재설치는 필요하지 않습니다. 웹을 다시 빌드할 때는 루트 잠금 파일에 맞는 환경으로 별도 재현하고 새 package/source/dist 조합을 검증합니다.

## 고정 도구와 Android 동기화

이 프로젝트의 확인된 조합은 Node24.19.0, Java21, Android minSdk24/compileSdk36/targetSdk36, Build Tools36.0.0, AGP8.13.0, Gradle8.14.3-all입니다. Gradle wrapper의 distribution SHA는 `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`입니다. 플랫폼과 라이선스는 소유자가 자신의 환경에 준비하며 여기서 설치·수락하지 않았습니다.

`mobile` 폴더에서 원 npm lock을 사용합니다. exact Capacitor core/CLI/android/ios8.5.3, App8.1.2, Preferences8.0.1, Haptics8.0.2, noble2.4.0이며 npm lock의 의존 항목은 루트 제외103개입니다. 다음은 이미 받은 Android 프로젝트를 동기화하는 명령이며 `cap add android`로 새 프로젝트를 만들지 않습니다.

```text
cd mobile
npm ci --ignore-scripts --no-audit --no-fund
node ./node_modules/@capacitor/cli/bin/capacitor sync android
node ./node_modules/@capacitor/cli/bin/capacitor open android
```

로컬 exact CLI를 직접 사용하여 별도 최신 CLI를 다운로드하는 npx 해석을 피합니다. SDK 경로는 소유 환경 또는 로컬 `local.properties`에만 두고 공개 소스에 개인 절대 경로를 넣지 마세요. Android Studio에서 `mobile/android`를 열 수 있습니다. Capacitor는 이 Android 프로젝트를 Android Studio로 관리하도록 안내합니다. [Capacitor Android 공식 안내](https://capacitorjs.com/docs/android)

## unsigned 재현

원 `android/app/build.gradle`의 debug/release `signingConfig null`을 유지합니다. `mobile/scripts/build-tools-36.init.gradle`은 application과 library **모든 모듈**에 설치된 Build Tools36.0.0을 적용합니다. app 하나의 설정만 바꾸면 플러그인 모듈이 다른 Build Tools를 요구할 수 있습니다.

`mobile/android`에서 Java21과 소유 SDK 환경을 지정한 뒤 다음 형태를 사용합니다. Windows는 `./gradlew` 대신 `./gradlew.bat` 또는 PowerShell의 `.\gradlew.bat`을 사용합니다.

```text
./gradlew --init-script ../scripts/build-tools-36.init.gradle --no-daemon --max-workers=2 --console=plain --stacktrace -Pandroid.builder.sdkDownload=false --write-verification-metadata sha256 assembleRelease bundleRelease
```

이 형태는 현재 원 빌드 스크립트의 공개 unsigned 재현 경로입니다. 실제 SDK·JDK 경로와 npm/Gradle 캐시는 소유자 전용 위치로 제한하세요. 첫 Gradle/Maven 해석은 네트워크가 필요할 수 있습니다. verification metadata를 새로 생성했다는 사실만으로 dependency 공급망을 별도 신뢰 검증했다고 주장하면 안 됩니다.

예상 위치는 `android/app/build/outputs/apk/release/app-release-unsigned.apk`, `android/app/build/outputs/bundle/release/app-release.aab`입니다. AAB는 직접 기기에 설치하는 파일이 아닙니다. APK와 AAB는 서로 다른 서명 절차가 적용되며 AAB에 apksigner를 사용하는 절차는 맞지 않습니다. [Android 명령줄 빌드·서명 안내](https://developer.android.com/build/building-cmdline)

## 소유자 서명 환경

소유자가 계정과 앱 ID 권리를 먼저 확인한 뒤 **별도 private copy/environment**에서 기존 upload key 정책을 선택합니다. 이 전달본의 unsigned 스크립트는 키 입력과 signing config를 거절하므로 서명용으로 우회하지 않습니다. 키·비밀번호·개인 경로를 원 소스, 공유 JSON, 명령줄 로그 또는 ZIP에 넣지 마세요.

Android Studio의 `Build > Generate Signed Bundle/APK`에서 Android App Bundle을 선택하고, 소유자의 기존 keystore/alias를 소유자 화면에서 입력한 뒤 release 출력 위치를 별도 private release 폴더로 정할 수 있습니다. 이 문서는 키를 새로 만들거나 읽지 않았고, 이 절차가 실행됐다고 기록하지 않습니다. Google Play용 upload key와 Play App Signing의 app signing key는 역할이 다릅니다. [Android 공식 앱 서명 안내](https://developer.android.com/studio/publish/app-signing)

Studio의 빌드는 위 터미널 `--init-script` 인수를 자동 상속하지 않습니다. 같은 Build Tools36 정책을 재현하려면 소유자 전용 Gradle User Home을 Studio에도 지정하고, 그 아래 `init.d/hearth-build-tools-36.init.gradle`에 공개 원 init script를 동일 bytes로 둡니다. 해당 private Gradle 설정에 `android.builder.sdkDownload=false`를 적용하고 Studio Gradle JDK를 Java21로 맞춥니다. 실제 빌드 로그에서 모든 Android 모듈에 이 정책이 적용됐는지 확인하세요. 이 IDE 설정은 문서상의 재현안이며 여기서 실행하지 않았습니다. [Gradle init script 공식 설명](https://docs.gradle.org/current/userguide/init_scripts.html)

소유자 CI에서 서명한다면 공개 unsigned 프로젝트와 별도 비밀 저장소·private signing hook를 사용하고, 자동 서명 설정 변경은 그 private copy에만 둡니다. 이 문서에 실제 keystore 경로·alias·비밀번호를 채우지 않습니다. 서명 후 APK는 apksigner 검증, AAB는 해당 JAR signing 검증 및 bundle 구조·패키지 ID/version 점검을 별도로 수행하세요. Google Play 계정/Play App Signing 설정·업로드·심사는 이 문서 작성 범위에서 모두 미실행입니다.

## 변경 후 재검증과 반출 제외

코드, 앱 ID, 버전, 아이콘, native dependency 또는 웹 dist를 바꾸면 원 성공 보고서와 다른 조합입니다. exact source69라는 옛 개수를 재사용하지 말고 실제 source 전체·root PNPM/mobile npm lock·native source·dist 전체·원본/runtime GLB·asset body SHA를 새로 고정합니다. `cap sync android` 뒤 앱에 복사된 payload가 최종 dist와 같은지, DEV/source map/개인 경로가 없는지, native 설정·플러그인·origin이 기대대로인지 확인합니다. 웹·모의 bridge 검사와 실제 Android Back/배경복귀/수명주기/저장·복원/조작감 검증은 서로 대체하지 않습니다.

공개 소스 ZIP에는 `.git`, node_modules, WORK/verification/release, SDK·Gradle/cache/build 출력, local.properties, 실제 입력 JSON, keystore/jks/p12/pfx/p8·인증/프로비저닝 자료, 계정 파일·개인 경로·비밀번호를 포함하지 않습니다. 서명 APK/AAB와 공개 source ZIP을 별도 산출물로 관리하고 각 최종 SHA를 기록하세요. 패키지 해시나 unsigned 빌드 성공은 게임/브랜드/음원/Meshy의 배포 권리 승인, 스토어 등록 또는 실기기 완료를 뜻하지 않습니다.

## 최종 출력 추가 검사

같은 unsigned APK ab907608…/AAB 1ff98af0…에 대해 별도 최종 출력 감사 v4가 통과했다. 실제 apksigner unsigned negative exit1, zipalign16KiB exit0, aapt2 identity/SDK/권한3개 exit0, JDK21 no-manifest unsigned exact-output exit0을 확인했다. source69·dist90×2·71 binary·14 GLB/CRC·자산 지문은 불변이다. APK의 정확한 res9 alias 허용, SDK36 minSdkVersion 라벨, JAR manifest 없는 unsigned exit0의 서로 다른 세 원 실패도 보존했다. 공식 bundletool1.18.3 validate exit0/1.734초가 동일 AAB를 검증했다. 이 결과는 배포 서명·설치·기기·Play 승인이나 .so 없는 앱의 물리 16KiB 실행 증거가 아니다. 후속 UI/Back/splash 변경 뒤에는 새 조합을 빌드한다.
