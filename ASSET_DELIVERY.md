# Meshy 배포 에셋 검증 — 2026-10-17

2026-10-18 추가: 아래 12종의 기존 검증 기록은 그대로 보존한다. 새 Meshy 7.1 ironshot 1종을 더해 현재 13 GLB, 39 텍스처, 바이너리 URL 70개다. 원본 합계212,822,420B / runtime60,340,772B이며, 신규 포탄은6,376,684→2,789,412B다. 기존12개의 source/runtime SHA와36 RGBA SHA는 고정 회귀 검사에서 동일함을 확인했다. 신규 포탄의4개 non-image buffer도 동일하고3이미지는 같은 runtime축소 결과의 lossless PNG roundtrip을 통과했다. 생성 실제비용은 preview20+refine10=30credits, 프로젝트 전체 기록210credits이며 무료 감사의newCredits0과 구분한다. 생성 계보·미리보기·CPU 감사는 verification/meshy-ironshot/generation, 실제 발사·충돌·저장 검증은 verification/ironshot-game에 기록한다. 최종 새ZIP/15판·성능·권리 확인은 후속이다.

원본 12개 GLB는 `public/models`에 유지하고, 검증한 배포용 GLB는 `runtime-models`에 보관한다. 프로덕션 빌드에서만 배포용 파일을 `dist/models`에 복사한다. 일반 빌드는 브라우저나 Meshy API를 호출하지 않는다.

| 항목 | 원본 방식 | 배포용 방식 |
|---|---:|---:|
| 모델 12개 합계 | 206,445,736 bytes | 57,551,360 bytes |
| 기하 버퍼 | 원본 | 모든 바이트 동일 |
| 성 3종 색상 텍스처 | 실행 후 2048² 축소 | 같은 2048² 결과를 PNG로 저장 |
| 나머지 색상 텍스처 | 실행 후 1024² 축소 | 같은 1024² 결과를 PNG로 저장 |
| 노멀·금속/거칠기 | 실행 후 512² 축소 | 같은 512² 결과를 PNG로 저장 |
| 새 세션 로컬 첫 로딩 평균 | 27,096.95ms | 22,751.40ms |

로딩은 GTX1060 6GB/Edge ANGLE D3D11/1440×900, 동일 프로덕션 코드와 HTTP 서버, 방식별 두 개의 새 브라우저 문맥을 번갈아 측정했다. 문서 탐색부터 로딩 UI가 사라진 뒤 두 번째 RAF까지다. 후속M9.5에서 첫HTTP연결전29.8초의 환경지연을 확인했으므로 위27.10→22.75초의 차이 전체를 에셋 개선량으로 귀속하지 않는다. 현재코드·격리직접연결·동일조건으로 원본/경량 각각2회 추가측정한 평균은6.994→1.824초였다(asset-startup-direct-verification.json). 다른앱·셰이더/캐시부하 비통제의 로컬표본이며 모바일·원격배포·항상같은개선율을 보증하지 않는다. STARTUP_REPORT.md에 연결대기와앱준비를 분리했다.

36개 이미지 모두 기존 Canvas 축소 결과와 PNG 재디코드 결과의 RGBA SHA256이 같다. 12개 실제 모델을 같은 카메라·조명으로 그린 WebGL 화면 비교에서도 변경 채널 0, 최대 채널 차이 0, 삼각형 394,090개와 드로콜 107개가 일치했다. `runtime-pixel-verification.json`, `asset-startup-verification.json`, 스크린샷 62에 증거를 보관한다.

빌드 검증기는 원본 SHA, 정책 SHA, 배포 파일 SHA, 모든 비이미지 버퍼, 이미지 연결을 포함한 JSON 메타데이터를 검사한다. 허용하는 변경은 이미지 MIME, 이미지 버퍼 길이, 버퍼 오프셋·전체 길이다. JSON의 -0 경계값은 0으로 정규화하지만 실제 float 기하 바이트는 그대로 검사한다. 정책 파일은 Git 체크아웃에서 LF를 유지한다. 오래되거나 불완전한 캐시는 빌드를 실패시킨다. 출력은 프로젝트의 실제 `dist` 폴더만 허용한다.

