# 작은 성의 큰 여행 — 네이티브 프로젝트

이 폴더는 현재 웹 게임을 포함할 Android/iOS 소스 프로젝트다. 원085b 후보의 placeholder는 포함하지 않았다. 웹 source69에는 저장/수명주기/Back/Haptics가 연결되었고 PC 모의 bridge 검증을 마쳤다. 실제 OS/기기 실행과 구별한다. 부모 `../dist`는 최종 검증된 웹 빌드이며, 아래 단계는 해당 package/source/dist 조합의 실제 영수증으로만 갱신한다.

| 단계 | 현재 확인 상태 |
|---|---|
| 웹 | 1.0.0-rc.1; source69/14 runtime GLB/71 asset map, 전체890·compiled 두 경로 통과 |
| Native | 1.0.0/build1; exact npm 하위 의존성103 |
| Android/iOS final sync | 현재 게임 dist90개를 양쪽에 정확 복사·플러그인3개; Windows iOS sync는 Swift 컴파일과 구별 |
| Android unsigned APK/AAB | 실제252 task/4분52초 빌드·90파일×2/71자산/14GLB 재검수·Google bundletool validate 통과; 미서명 |
| iOS Swift/Xcode/archive/export | Mac 환경에서 미실행 |
| 앱 계정·ID 소유·권리·배포 서명·실기기 | 미확인; releaseReady=false |

- ID `com.wanderinghearth.game`는 임시이며 계정 소유/스토어 등록을 확인하지 않았다. 표시 이름은 `작은 성의 큰 여행`, native version1.0.0/code1이다.
- `webDir: '../dist'`; Android `https://localhost`, iOS `capacitor://localhost`; 외부 server URL 없음, allowNavigation 빈 배열, cleartext false를 유지한다. 이 origin을 바꾸면 기존 저장소 이전을 별도로 검증해야 한다.
- Android min24/compile·target36, Java21, Gradle8.14.3-all SHA256 `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`다. init script는 application/library 모든 모듈의 Build Tools를 이미 설치한36.0.0으로 고정한다. SDK 자동 다운로드를 막는다.
- Capacitor core/CLI/android/ios8.5.3, App8.1.2/Preferences8.0.1/Haptics8.0.2, noble/hashes2.4.0이다. 원 lock의 의존성103개(루트 포함104항목)는 모두 동일하다. 루트 name/version만 바뀌며 scripts는 package.json에 있다. node_modules는 포함하지 않는다.

## 준비 순서

1. 검토한 후보와 두 개의 ignore/credential-guard 보정을 프로젝트의 `mobile/`로 승격했다. WORK 원본/seed/staging을 덮어쓰지 않는다. 원 lock 그대로 isolated `npm ci --ignore-scripts --no-audit --no-fund`를 수행하거나 기존 seed의 검증된 module bytes를 새 mobile/node_modules에 복사한다. npm user/global config·cache도 소유 WORK 경로로 제한한다. 이번 작업에서 npm을 실행하지 않았다.
2. native adapter까지 포함한 최종 웹 build/배포 검증 후 `inputs/sync-template.json`을 새 파일로 복제한다. `ready:true`는 source/dist/tool 목록이 실제 bytes로 모두 핀되었다는 내부 단계 표시다. 새 인간 승인 절차가 아니다. 최종 byte 핀이 없으면 원 템플릿은 실행되지 않는다.
3. 정확히 핀된 Node24.19.0으로 아래 형태를 실행한다. 각 입력파일은 mobile 내부에 놓으며 인수 SHA는 해당 파일 전체 SHA256이다. `--execute` 없는 호출은 입력 digest/schema만 확인하고 파일·child를 만들지 않는다. full preflight 통과 주장은 하지 않는다.

```text
<pinned-node> scripts/sync.cjs inputs/sync-final.json <SHA256> --execute
```

