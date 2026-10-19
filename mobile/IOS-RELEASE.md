# iOS 소스 전달 및 소유자 서명 절차

이 문서는 Mac 소유자가 수행할 후속 절차다. 현재 Windows에서 iOS 소스와 정적 설정을 읽었으며, Swift package resolve·Xcode compile/archive/export·서명·iPhone/iPad 실행은 하지 않았다. 웹 source69의 네이티브 연결과 데스크톱 모의 브리지 검증은 실제 iOS 실행과 구별한다. 현재 source69의 실제 Android/iOS sync와 unsigned Android build 결과·파일 SHA는 README 상태표와 별도 영수증에 기록했다. Apple 컴파일/실행 검증은 여전히 남아 있다.

## 전달할 폴더

ZIP 안에 하나의 `wandering-hearth/` 루트를 둔다. `mobile/`, `dist/`, `src/`를 형제로 유지한다. `mobile/capacitor.config.json`의 `webDir: '../dist'`와 SPM의 `../../../node_modules/@capacitor/{app,haptics,preferences}` 상대경로가 이 구조에 의존한다.

```text
wandering-hearth/
  NATIVE-SOURCE-MANIFEST.json       # 실제 최종 파일목록·크기·SHA256
  README-NATIVE.md
  package.json                    # 웹 1.0.0-rc.1
  pnpm-lock.yaml                  # 웹 의존성; mobile npm lock과 구별
  index.html / vite.config.js
  src/                            # 최종 승인 source69
  dist/                           # 최종 승인 빌드 전체, 14 runtime GLB/71 asset map
  public/                         # 원본14 GLB·reference·license 등 웹 build 입력
  runtime-models/                  # 원 manifest 및 runtime14 cache
  scripts/ / tests/                # 웹 재빌드·회귀 입력, 기존 원문
  asset-provenance.json            # 기존 공개 출처 자료
  mobile/
    package.json / package-lock.json
    capacitor.config.json
    ios/                          # App.xcodeproj / CapApp-SPM / Swift / resource
    android/                      # 함께 제공할 때 정적 소스만
    scripts/ / licenses/ / brand/
    README.md / IOS-RELEASE.md
    inputs/*-template.json        # ready:false/개인경로 null 템플릿만
    inputs/export-options.owner-template.plist  # OWNER_* placeholder만
```

ZIP에는 `.git`, `node_modules`, `.work`, WORK/verification/support 아카이브, 실제 `inputs/*final*`, npmrc의 인증정보, 개인 SDK/프로필 경로, `local.properties`, Gradle/cache/build, `DerivedData`, `SourcePackages`, `xcuserdata`, 개인 `.xcuserstate`, `.p12/.p8/.mobileprovision/.keystore/.jks`, 인증서·키·계정·비밀번호를 넣지 않는다. 기존 `ios/App/App/public`의 생성 payload와 생성 capacitor config는 sync 재생성 대상으로 제외하고 최종 원본 `dist/`를 한 번 포함한다. 서명용 owner plist를 채운 실파일도 ZIP 밖에 둔다. 경로 탈출·대소문자 중복·심볼릭 링크·누락 SHA를 패키저가 거절하고, 추출 뒤 전체 manifest와 dist14/71를 다시 대조한다. 실제 ZIP 생성은 이 검토에서 하지 않았다.

## 확인된 설정과 아직 필요한 소유자 정보

Capacitor core/CLI/android/ios는8.5.3, App8.1.2/Preferences8.0.1/Haptics8.0.2다. mobile npm lock은 하위 의존성103개를 고정한다. native marketing version1.0.0/build1은 웹 package1.0.0-rc.1과 별도 필드다. 배포 전 build 번호의 사용 가능 여부는 App Store Connect 소유자가 확인한다.

`com.wanderinghearth.game`는 현재 코드의 임시 bundle ID이며 소유·등록을 확인하지 않았다. owner Team ID, Apple Developer Program/역할, App ID와 App Store Connect record, provisioning profile/certificate, 브랜드·Meshy·이미지 권리, privacy/data collection/연령 메타데이터가 확인되어야 서명·배포 단계로 갈 수 있다. 이 문서는 계정에 접속하거나 값을 생성·대체하지 않는다.