새 웹 ZIP은 72,377,896 bytes, 로컬 실행 ZIP은 72,407,171 bytes다. 빌드 ID는 `e3a29200b1c5084d`이며 모델·텍스처를 포함한 배포 콘텐츠 파일을 해시한다. ZIP을 새 폴더에 풀어 `/`와 `/hearth/`에서 타이틀, 튜토리얼, 키보드/모바일 전투, 설정, 귀환, 건설, 마을 지도, 무기 선택을 확인했다. 페이지·콘솔·HTTP 오류 0, 개발 훅과 무드보드 디버그 버튼 0이다. 102개 파일과 12개 배포 모델 해시를 확인했고 자격증명·개인 경로·개발 의존성은 포함하지 않았다.

최신 ZIP 해시는 상위 `Wandering-Hearth-release-manifest.json`을 따른다. 이후 게임 변경이 있으면 ZIP을 다시 생성하고 실제 추출본을 재검증한다. 이 검증은 이미지 원본 권리 확인이나 플랫폼 서명·스토어 심사를 대체하지 않는다.

별도 clean checkout에서 core.autocrlf=true, 오프라인 frozen 설치, 전체192테스트, 프로덕션 빌드, 정책 LF/SHA, 원본12GLB 무변경과 dist/출처 해시를 재확인했다. 복제본 Git 상태도 깨끗하다.

## M9.6 배포 교체와 캐시

프로덕션 번들에 최종 배포 파일 SHA256을 넣어 모델12개·PNG55개·SVG/ICO 아이콘2개, 총69개 URL에 콘텐츠 버전을 붙인다. 모델은 원본이 아닌 실제 runtime GLB SHA를 사용한다. 최종 `asset-versions.json`의 인벤토리/각 파일 바이트와 별도 라이선스 HTML SHA가 빌드 시 계산한 값과 다르면 빌드를 실패시킨다. 개발 서버/Node의 기존 경로와 저장 키는 유지한다.

라이선스 HTML은 최종 출처 JSON SHA를 링크에 포함하고, 게임은 그 최종 HTML SHA로 페이지를 연다. HTML/JSON은 no-cache와 실제 응답 바이트 기반 ETag를 사용한다. 같은 크기·수정시각인 파일 교체와 gzip 응답도 재검증한다. 새 ICO는 기존 SVG를64px로 변환한 것으로, 라이선스/JSON 브라우저의 자동 favicon 요청404를 해소한다. 하위 경로에서도 origin-root 아이콘 요청만 허용한다.

`asset-cache-verification.json`은 캐시를 끄거나 Playwright route를 쓰지 않은 실제 HTTP 검증이다. 같은 origin에서 A의 PNG/대포GLB를 캐시에 저장한 뒤 메타데이터만 바꾼 B로 교체했다. 무쿼리 URL은 디스크 캐시에서 A를 반환했고, 새 SHA URL은 네트워크로 B의 실제 바이트를 받아 반복 요청에서는 디스크 캐시를 사용했다. PNG 디코드 RGBA와 GLB BIN은 동일하다. HTML/JSON의 동일 크기·정확히 같은 mtime 조건도 별도로 검사했다.

실제 배포 `/`와 `/hearth/`의69개 파일 해시,12종 모델 요청·본문, 이미지·favicon·라이선스/JSON을 검증했다. 루트에서는 첫판4쪽튜토리얼→W/D이동→정지/저장→재로드→동일ID·위치로이어하기를 확인했다. 개발훅·콘솔/페이지/HTTP오류0, 전체225테스트/빌드 통과. 스크린샷66 참조. 이 변경 이후 ZIP은 최종 패키징 때 재생성한다.

시험 한계: 동일 문서 URL 재탐색의 브라우저 재검증 동작과8.77MB 성GLB의 캐시 미저장 때문에 첫 두 fixture는 이전 캐시를 재현하지 못했다. 최종 시험은 다른 문서 query와 실제3.45MB 대포GLB로 디스크 적중을 먼저 확인했다.12종 모델 자체는 실제 게임 통합에서 모두 검사했다. 이미 열린 구버전 탭의 전체 리소스 일관성·원격CDN·모든 브라우저를 보증하지 않는다. 직접연결 옵션은 격리QA 프로세스에만 사용하며 사용자4180·시스템설정은 변경하지 않았다.

## M9.8 당시 검증한 로컬 패키지

