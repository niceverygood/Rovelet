# 스토어 소개 — 작은 성의 큰 여행 / Wandering Hearth

게시 전 확인 사항을 포함한 제품 소개입니다. 최종 이름/상표·계정·ID·지원 연락처·가격·등급은 확정하지 않았으며 `releaseReady=false`입니다. 실제 Android/iOS 스토어 판매·서명·실기기 성공을 주장하지 않습니다.

## 한국어 소개

작은 성을 굴려, 큰 여행을 떠나세요.

붉은 지붕의 움직이는 성을 조종하며 초원, 화산, 빙하를 여행하는 생존 액션 게임입니다. 적의 공격을 피하고 무기를 조합해 길을 열어 보세요. 전투에서 모은 금화로 마을을 키우고 다음 여행을 준비합니다.

- 서로 다른 궤적과 효과를 가진 무기 30종과 직접 시연하는 무기 도감.
- 세 지역의 15개 판, 중간 수호자와 최종 보스의 공격 전조·패턴·페이즈.
- 같은 시설·주민·진척을 공유하는 초원·화산·빙하 마을풍경. 기존 캠페인 진척에 따라 지역 선택이 열립니다.
- 정비소·대장간·온실의6단계 성장. 10~30초 공사 중 비계와 작업 주민을 지켜보고, 마을을 확대·이동해 살펴보세요. 완공한 시설은 다음 출격의 능력에 반영됩니다.
- 실제3D 포탄과 파편, 무기별 폭발·타격 표현과 체력에 반응하는 파손 표현. 연기의 시각 가독성은 추가 검수 중입니다.
- 키보드와 화면 터치 조이스틱, 자동 발사, 방어막·수리·가속, 한국어/영어와 개별 음량·움직임 감소 설정.
- 진행 저장과 탐험 재개. 네이티브 빌드의 로컬 Preferences 보조 복구·수명주기 연결을 포함합니다.

조작: W/S 또는 위/아래 이동, A/D 또는 좌/우 조향, Space 가속, 1 방어막, 2 수리, Esc 일시정지. 터치는 조이스틱과 기술 버튼을 사용합니다.

## English copy

Roll a little castle into a great journey.

Guide a red-roofed rolling castle through meadows, volcanic lands and frozen valleys. Steer around attacks, combine weapons and bring home gold to prepare for your next expedition.

- Discover 30 weapons with distinct trajectories and effects, and try them in the interactive collection.
- Travel through 15 stages across three regions and face guardians and final bosses with telegraphed attacks and phase changes.
- Switch between meadow, volcanic and glacier village views as campaign progress unlocks them, sharing the same facilities, residents and progress.
- Develop your garage, smithy and greenhouse through six levels. Upgrades take 10–30 seconds, with scaffolding and working villagers. Zoom and pan around the village; completed upgrades affect your next departure.
- See 3D cannon projectiles and fragments, weapon-specific impacts and health-linked damage effects. Smoke readability is still under visual review.
- Use keyboard or on-screen touch controls with auto-fire, shield, repair and boost. Korean/English text, separate audio volumes and reduced motion are included.
- Save progress and resume an expedition, with a local Preferences backup and lifecycle integration in the native build.

## AI・출처 고지와 자료 선정

프로젝트의 Meshy 기반 3D 모델과 일부 참조 시각 자료 제작에 생성형 AI를 사용했습니다. 바퀴·대포 모션과 게임 내 효과는 엔진에서 구현했습니다. 개별 출처·수정·라이선스는 게임 크레딧과 [LICENSES.md](LICENSES.md)를 따릅니다. 생성 당시 플랜·참조 이미지 권리·브랜드 배포 권리는 별도 확인이 남아 있습니다. 무료 플랜 조건이나 단일 라이선스를 모든 출력에 일괄 적용하지 않습니다.

홍보 이미지는 해당 최종 버전의 실제 실행에서 선정합니다. 무적·강제 HP/무기·고정 적·진단 자세·시간 가속 fixture를 정상 플레이 획득·난이도·플레이타임 증거로 사용하지 않습니다. 현재 기술 SVG/PNG 아이콘 후보를 원 paid image 산출물이나 최종 디자인/권리 승인으로 표시하지 않습니다.

