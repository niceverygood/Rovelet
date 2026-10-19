# 작은 성의 큰 여행 — 네이티브 소스 전달 안내

주의: 기존 mobile/README.md의 전체890/dist90 표와54562dc8·APK ab907/AAB1ff98 기록은 과거 중간 조합이며 최신 상태가 아닙니다. 최신 상태는 이 루트 README-NATIVE.md와 RELEASE_STATUS.json을 기준으로 합니다. mobile/README.md의 과거 상태표는 native109 소스 지도 보존을 위해 그대로 두었습니다.

이 문서는 네이티브 소스와 검증된 미서명 Android 산출물의 전달 안내입니다. 기존 mobile/README.md의 역사 상태표와 구분하며, 서명·설치·스토어 제출 및 최종 소스 ZIP 완료를 뜻하지 않습니다. 현재 source69, Meshy 원본/런타임 각14개(이미지 기반12+텍스트 기반2), 바이너리 지문71개,30무기·15판입니다. tint 항목 ROOT79680b8의 전체1013·집중38 PASS와 after-only 실제34.992초/raw6·full6/오류·경고0을 확인했습니다. limitedTintAccepted:true는 warm dark-grey tint 표현만의 제한 승인이고, 작거나 흐린 전체 연기 기둥의 가독성과 c.3/parent damage는 여전히OPEN입니다. 현재 unsigned native 빌드·출력 검증은 완료했고 최신 정상 실시간15판 완료는0이며 releaseReady=false입니다.

현재 소스에는 초원·화산·빙하의 전투3지역·15판·30무기, 한국어/영어, 시설별10/14/18/22/26/30초 공사, 마을 카메라와 같은 시설·주민·저장을 공유하는 마을3풍경이 있습니다. 마을 지역은 기존 캠페인1/6/11 진척으로 열리며 별도 재화·저장 슬롯을 만들지 않습니다. 실제3D 포탄·파편과 폭발 효과도 있습니다. 네이티브 시작 전 저장 복구, Preferences 보조 사본, App 수명주기·Android Back·Haptics 연결도 있습니다. 저장 ACK/readback은 fsync·강제 종료 내구성·클라우드 동기화 보증이 아닙니다. 개별 기능 회귀와 모의 브리지 검증을 최신 정상 RAF 15판·실기기 실행으로 확대하지 않습니다.

## 과거 중간 산출물과 현재 전달 상태

`fadb286e9f2bbd164b8a6a8dce70d589bed4c0e7`의 c.1 스플래시 중간 Android 출력입니다. 이후 d/e/f 고지·개인정보, charge e.1·지붕 Apex 기능·마을3풍경·g 바퀴 수정 고지·warm-tint까지 포함한 최종 앱으로 표시하지 않습니다.

| 중간 출력 | bytes | SHA-256 |
|---|---:|---|
| unsigned APK | 81,881,240 | 193ecf4fd63980b341c386ad3e56eb1003d75d030f2dade02b2650a3a49115d0 |
| unsigned AAB | 80,874,384 | c593bb25f43e45853542c1e056f75003eb05ca64fdd3978b421f3b58b600dcd1 |

c.1은 자체 cream 스플래시의 Android compiled resource 연결을 확인했습니다. 11 legacy 구성의 layer box 160dp이며, 실제 OS cold start·Android 12+ 시스템 mask·iOS 컴파일/실화면 검증은 아닙니다. 원 출력 검수의 APK unsigned negative와 AAB unsigned 결과를 서명 성공으로 해석하지 않습니다. c.1의 새 AAB에 대한 bundletool 검증도 최종 영수증에서 별도로 확인해야 합니다. 원 과거 빌드·별개 원인 실패·이전 문서와 로그는 원본 프로젝트 기록에 보존합니다.