sourceFiles는 프로젝트 `src/` 전체 목록, distFiles는 `dist/` 전체 목록을 빠짐없이 포함한다. package.json의 승인 version과 원문 SHA, dist/asset-versions.json의71개 실제 body SHA, runtime-assets.json의14개 모델 및 GLB header/length를 대조한다. source map·DEV 전역/Vite client/local dev URL·명시 credential/private-path regex가 발견되면 내용 출력 없이 중단한다. 정규식은 모든 비밀값 부재를 보증하는 완전한 탐지기가 아니다. package/source/dist 조합은 root가 실제 최종 build의 조합으로 승인해야 하며, script가 timestamp로 rebuild 여부를 추측하지 않는다.

mobileSourceFiles는 `guards.cjs`의 mobileSourceFiles()가 반환하는 정적 소스 전체를 핀한다. `inputs`, `.work`, node_modules, Android Gradle/build 산출물, 복사된 public payload, local.properties는 제외한다. dependencyFiles는 node_modules의 source 전체를 핀하며 Capacitor Android/app/haptics/preferences의 네 개 Gradle 모듈 build/.gradle 출력만 별도로 제외한다. root 승인 입력은 실제 목록을 채우며 개수나 누락 SHA를 추정하지 않는다. tools/workspaceRoot는 로컬 실행 입력에만 존재하고 앱 소스에 개인 절대 SDK 경로를 넣지 않는다.

sync child는 로컬 정확 CLI8.5.3을 직접 Node로 `sync android`/`sync ios` 호출한다(npx·설치·shell 없음). 플랫폼당5분, stdin닫힘/숨김Windows, HOME/Android/npm/temp/state 격리를 사용한다. child의 쓰기는 검토된 CLI가 소유 mobile cwd에서 수행하는 작업이며 OS filesystem sandbox를 제공한다고 주장하지 않는다. 생성 public payload의 모든 dist bytes와 plugin3개/고정 origin, 원 product·deps·tool pins를 다시 대조한다. 원문 stdout/stderr와 실패는 mobile/.work에 남긴다. iOS Windows sync는 소스 준비이며 Swift package resolve/컴파일/실행 증명이 아니다.

## Android unsigned 출력

성공한 sync receipt와 **같은 product block**을 build 입력에 복사하고, post-sync mobileSourceFiles·dependencyFiles·Java21 release 파일·SDK 선택 핀을 다시 잡는다. SDK는 platform-tools37.0.1, API36, Build Tools36.0.0 source.properties까지 요구한다. `syncReceipt`는 mobile 상대경로+bytes+SHA다. Android source의 debug/release `signingConfig null`은 유지하고 키 경로/비밀번호를 넣지 않는다.

```text
<pinned-node> scripts/build-android.cjs inputs/android-final.json <SHA256> --execute
```

기본 operation `unsigned-release`는 명시적으로 `assembleRelease bundleRelease`, 별도 `unsigned-debug`는 `assembleDebug`를 실행한다. Java는 입력에서 핀된 소유 JDK21 실행파일만 직접 호출한다. `--no-daemon --max-workers=2 --console=plain --stacktrace -Pandroid.builder.sdkDownload=false --write-verification-metadata sha256`와 모듈 전체 Build Tools init을 사용한다. 최대15분/닫힌stdin/숨김Windows/소유 process tree 종료다. Gradle와 공식 Google Maven/Maven Central 첫 해석은 SHA 기록만 남기며, 새 플러그인을 포함한 독립 supply-chain 신뢰 검증으로 부르지 않는다. 사용자 HOME/전역 PATH/기존 SDK를 바꾸거나 키를 생성하지 않는다.

| 요청 | 예상 출력 | 확인 상태 |
|---|---|---|
| unsigned-debug | android/app/build/outputs/apk/debug/app-debug-unsigned.apk | 미실행 |
| unsigned-release | android/app/build/outputs/apk/release/app-release-unsigned.apk | 실제 빌드/미서명 확인·81,962,396B |
| unsigned-release | android/app/build/outputs/bundle/release/app-release.aab | 실제 빌드/미서명 확인·80,929,524B |

빌드 영수증은 **unsignedRequested/signaturesAudited:false**로 기록한다. 성공 후에도 apksigner unsigned negative/zipalign/aapt2/ZIP safe entries·서명블록/AAB JAR-signature·최종 게임 payload·기기 실행을 별도로 검수해야 한다. 이전 unsigned placeholder APK4,113,714B의92task 성공과 BuildTools35 누락 첫 실패는 이번 후보 빌드 성공이 아니다. 원 Gradle9 deprecation/SDKXML/uncheckedJava 경고는 그대로 역사 원문에 남아 있다.