M9.8 당시 빌드 `7d7a1d4236542506`의 웹 ZIP은72,407,960 bytes,로컬실행 ZIP은72,440,535 bytes다. 앞의M9.3용량/해시는과거검증이며최신SHA256은상위릴리스매니페스트를따른다. 새폴더에풀어106개안전한ZIP경로·12런타임모델/출처SHA·자격증명/개인경로/개발훅/소스맵제외를검사했다.

4180레거시0.1.0서버의실제배포폴더를임시nonce파일로검증하고PID·생성시각·명령을다시대조한뒤같은주소에서현재서버로교체했다. 기존inapp탭과그저장소는읽거나새로고침하지않았다. 새launcher의NoBrowser실행도4180의같은PID를재사용했다. server-restart-verification.json 참조.

현재4180/새추출본루트4185/하위폴더4186/hearth의3서버를각각빈격리브라우저context로검증했다. HTML/JSON54인코딩조건의본문SHA·gzip/br·ETag304·HEAD·캐시정책,69바이너리SHA/12종모델실제요청·라이선스/아이콘,정상첫전투·저장/재로드/이어하기/귀환을확인했다.4180격리context에서는시설배치·회전·마을지도·30종도감선택도확인했다(30종실제발사증거는기존M9.5자료). 콘솔/페이지/HTTP오류0/개발훅0,전체241테스트/프로덕션빌드통과. server-release-verification.json/스크린샷68 참조. 이 M9.8 검증 당시에는 M9.9와 마감 패키지가 후속이었다. 이후48e10cf 소스의 정상15판 회귀는 완료했다. 이후 변경을 포함한 최종 패키지의 새 빌드ID·ZIP크기·SHA256·추출본 검증은 마감 릴리스 매니페스트와 별도 새 검증 기록으로 확인한다.

## 첫 마감 회차 검증과 패키지 상태 — 2026-10-17 21:00 KST

동결 소스4c24d6f의 새15판 정상 엔진 회귀와 독립 원장 감사는 완료했다. 전투시간 합187.8911분/5535처치/15고유 정산·1416체크포인트 성공/보상27752−시설5565+초기140=잔액22327, 엔딩·크레딧·마을·재로드의 전체 저장 문자열과49소스 SHA 불변을 확인했다. [최종 캠페인 보고서](verification/campaign/2026-10-17T11-53-58-889Z-final-4c24d6f4-seed20261017/report.json), [독립 감사](verification/campaign/2026-10-17T11-53-58-889Z-final-4c24d6f4-seed20261017/independent-audit.json)를 참조한다. GPU 렌더를 샘플링한 가속 검증이며 실시간 성능 증거가 아니다.

별도 최신 제한 부하 측정은56.281~56.541fps로 목표 미달이다. 검증 실행PASS와 성능 임계값FAIL을 구분하며, [PERFORMANCE.md](PERFORMANCE.md)의 조건·물리 모바일·권리 차단은 유지한다. 현재 보존된 ZIP/빌드7d7a1d4236542506의 수치와 검증은 위 M9.8 당시 자료다. 이후 M9.9~M9.23·최종 문서가 포함된 새 ZIP은 이 문서 갱신 시점에 아직 생성·추출 검증하지 않았다. 최종 패키지 생성 후 실제 새 매니페스트·SHA·추출본 결과를 추가해야 하며, 과거 ZIP을 최신 소스가 들어 있는 것으로 표시하지 않는다.

## 최신 마감 회차 — 2026-10-17 21:25 KST

e6a104b/전체347테스트와 [새15판 실행 보고서](verification/campaign/2026-10-17T12-22-04-841Z-final-e6a104b3-seed20261017/report.json)·[독립 감사](verification/campaign/2026-10-17T12-22-04-841Z-final-e6a104b3-seed20261017/independent-audit.json)가 통과했다.188.41분 전투/5544처치/15정산·30보스·45플래그/18구매·5565지출/27528보상+초기140−5565=잔액22103, 체크포인트1419성공·실패0,49소스 SHA·엔딩/재로드 전체 저장 불변을 확인했다. 첫4c24d6f 회차는 위 이력으로 보존하며, 이번 결과는 새로운 성능 측정·별도 터치 QA·새 ZIP의 통과 증거가 아니다. 이21:25 시점의 패키징은 후속이었으며 실제 생성·검증 결과는 아래 날짜별 기록을 따른다. 이미지 권리M8.4·56fps 목표 미달·실기기/서명·심사 미확인은 유지한다.