최종 소스 ZIP/추출 검증은 아직 미완료입니다. ZIP가 만들어지면 ZIP 밖의 전달 매니페스트·SHA256 파일에서 ZIP 지문을 확인하고, ZIP 안 NATIVE-SOURCE-MANIFEST.json에서 각 파일의 지문을 확인합니다. 이 문서에 자기 ZIP의 미래 SHA를 넣지 않습니다. 최종 release commit·소유자·서명·OS/실기기·Mac/iOS·정상15판·FPS 승인 미완료는 RELEASE_STATUS.json을 따릅니다.

d.1 전체 고지 뷰어(d52d42e8), e.1 Android binary Apache 고지(7d5b0f4c), f.1 한영 로컬 개인정보 뷰어(d9a4c41d)는 현재 소스에 반영되고 실제 브라우저·compiled HTTP 검증을 마쳤습니다. d/e는 각5문맥11사진, f는5문맥22사진이며 스크롤·44px 닫기·Retry·Back/비활성·늦은 응답 취소와 문서별 cache를 검증했습니다. 데스크톱 렌더/모의 native 브리지 증거로서 실제 Android/iOS 설치·OS 수명주기·법률 충분성·상용 권리 증거는 아닙니다.

개인정보 문서는 앱 안에서 읽는 로컬 안내 초안입니다. 운영자·지원 연락처·지원 URL·공개 privacy/marketing URL은 null이며 공개 정책 URL을 발행하지 않았습니다. Android 시스템 백업 허용과 별도 backup/data-extraction 규칙 부재로 OS backup/이전이 가능함을 고지합니다. 계정·광고·분석 업로드·게임 전용 클라우드가 코드에 없다는 사실을 모든 정보가 항상 기기에만 남는다는 보증으로 확대하지 않습니다.

## 전달 배치와 재현

ZIP의 최상위는 `wandering-hearth/` 하나입니다. `src/`, `dist/`, `public/`, `runtime-models/`, `scripts/`, `tests/`, `mobile/`를 형제로 둡니다. 공개 문서 `LICENSES.md`, `ASSET_DELIVERY.md`, `STORE.md`, `README-NATIVE.md` 네 개 모두 실제 선택 파일 행에 포함해야 합니다. ZIP SHA, 내부 `NATIVE-SOURCE-MANIFEST.json`의 모든 path/bytes/SHA, 추출 후 dist·14/71을 확인합니다. 원 source packager c684와 필수 문서 검사 후속판의 기준을 유지합니다.

루트 `pnpm-lock.yaml`과 `mobile/package-lock.json`을 구분합니다. 원 모바일 lock의 하위 의존성은 103개입니다. 루트에 npm install로 PNPM lock을 대체하지 않습니다. 최종 dist를 그대로 쓸 때는 웹 의존성 재설치가 필요하지 않습니다. `node_modules`, WORK/verification, `.work`, SDK·Gradle/cache/build, 실제 입력 JSON, 키·인증서·계정·개인 절대 경로는 공개 소스 ZIP에 넣지 않습니다. 검증 보고서는 원본 프로젝트의 참조 자료이며 ZIP 동봉을 전제하지 않습니다.

현재 identity는 임시 `com.wanderinghearth.game`, 표시 이름 `작은 성의 큰 여행`, native 1.0.0/build1입니다. 웹 1.0.0-rc.1과 별도 필드입니다. `webDir='../dist'`, Android `https://localhost`, iOS `capacitor://localhost`, 외부 server URL 없음과 빈 allowNavigation을 유지합니다. origin/ID 변경은 저장 마이그레이션을 따로 검증합니다.

## Android: 최종 sync, unsigned 빌드, 소유자 서명

고정 조합은 Node24.19.0/npm11.17.0, JDK21, SDK min24/compile·target36, Build Tools36.0.0, AGP8.13.0, Gradle8.14.3-all입니다. Capacitor core/CLI/android/ios8.5.3, App8.1.2/Preferences8.0.1/Haptics8.0.2, noble/hashes2.4.0을 원 lock으로 사용합니다. Gradle distribution SHA는 `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`입니다.