## 내부 게시 전 상태 — 홍보 문구와 구분

source69/Meshy14(이미지12+텍스트2)/71 binary·30무기·15판은 현재 소스 범위입니다. tint ROOT79680b8 항목은 전체1013·집중38 PASS와 실제34.992초/raw6·full6을 확인했고 limitedTintAccepted:true입니다. 이는 tint 표현만의 제한 승인으로 small/full-plume 가독성과 c.3/parent damage는OPEN입니다. 현재 gameplay native 소스109/dist91의 새 unsigned 빌드·출력 검증은 완료됐습니다. d/e/f 로컬 고지 기능은 완료됐지만 최신 최종 native 파일 지도·앱 출력 지문이 아닙니다. c.1 스플래시 중간 unsigned APK 81,881,240B/193ecf4fd63980b341c386ad3e56eb1003d75d030f2dade02b2650a3a49115d0, unsigned AAB 80,874,384B/c593bb25f43e45853542c1e056f75003eb05ca64fdd3978b421f3b58b600dcd1은 원 이력입니다. 이후 d/e/f·charge/apex/지역 마을/g를 포함한 최종 앱 지문이 아닙니다. unsigned negative를 서명 성공으로 해석하지 않으며 compiled resource 연결은 OS cold-start/API31+ mask/iOS 실화면 승인과 별개입니다.

최종 소스 ZIP/추출 검증은 아직 미완료입니다. ZIP가 만들어지면 ZIP 밖의 전달 매니페스트·SHA256 파일에서 ZIP 지문을 확인하고, ZIP 안 NATIVE-SOURCE-MANIFEST.json에서 각 파일의 지문을 확인합니다. 이 문서에 자기 ZIP의 미래 SHA를 넣지 않습니다. 최종 release commit·소유자·서명·OS/실기기·Mac/iOS·정상15판·FPS 승인 미완료는 RELEASE_STATUS.json을 따릅니다.

d.1 native 전체 고지(d52d42e8), e.1 Android binary Apache 전문(7d5b0f4c), f.1 한영 로컬 개인정보 안내(d9a4c41d)는 현재 코드·브라우저 기능 검증을 마쳤습니다. 이는 모의 native 브리지/데스크톱 실제 렌더 및 compiled HTTP 본문 확인이며 OS·스토어 고지의 법적 충분성 증거가 아닙니다. f는 고정 로컬 문서·독립 cache·Retry·늦은 응답 취소·Back/닫기를 제공하지만 운영자·문의처·도메인·공개 privacy URL은 아직 null입니다. 코드에 분석/광고/계정 서버가 없다는 사실만으로 OS backup·플랫폼/호스팅 처리가 없다고 말하지 않습니다. Android allowBackup와 별도 규칙 부재에 따른 시스템 백업·이전 가능성도 로컬 문서에 남깁니다. 데이터 응답·지원·정책 URL·연령 응답은 소유자의 실제 최종 구성 확인 전 확정하지 않습니다.

RELEASE_STATUS.json의 ownerFields 소유자15개 필드는 전부 null입니다. 개발자/법인·담당자·지원 메일/URL·privacy/marketing URL·저작권 소유자·Apple Team/Google 계정·최종 ID·가격·국가·대상·등급 값을 만들지 않습니다. native 표시 이름은 작은 성의 큰 여행, 설정 ID는 provisional com.wanderinghearth.game입니다. 기존 game STORE의 제품명 움직이는 작은 성과 native 표시 이름 차이는 이력으로 보존하며 최종 상표·스토어 이름을 승인하지 않습니다. 한영 소개는 등록 UI에 옮기기 전 실제 필드 제한과 최종 사실을 다시 검토합니다.