## 첫 최신 패키지 검증 — 2026-10-17 21:35 KST

빌드41c6c0cc597ade4d의 첫 최신 웹/로컬 실행 ZIP을 생성하고 새 폴더에 추출했다. [압축본 감사](archive-final-2026-10-17T12-34-09-953Z-verification.json)에서106개 경로·12런타임 모델/출처 SHA·57,551,360모델 바이트·21텍스트 파일과 자격증명/개인경로/개발훅 제외를 검사해PASS, 민감 파일/키0을 확인했다. 아래 지문은 이 첫 검증 패키지의 이력이며, 이후 마감 패키지의 최신 지문은 상위 Wandering-Hearth-release-manifest.json을 따른다.

| 첫 검증 패키지 | 바이트 | SHA256 |
|---|---:|---|
| 웹 | 72,416,027 | 87f544026a62d0d6e010d4c4422e17281c5416da1e34ca64b5565f01a1b947d9 |
| 로컬 실행 | 72,456,515 | e69d252be0abf0519d3d55655d31a1cb1dd3c6bbc1967e5b0c3a821715d2f2fd |

[실제3서버 점검](server-release-final-2026-10-17T12-34-43-326Z-verification.json)은 부모 소유4187 원본 배포와 새 추출본4188루트/4189의hearth하위경로를 각각 빈 격리 브라우저 문맥에서 실행해PASS였다. HTML/JSON54인코딩조건의본문SHA·gzip/br·ETag304·HEAD·캐시정책,69바이너리 SHA·서버별12GLB 실제 본문·라이선스HTML/JSON·아이콘을 대조했다. 세 문맥 모두4쪽튜토리얼→정상 W/D 전투→정지/저장→실제reload→동일CP ID 이어하기→철수/정산을 완료했고 오류0/개발훅0이었다.

원본4187의 격리 문맥에서만 정비소75금화 건설140→65·위치선택/회전·마을지도3마커와30종 도감 선택도 확인했다. 추출본 두 문맥에서 건설/30종을 다시 실행했다고 확장하지 않는다. 사용자4180 탭/저장소는 접근하지 않았다. 이 검증은 첫 패키지의 한정된 정상 흐름이며 사람 난이도·물리 모바일·권리 확인이나30종 모두의 실제 발사 증거를 대신하지 않는다. 문서 정합성을 반영한21:45 마감 ZIP 재생성·새 추출본 실제 점검은 별도 단계로 남긴다.

추가 원본보존 확인: verification/model-source/2026-10-17T12-36-23-136Z/report.json에서정확한12개public/models 원본206,445,736 bytes의SHA/길이를runtime manifest sourceSha256/sourceBytes와직접대조했고배포57,551,360 bytes·credits source/runtime SHA도모두일치했다. 이는현재파일보존검사이며새pixel/geometry·참조권리/요금제증거가아니다. 새추출NoBrowser 실행기의다른cwd·4180동일listener재사용은verification/launcher/2026-10-17T12-36-24-981Z/report.json,안전한web93/실행106경로·중복0·aliasSHA일치는verification/package-paths/2026-10-17T12-35-18Z/report.json을참조한다. 1차상위매니페스트원문은verification/package-manifests/2026-10-17T12-33-42-767Z/release-manifest.json(SHA056f433bf0fc8014751c2672f1be7ef8e222f545e3fecc492e4ada0886f9fc7e)에보존했다.