최종 변경을 멈추고 source/dist/native/deps/tool 전체 핀을 채운 로컬 입력으로, `mobile/`에서 다음 형식을 사용합니다. 아래 placeholder는 로컬 값으로 바꾸며 공개 문서/ZIP에 실제 경로·키를 기록하지 않습니다. build 입력의 syncReceipt는 실제 sync 성공 후 같은 payload 영수증을 가리켜야 합니다.

```powershell
$nodeExe = 'OWNER_LOCAL_PINNED_NODE24_EXE'
& $nodeExe scripts/sync.cjs inputs/sync-final.json 'SYNC_INPUT_SHA256' --execute
& $nodeExe scripts/build-android.cjs inputs/android-final.json 'BUILD_INPUT_SHA256' --execute
```

원 debug/release `signingConfig null`을 유지합니다. `unsigned-release`는 assembleRelease/bundleRelease, 별도 `unsigned-debug`는 assembleDebug입니다. 원 스크립트는 소유 isolated 환경·15분 제한과 모든 모듈 Build Tools36 init을 사용합니다. 출력은 `android/app/build/outputs/apk/release/app-release-unsigned.apk`, `android/app/build/outputs/bundle/release/app-release.aab`입니다. APK 서명 부재/16KiB ZIP 정렬/ID·SDK/ZIP·전 payload·14/71, AAB JAR 상태/형식을 별도로 검사합니다. verification metadata 생성만으로 공급망 독립 검증을 주장하지 않습니다.