정상 RAF·AI·실 WebGL/Audio로 새 저장부터15판/30보스·엔딩/재로드까지 최신 장시간 검증은 미완료입니다. charge e.1·마을3풍경·g 현재 바퀴 변형 고지는 소스에 반영됐습니다. charge e.2 실제 yaw 급변 재현과 Apex c.3 시각 가독성/부모 damage는 열려 있고, source442 tint는 after-only 제한 색상 승인만 받았고 이전시각FAIL/HOLD를 바꾸지 않습니다. 최종 release commit·서명·Mac/iOS·guest/실기기·지속 성능·권리·최종 ZIP/추출 검증도 남아 현재 상용 게시 완료를 주장하지 않습니다. 게임의 15판/30무기 기능 설명은 장시간 실플레이 완료 증거와 구분합니다.

## 내부 기록 추가 — 최종 게시 승인 아님

asset-provenance.json의 실제14자산 생성 기록 합계는240크레딧입니다(이미지 기반12개180 + 이후 텍스트 기반2개60). 이번 문서 정리와 warm-tint 변경의 신규 생성 비용은0입니다. 이는 생성 플랜·참조 이미지·배포 권리 승인과 별개입니다.

현재 성능 시도(항목058e29b, report2026-10-18T10-49-15-787Z-79680b8b)는 전체FAIL/measurementValidated:false입니다. GLB9개 ERR_ABORTED가 기록됐고 raw 초원·빙하 threshold는FAIL(화산 rawPASS)이지만 측정 유효성을 통과하지 못했으며 원인은 미확정입니다. 이 수치로 현재60fps 합격을 주장하지 않습니다. 원 실패와 과거 성능 이력은 보존합니다.

현재 gameplay unsigned 빌드/출력 감사는 완료됐습니다. 최종 소스ZIP·정상15판·OS/서명은 미완료입니다.


## 최신 정상 장기검증 중단 — 원인 미확정

게임 소스는 d3e5a7fd와 같으며 Native2 증거 커밋은6f1a5ae6이며 source69/tests116/전체1013·HP 재질442를 유지합니다. 최종 release/sourceZIP commit을 이 값으로 자동 확정하지 않습니다.

현재 성능 시도GLB abort9, 새 정상 campaign pilot abort9, 별도 독립 CDP 진단 canceled10으로 세 차례 모델 요청 이상을 기록해 최신 정상 장기검증을 중단했습니다. 정상15판 최신 완료는0입니다. 독립 CDP 원시기록에서는14요청 모두HTTP200, dataBytes가 Content-Length와 일치했고14개 모델이 mesh를 가진 채 로드됐습니다. 그런데10 canceled 이벤트가 ready보다 먼저 기록됐습니다. 완전한 수신·모델 로드와 요청취소 오류가 함께 존재하며 원인은 미확정입니다. 이를 게임 정상15판 성공, 브라우저/서버/GLTF 특정 원인 확정, 혹은 오류필터 근거로 바꾸지 않습니다. 성능 시도 전체FAIL/measurementValidated:false와 raw 초원·빙하 thresholdFAIL도 그대로 보존하며60fps 검증은 없습니다.

현재 gameplay 조합의 unsigned Android APK/AAB 빌드와 출력 감사·bundletool 검증을 완료했습니다. 입력742a78c8·빌드영수증351e7aea에 연결되며 source69/tests116/native109/dist91·runtime14/71과 최신 전체1013 PASS(111941.3342ms)를 확인했습니다. APK는81,895,568B/SHA f3c055bf37f928ba77a13ea4069acf03a11235cab80fa7a8fd17a3f1434a5f2b, AAB는80,888,753B/SHA 3ce2538b8a52d0ea94fcaaa0be0575883834c696c3ed930fed5e78f98d84c281입니다. 출력위치는 releases/mobile/source69-gameplay-20261018-unsigned이며 실제 파일과 외부 manifest를 대조합니다. 이는 미서명 산출물 검증이며 OS·설치·Apple compile·권리·스토어 승인이 아닙니다.

전송 후속: GET Content-Length만 생략한 격리 반사실험도 14개 요청 오류로 실패했습니다. 14개 모델 파싱 성공과 오류 원장을 함께 보존하며 원인은 미확정입니다. verification/model-transport-block/manifest.json을 참고하세요.