## 최종 마감 패키지 — 2026-10-17 21:45 KST 구간
마감검증여유를확보하려고21:42절차를시작했습니다.전체347테스트·빌드후build41c6c0cc597ade4d/builtAt2026-10-17T12:42:37.803Z의최종웹ZIP72,416,031 bytes SHAed6009a65da69b336b3bf2653b383a29c0d97fa91b724f7031bdcaafec753d6b,실행ZIP72,457,043 bytes SHA43db35083e860ea2cf88ad9102007ee29c798732a4e6bebdb761d5c9b21bf871를만들었습니다.상위매니페스트SHA73ad9aca8d6ab7f6b9d74d521e2b88b7ec6aeb948c12eabf3d901ecab8c07bee이며원문은verification/package-manifests/2026-10-17T12-42-37-803Z/release-manifest.json에보존했습니다.실행alias는동일SHA,web93/실행106경로·중복/절대/상위경로0은verification/package-paths/2026-10-17T12-44-07-530Z/report.json을따릅니다.
archive-final-2026-10-17T12-42-59-133Z-verification.json의새추출106파일/12runtime·creditsSHA·민감파일0및server-release-final-2026-10-17T12-44-58-585Z-verification.json의원본own4187/새추출4188root/4189/hearth54메타데이터조건·69자산SHA/각12실제GLB·4튜토리얼/이동/CP저장·reload/Continue/철수·원본문맥건설75/회전·마을지도3시설표식·도감30선택/오류0을통과했습니다.12-43-29첫검증은active문맥의플레이완료후늦은house/smithy/greenhouse3body계측이문맥종료와경합해실패했습니다.원본helperSHAfcecf9b3…/실패보고서보존후visible이미지complete/networkidle→bodyqueue청소를추가한helperSHAed28afea266f72d48cbabeafe1a2f18f7c3bbd63dc29141943dec15d2becc9a6로동일패키지를재검증했습니다.제품코드·최종ZIP바이트는변경하지않았습니다.
실행ZIP의README/STORE/PERFORMANCE/STATUS는터치4문맥/최신캠페인347·15판과원본검증경로안내를포함합니다.이마감문서·QA보고서는ZIP밖원본프로젝트기록이며권리M8.4·현재56fps목표미달·실기기/서명/심사차단으로releaseReady=false를유지합니다.

마감후독립교차확인: verification/final-crosscheck/2026-10-17T12-49-10-897Z/report.json은현재·보존manifest73ad9aca…/실제최종ZIP2개와alias·centraldirectory93/106·로컬69바이너리SHA·src49=e6·3서버원시54조건/각12고유모델을다시대조했다.관측응답은active69회/고유45파일,각추출40회/고유19파일이므로각서버69종전수다운로드로표현하지않는다.최종매니페스트와ZIP은12:42생성후변경하지않았다.실제native추가관측의패배/가시성후속은출시체크리스트및원본진행기록으로별도참조한다.

### 2026-10-18 ironshot 배포 검증
현재dist를임시loopback root와/hearth/에서직접구동해각70바이너리HTTP본문SHA와브라우저의actual13GLB 버전URL/본문을확인했다. 각새문맥의타이틀/4튜토리얼/nativeW+D3초/일반SaveTitle/reload전체저장동일/동일IDContinue·재저장/정상철수1정산·표시보상=잔액증가/마을귀환·DEV훅0·오류0을통과했다. report verification/ironshot-deployment/2026-10-17T16-16-36-808Z-2d32a2ed/report.json. source50/dist전후해시는같다. 원래4180탭/저장은무접근이며새ZIP/전체15판·FPS·실기기/권리완료증거로확대하지않는다.

### 2026-10-18 두 자산 Meshy kit
신규ironshot622면+impact-shard156면은각preview20/refine10, 실제합60credits이며기존180포함프로젝트기록240credits다. 현재14모델/42텍스처/71binary; 원본220,984,508B→runtime63,595,408B. 파편은8,162,088→3,254,636B/SHA37f506ebc453c0f999ff4abe7cbeb0371d42f75550d5bd67550aed112175cd8b. 원래12source/runtime/36RGBA와첫ironshot배포SHA도불변이다. 전체424테스트·빌드·독립실물파편13경로/상한4조건CPU감사를통과했다. 새로운순수dist root/subpath각71HTTP본문SHA/actual14GLB버전URL·body·4튜토리얼/정상W+D/저장·재로드·동일ID재개/정산1회·보상잔액/마을/DEV훅0·오류0은verification/shard-deployment/2026-10-17T16-30-53-661Z-37a17f5b/report.json에기록한다. 실제효과시간축/정상명중과최종ZIP·전체캠페인·성능은별도증거다.

실제효과검증 report verification/meshy-shard-game/2026-10-17T16-31-52-883Z-37a17f5b/report.json(SHA3adfb924…)의4양측/고지대명중×5시간축·7/9파편·24/190상한·0.9초해제·별도native25초105assigned표본/저장재개귀환·오류0경고0을확인했다. 일반크기와1.6m확대를구분했고파편0.16m는보조표현이며다음타격강화작업을완료했다고주장하지않는다.