배포 서명은 소유자 계정·ID·권리 확인 후 별도 private 환경에서 Android Studio **Build > Generate Signed Bundle/APK**로 소유자의 upload key 정책을 적용합니다. unsigned 스크립트를 서명용으로 우회하지 않습니다. AAB에 apksigner를 사용하는 절차는 맞지 않습니다. 키 생성·로그인·서명·업로드는 여기서 실행하지 않았습니다. 상세 명령과 IDE의 동일 init 정책은 [mobile/ANDROID-RELEASE.md](mobile/ANDROID-RELEASE.md)를 따릅니다. [Android 공식 빌드 안내](https://developer.android.com/build/building-cmdline)

## Mac: iOS SPM과 archive

Windows sync는 Swift 컴파일이 아닙니다. Mac용 실제 Node/npm과 Xcode26+를 준비하고 도구 지문을 새로 기록합니다. iOS15+이며 현재 프로젝트는 SPM의 `ios/App/App.xcodeproj`입니다. Windows 실행파일 SHA를 Mac 핀으로 재사용하지 않습니다. [Capacitor iOS 지원](https://capacitorjs.com/docs/ios), [SPM 안내](https://capacitorjs.com/docs/ios/spm)

`mobile/`에서 소유 npm config/cache로 원 lock을 복원한 뒤 로컬 CLI로 sync합니다. 상세 격리 설치 형식은 [mobile/IOS-RELEASE.md](mobile/IOS-RELEASE.md)에 있습니다.

```sh
node ./node_modules/@capacitor/cli/bin/capacitor sync ios
IOS_WORK="$PWD/.work/ios-owner-check"
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

서명하지 않은 archive는 설치/제출용 IPA가 아닙니다. 소유자가 Xcode Signing & Capabilities에 실제 Team/App ID를 설정한 별도 signed archive를 만든 뒤, 공개 ZIP 밖의 private export plist로 다음 형식을 사용합니다.

```sh
xcrun xcodebuild -exportArchive \
  -archivePath /owner/signed/WanderingHearth.xcarchive \
  -exportPath /owner/export/WanderingHearth \
  -exportOptionsPlist /owner/private/export-options.plist
```

Mac resolve·compile/archive/export·서명·실기기·스토어 승인은 미실행입니다. [Apple 배포 절차](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)

## 권리와 게시 상태

개별 자산·패키지 원문 고지는 [LICENSES.md](LICENSES.md), 원본/runtime 보존은 [ASSET_DELIVERY.md](ASSET_DELIVERY.md)를 따릅니다. 현재14개 Meshy 자산은 image-derived12개와 별도 text-derived2개이며 개별 태스크와 권리 차단을 유지합니다. MIT/Apache 전문과 로컬 고지 화면 완성은 Meshy 생성 플랜·참조 이미지·브랜드 권리를 승인하지 않습니다. 모든 출력에 하나의 라이선스를 일괄 적용하지 않습니다. 소유자15개 필드와 가격/국가/연령/연락처/도메인/계정·최종 ID는 null입니다. com.wanderinghearth.game은 현재 설정의 provisional ID이며 최종 소유자 ID 승인이 아닙니다.

현재 charge e.1 예약 방향 정렬·CPU 방어 yaw cap 회귀, 마을3풍경과 g의 현재 medium 바퀴 변형 고지는 소스에 반영됐습니다. charge e.2 실제 combined-navigation yaw 급변 재현은 미완료로 부모 항목을 닫지 않습니다. Apex c.2는 실제 지붕 vertex/캐시·회복 수명 기능만 완료됐으며, 연기 가독성은 이전3시각FAIL+4차HOLD를 유지합니다. warm tint source442의 기능·제한 색상 표현은 새 after-only 검수로 승인됐습니다. 이는 원5a91 역사사진과 일치하는 전후쌍이 아니며 기존3시각FAIL+4차HOLD를 재분류하지 않습니다. small/full-plume 가독성과 c.3/parent는OPEN입니다. 최신 gameplay unsigned native 재빌드·정적 출력 검증은 완료됐으며 서명·OS 실행은 미완료입니다. c.1 unsigned APK/AAB는 이 후속 소스를 포함한 최종 앱이 아닙니다. 최신 정상 RAF/AI/실 WebGL·Audio로15판/30보스·엔딩/재로드를 마친 검증은 미완료입니다. 과거49소스 가속 엔진 회귀와 성능 표본은 이력으로만 보존하며 최신 실시간 완주·60fps·물리기기 증거로 재명명하지 않습니다. 서명·계정·Mac/iOS·Android guest/실기기·현재 지속 성능·최종 ZIP/추출 QA도 미완료입니다.

## 현재 생성 기록과 성능 시도

asset-provenance.json의 실제14자산 생성 기록 합계는240크레딧입니다(이미지 기반12개180 + 이후 텍스트 기반2개60). 이번 문서 정리와 warm-tint 변경의 신규 생성 비용은0입니다. 이는 생성 플랜·참조 이미지·배포 권리 승인과 별개입니다.

현재 성능 시도(항목058e29b, report2026-10-18T10-49-15-787Z-79680b8b)는 전체FAIL/measurementValidated:false입니다. GLB9개 ERR_ABORTED가 기록됐고 raw 초원·빙하 threshold는FAIL(화산 rawPASS)이지만 측정 유효성을 통과하지 못했으며 원인은 미확정입니다. 이 수치로 현재60fps 합격을 주장하지 않습니다. 원 실패와 과거 성능 이력은 보존합니다.


## 최신 정상 장기검증 중단 — 원인 미확정

게임 소스는 d3e5a7fd와 같으며 Native2 증거 커밋은6f1a5ae6이며 source69/tests116/전체1013·HP 재질442를 유지합니다. 최종 release/sourceZIP commit을 이 값으로 자동 확정하지 않습니다.

현재 성능 시도GLB abort9, 새 정상 campaign pilot abort9, 별도 독립 CDP 진단 canceled10으로 세 차례 모델 요청 이상을 기록해 최신 정상 장기검증을 중단했습니다. 정상15판 최신 완료는0입니다. 독립 CDP 원시기록에서는14요청 모두HTTP200, dataBytes가 Content-Length와 일치했고14개 모델이 mesh를 가진 채 로드됐습니다. 그런데10 canceled 이벤트가 ready보다 먼저 기록됐습니다. 완전한 수신·모델 로드와 요청취소 오류가 함께 존재하며 원인은 미확정입니다. 이를 게임 정상15판 성공, 브라우저/서버/GLTF 특정 원인 확정, 혹은 오류필터 근거로 바꾸지 않습니다. 성능 시도 전체FAIL/measurementValidated:false와 raw 초원·빙하 thresholdFAIL도 그대로 보존하며60fps 검증은 없습니다.

현재 gameplay 조합의 unsigned Android APK/AAB 빌드와 출력 감사·bundletool 검증을 완료했습니다. 입력742a78c8·빌드영수증351e7aea에 연결되며 source69/tests116/native109/dist91·runtime14/71과 최신 전체1013 PASS(111941.3342ms)를 확인했습니다. APK는81,895,568B/SHA f3c055bf37f928ba77a13ea4069acf03a11235cab80fa7a8fd17a3f1434a5f2b, AAB는80,888,753B/SHA 3ce2538b8a52d0ea94fcaaa0be0575883834c696c3ed930fed5e78f98d84c281입니다. 출력위치는 releases/mobile/source69-gameplay-20261018-unsigned이며 실제 파일과 외부 manifest를 대조합니다. 이는 미서명 산출물 검증이며 OS·설치·Apple compile·권리·스토어 승인이 아닙니다.
## 현재 gameplay unsigned Android 출력

최신 전체1013/1013 PASS, fail0/cancelled0/skipped0/todo0,111941.3342ms입니다. 빌드 입력 SHA742a78c89fa04ac68a63f05ba673afb513e0f2bb0148e09ef55d6129aa5ff49e와 영수증351e7aea3265d6fed5a0b08463f215ef7f8221804fc4fa4c57f94ae6c9c2e4e2에 연결됩니다. 전달 파일은 releases/mobile/source69-gameplay-20261018-unsigned의 app-release-unsigned.apk와 app-release.aab입니다. APK81,895,568B/f3c055bf37f928ba77a13ea4069acf03a11235cab80fa7a8fd17a3f1434a5f2b; AAB80,888,753B/3ce2538b8a52d0ea94fcaaa0be0575883834c696c3ed930fed5e78f98d84c281입니다.

출력 감사 eca31a5d7a43b73aebf7d3034d5982acc860bda5b9767cc65b3dd1aea67dd023는 양쪽91파일/14GLB/71binary·CRC/안전ZIP·NO_DEV·unsigned negative·APK16KiB 정렬·com.wanderinghearth.game/version1.0.0/build1/min24/target36을 검증했습니다. bundletool 검증139a18da4eef58bf30dff66cc27ef297e33c7546c9e278cebc0769ea2dfee4cb도 같은 새 AAB에 연결됩니다. APK는 미서명 예상exit1, manifest 없는 AAB의 정확 unsigned 출력/exit0이며 서명 성공이 아닙니다.

Compiled 원문15개(초기3+XML12)와 정적 semantic 보고서11dfbe1e6bb60403244487781a86fc2cba26b0d29fd854ff7cd28ccab24d45d2에서11 layer160dp/center·cream#FFFFF4DB·자체vector108dp/15paths·launcher theme 연결을 확인했습니다. 이는 API31+ mask·native coldstart·OS 화면이나 iOS compile 증거가 아닙니다. SDK는 현재 metadata5 지문과 원 빌드 guard 범위이며 별도 전체 SDK4/다른 emulator SDK563의 불변 검증을 주장하지 않습니다.

원본 프로젝트의 verification/native-gameplay-final/root-review.json 및 전달 폴더 manifest.json을 대조합니다. QA WORK/verification 원장 자체가 소스ZIP에 동봉된다고 가정하지 않습니다. 정상15판·FPS·OS/실기기·Apple compile·서명·권리·최종 소스ZIP/추출 검증은 여전히 미완료이며 releaseReady=false입니다.

전송 후속: GET Content-Length만 생략한 격리 반사실험도 14개 요청 오류로 실패했습니다. 14개 모델 파싱 성공과 오류 원장을 함께 보존하며 원인은 미확정입니다. verification/model-transport-block/manifest.json을 참고하세요.