최소 iOS15/Xcode26.0+는 [Capacitor 공식 지원 범위](https://capacitorjs.com/docs/ios)다. 현재 SPM 프로젝트는 `ios/App/App.xcodeproj`이며 CocoaPods workspace를 새로 만들지 않는다. CLI가 CapApp-SPM을 관리하므로 [SPM 공식 절차](https://capacitorjs.com/docs/ios/spm)에 따라 sync 후 내용과 Package.resolved를 기록한다. 원 Package.swift의 core exact8.5.3 및 로컬3plugin 경로를 바꾸지 않는다.

## Mac에서 수행할 로컬 명령

아래 명령은 이 Windows 검토에서 실행하지 않았다. owner가 압축 해제 후 mobile 폴더로 이동하고 Mac용 Node24.19.0/npm11.17.0과 Xcode26+를 직접 준비·버전 확인한다. Windows Node/JDK/SDK 실행파일 SHA를 Mac 실행파일 핀으로 재사용하지 않는다. tool SHA/실제 macOS/Xcode build와 원 stdout/stderr를 새 소유 기록에 남긴다.

```sh
cd /owner/chosen/path/wandering-hearth/mobile
IOS_WORK="$PWD/.work/ios-owner-check"
mkdir -p "$IOS_WORK/npm-cache"
touch "$IOS_WORK/npm-user.npmrc" "$IOS_WORK/npm-global.npmrc"
node --version
npm --version
xcode-select -p
xcrun xcodebuild -version
npm ci --ignore-scripts --no-audit --no-fund \
  --cache "$IOS_WORK/npm-cache" \
  --userconfig "$IOS_WORK/npm-user.npmrc" \
  --globalconfig "$IOS_WORK/npm-global.npmrc"
node -p "require('./node_modules/@capacitor/cli/package.json').version"
node ./node_modules/@capacitor/cli/bin/capacitor sync ios
node ./node_modules/@capacitor/cli/bin/capacitor open ios
```

`npm ci`는 mobile lock의 exact dependencies를 설치하는 owner의 후속 네트워크 작업이다. root 웹 프로젝트에서 npm install/lock 교체를 하지 않는다. npx나 전역 cap/latest 설치로 CLI를 바꾸지 않는다. 위 sync는 승인된 final `../dist`를 복사하고 package 등록을 갱신하는 단계이며 archive나 실기기 성공을 뜻하지 않는다. 현재 `scripts/sync.cjs`의 toolsCheck/environment는 Windows Node/Android SDK 핀과 Windows PATH를 요구하므로 이 Mac iOS 예시에 그대로 적용하지 않는다. Mac 전용 digest/timeout wrapper가 필요하면 별도 준비한다.

sync 뒤 `ios/App/App/public`의 모든 원 dist 파일 SHA, generated capacitor config의 `capacitor://localhost`/외부server URL 없음, AppPlugin/HapticsPlugin/PreferencesPlugin, SPM core exact8.5.3을 확인한다. iOS origin은 고정하며 오프라인 실행 시 외부 서버가 필요하다고 바꾸지 않는다. 최초 SPM resolve에는 원 core 저장소 접근이 필요할 수 있고 실행 시 앱의 오프라인 동작과는 다른 단계다.

## 서명 없이 compile/archive 확인

owner가 준비한 Xcode 환경에서 다음 형태로 별도 확인한다. 최초 resolve 뒤 생성된 Package.resolved와 core commit 정보를 기록하며 검증 전 갱신·삭제하지 않는다. 각 명령의 timeout/소유 output 경계는 해당 Mac에서 준비한다. 여기서는 명령 형태만 제공하며 실행 가능한 Apple 도구 상태를 확인하지 않았다.

```sh
xcrun xcodebuild -resolvePackageDependencies \
  -project ios/App/App.xcodeproj -scheme App \
  -clonedSourcePackagesDirPath "$IOS_WORK/SourcePackages"
xcrun xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$IOS_WORK/WanderingHearth-unsigned.xcarchive" \
  -derivedDataPath "$IOS_WORK/DerivedData" \
  -clonedSourcePackagesDirPath "$IOS_WORK/SourcePackages" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive
```

unsigned archive는 설치·제출 가능한 signed IPA가 아니다. 개인 keychain 조회, 서명 자동화·프로비저닝 변경·계정 로그인·업로드는 이 절차에 포함하지 않는다. 앱 아이콘은 현재1024×1024 RGB8 PNG이고 alpha/tRNS가 없으며 asset catalog에 참조된다. 실제 Xcode asset compile 및 디자인/권리 승인은 별도다.

PrivacyInfo.xcprivacy는 target Resources에 포함되며 UserDefaults/CA92.1을 선언한다. 이는 [Preferences 공식 권장 reason](https://capacitorjs.com/docs/apis/preferences)의 현재 사용 범위에 대응한다. 전체 앱의 데이터 수집/추적/스토어 privacy 응답을 대신 승인하는 자료가 아니다. Preferences ack/readback을 fsync나 강제 종료 내구성으로 표현하지 않는다.

## 소유자 서명과 export

계정·Team/App ID·권리·privacy 검수 뒤 owner가 Xcode Signing & Capabilities에서 실제 정보를 선택하고 **별도의 signed archive**를 만든다. 현재 OWNER_* export template은 실행 입력으로 사용하지 않는다. owner가 채운 plist를 ZIP 외부에 보관하고 해당 Xcode의 `xcodebuild -help`에서 지원 export key/method를 확인한 뒤 다음 형태를 사용한다.

```sh
xcrun xcodebuild -exportArchive \
  -archivePath /owner/signed/WanderingHearth.xcarchive \
  -exportPath /owner/export/WanderingHearth \
  -exportOptionsPlist /owner/private/export-options.plist
```

서명된 archive의 validation/export, 실기기 오프라인·앱 background/foreground·Back 대신 iOS UI 정책·Haptics·save/crash/update/migration 확인 후 배포를 판단한다. [Apple 배포 절차](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases/)의 archive/validate/export/upload는 별도 단계다. 현재 소스 ZIP·PC 모의 브리지·Android 산출물을 iOS 빌드·서명·스토어 승인으로 표시하지 않는다.

## Windows 동기화 갱신

2026-10-18 실제 Windows sync ios가 source69의 최종 dist90파일/71자산/14 GLB와 플러그인3개를 포함했다. 양쪽 payload를 다시 해시했지만 Mac에서 Swift resolve·Xcode 컴파일·서명·iPhone 실행은 하지 않았다. 동기화 영수증9aa8222d…와 빌드 전 문서는 verification/native-package/support에 보존했다. 후속 UI/Back/splash 변경을 마친 최종 소스 ZIP을 Mac에서 다시 sync해야 한다.