## 브랜드와 출시 한계

기존 hand-authored SVG의 색/형태를 바꾸지 않은 adaptive XML·legacy PNG48/72/96/144/192와 iOS1024 catalog를 연결했다. round 아이콘도 같은 원본이며 미리 둥근 mask를 굽지 않았다. 제품 favicon·기존 브랜드/seed/staging은 바꾸지 않았다. `brand/google-play-icon-512.png`는 업로드 후보이며 앱 runtime에 새 이미지 생성/API를 사용하지 않는다. 기술 PNG 확인은 최종 아이콘 owner 디자인/권리 승인이나 실제 launcher/iOS asset catalog 승인과 별개다. 기본 template splash는 이번 아이콘 변경 범위 밖으로 유지했다.

license 디렉터리는 직접 사용한8개 npm 패키지 MIT 원문과 브랜드 출처 후보 기록이다. 전이 의존성/Gradle/게임 Meshy·이미지 전체의 권리를 모두 승인한 문서가 아니다. UserDefaults CA92.1 privacy manifest 후보는 유지했으나 완전한 privacy/data safety/age/store 목록과 동일하지 않다. 계정·상표/ID·서명·물리기기·native save crash 내구성·FPS·새 정상15판·스토어 업로드는 별도 미검증이다.

Capacitor8의 [iOS15+/Xcode26 요구](https://capacitorjs.com/docs/ios), [Android 공식 설정](https://capacitorjs.com/docs/android), [Apple 배포 흐름](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)을 따른다. macOS 단계는 IOS-RELEASE.md를 참고한다.

## 2026-10-18 실제 출력 검증

위 기록은 source69의 54562dc8 코드 조합이다. 빌드 후 문서만 보완했으며 이전 문서107개와 입력 템플릿3개를 별도 보존했다. 최종 웹은 실제 루트/하위 경로에서 튜토리얼·이동·저장·재로드·이어하기·단회 정산·10초 공사·카메라를 확인했다. 사용자4180의 탭/저장은 조작하지 않았다.

- APK SHA256: `ab90760842dd135aff691b886c5acf682d24361c9080f17b6311674aecc7fe5d`. APK 서명 부재(검사 exit1), 16KiB ZIP 정렬, ID/version/min24/target36 및 권한3개를 확인했다. .so가 없어 native page 검사는 적용 대상이 없다.
- AAB SHA256: `1ff98af03d50382c3a6fa0b90ae38c1ca281931cf945e16d8177bd048e3fae8b`. JAR manifest/서명 entry가 없고 정확한 unsigned 출력만 확인했다. jarsigner exit0을 서명 성공으로 해석하지 않는다. Google 공식 bundletool1.18.3 validate exit0/1.734초는 bundle 형식 검사이며 Play 생성 APK·설치/승인 증거가 아니다.
- 출력 검사 원장: verification/native-package/root-review.json. 양쪽 payload90개와 빈 Cordova2개·14 GLB·71 binary body를 재해시했다. APK의 AAPT2 생성 res9개 case alias만 정확한 APK SHA에 한해 indexed ZIP 조회로 승인했다. 파일시스템 추출이나 다른 입력에 일반 예외를 적용하지 않는다.
- 다음 항목: 빠른 Continue 뒤 이전 저장 toast, 영어 pause 간격, Android 타이틀 Back 최소화, 기본 template splash 교체. 이 임시 출력은 해당 후속을 포함하지 않는다. 최종 출력은 새 source/dist 조합으로 다시 빌드·검증한다.
- 현재 출력은 서명되지 않아 설치/제출용 완성본이 아니다. 소유 계정·최종 ID·기존 서명키·Mac Xcode26/iOS 실행·물리기기·권리·지속 성능·최신 정상15판은 미확인이다. releaseReady=false. Android 절차는 ANDROID-RELEASE.md, Apple 절차는 IOS-RELEASE.md 참조.
