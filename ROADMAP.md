# 상용 v1.0 개발 로드맵

현재 목표 시각: 2026-10-19 00:00 KST(사용자의 10월18일 자정까지 계속 작업 요청). 이전 10월17일 22:00 마감 기록은 이력으로 보존한다. 검증 없이 출시 준비 완료로 표시하지 않는다.
순서: 아래 한 항목씩 구현 → 테스트 작성/전체 실행 → 실제 브라우저 플레이 → 커밋 → PROGRESS 갱신. 동일 원인 3회 실패는 BLOCKERS에 기록하고 다음 항목으로 이동한다.

## M1 성과 적의 이동감
- [x] M1.1 기존 Meshy 에셋/바퀴 구조를 유지하면서 적에 가속·감속·제한된 회전·접지 모션 적용. 완료: 적이 목표를 따라 갑자기 방향을 바꾸거나 옆으로 미끄러지지 않으며 정지/추격/돌진을 브라우저에서 확인.
- [x] M1.2 지형 높이·차체 기울기·착지 스프링·먼지·미세 카메라 반응 통합. 완료: 전진/후진/경사/충돌/착지 시 접지와 바퀴 회전이 실제 이동량과 일치하고 움직임 줄이기 지원.
- [x] M1.3 Meshy 추가/재사용 에셋 파이프라인과 이동 리그 검증. 완료: 원본·비용·출처 기록, 필요한 3D 에셋 통합 및 실제 렌더 검증. 인증/생성 한계는 명시.

## M2 무기 30종
- [x] M2.1 무기 30종 데이터와 직사/곡사/관통/연쇄/범위/설치/유도 계열 동작. 완료: 30개 고유 ID와 플레이 동작이 있고 기존 6종 회귀 테스트 통과.
- [x] M2.2 3D 발사체·발사/명중/폭발 모션·사운드 슬롯. 완료: 각 무기의 실루엣/궤적/명중 반응을 도감 시연에서 구별, 음소거/볼륨 반영.
- [x] M2.3 상호작용 가능한 무기 시연 도감. 완료: 30종을 각각 선택·시연·설명 확인 가능, 뒤로 이동 가능.

## M3 지역·스테이지·보스
- [x] M3.1 초원/화산/빙하 3개 지역 × 5판 캠페인 지도와 해금/진행 저장. 완료: 지도에서 판별 정보·완료/잠금 상태 확인, 다음 판으로 정상 연결.
- [x] M3.2 판별 중간보스·최종보스 데이터와 패턴 2~3개/페이즈/전조/체력바. 완료: 15판 모두 보스 조합과 지역 특성이 다르고 패턴 실제 발동 확인.
- [x] M3.3 지역별 지형·조명·장애물·환경 효과. 완료: 초원/화산/빙하를 화면과 전투 기믹으로 구별하며 위험 전조가 읽힘.

## M4 마을 성장 루프
- [x] M4.1 시설→체력/공격/속도/슬롯 능력치 단일 계산. 완료: 강화 전후 비교와 다음 출격 실제 수치가 일치, 취소/중복 결제 방지.
- [x] M4.2 보상·출격·시설 화면에 성장 변화 표시. 완료: 전투→귀환→강화→다음 판 흐름을 신규 저장으로 완료.
- [x] M4.3 주민·배치 기능 지역 지도와 연계, 지역별 미니맵 팔레트 및 배치 회귀 점검. 완료: 저장/불러오기/겹침 방지/무료 이동/강화 위치 유지.

## M5 밸런스
- [x] M5.1 무기/적/보스/시설/보상 수치를 balance 데이터로 통합. 완료: 중복 수치 원천 제거, 스키마 검증.
- [x] M5.2 고정 시드 자동 전투 시뮬레이션과 진행 예산. 완료: 15판 클리어 가능성·실패율·시간 보고서 생성, 목표 캠페인 3~5시간의 가정을 명시하고 실제 플레이와 비교.

- [x] M5.3 [정상 엔진 재검증 통과] 실제 첫 판 난이도 및 자동 조향 교차 검증. 완료: 초반 피격 부담/시작 성장 선택을 조정하고 실제 엔진 무적·강제 피해 없이 첫 판 완료, 모델 차이 기록.

## M6 상용 필수 요소
- [x] M6.1 자동 저장/손상 복구/마이그레이션/일시정지/새로고침 안전성. 완료: 신규/기존/손상 저장 및 빠른 연타 테스트 통과.
- [x] M6.2 첫 실행 튜토리얼·타이틀·크레딧·게임오버·캠페인 엔딩. 완료: 모든 화면에서 정상 복귀, 튜토리얼 재열람 가능.
- [x] M6.3 BGM/효과음 개별 볼륨·진동·오디오 자원 교체 목록. 완료: 실제 재생/음소거/탭 전환 확인, ASSETS_TODO 작성.
- [x] M6.4 한국어/영어 문자열 카탈로그·언어 설정. 완료: UI 하드코딩 제거, 두 언어에서 버튼/줄바꿈/저장 확인.

## M7 품질
- [x] M7.1 오브젝트 풀·파티클 상한·최악 전투 성능 측정. 완료: 측정 환경/프레임시간/부하 기록, 60fps 미달은 숨기지 않고 최적화/제한 적용.
- [x] M7.2 PC/모바일 세로·가로 입력과 레이아웃. 완료: 실제 3개 화면비에서 전투/지도/건설 조작과 버튼 가림 확인.
- [x] M7.3 콘솔 오류/연타/포커스/새로고침 회귀. 완료: 핵심 전체 흐름 콘솔 오류 0, 중복 보상/소프트락 없음.

- [ ] M7.4 [현재환경목표미달/마감제한재측정FAIL] 최대부하 최적화. 완료목표: GTX1060 1440×900 8무기/22적/2보스30초 및1보스24일반적60초에서평균59.5fps이상/p95≤20ms/p99≤33.3ms. 이전59.79~59.95는역사로보존한다. 20:58제한1보스24NPC/8무기1800RAF×3지역은56.28~56.54fps/빈Edge56.04,모든5400렌더·source49/manifest불변·런타임오류0이나현재평균목표FAIL이다. 이는30초제한표본이며2보스/60초/실기기를새로검증하지않았다. M9.4긴프레임원인미확정도남고권리/실기기와함께readyfalse로유지한다.

## M8 출시 패키징
- [x] M8.1 웹 배포 패키지 v1.0·버전·빌드/배포/복구 문서. 완료: 깨끗한 빌드와 패키지 실행 검증. Steam/모바일은 별도 심사/서명 요건을 구분.
- [x] M8.2 STORE 소개문/스크린샷 지점/크레딧/라이선스·출처 점검. 완료: 실제 기능에 맞는 소개와 스크린샷, 미확인 권리는 출시 차단 기록.
- [x] M8.3 출시 체크리스트 전체 회차. 완료: 새 저장 첫 판→엔딩, 모든 화면 뒤로 이동, 모든 버튼 피드백, 배포 디버그 제거를 검증하고 발견 사항을 새 항목으로 추가.

## 출시 후속 점검 큐
모든 항목 후에도 22:00 전에는 반복 플레이·회귀·밸런스·접근성 점검에서 발견한 문제를 이곳에 추가한다. 체크리스트 미완료 상태에서는 출시 준비 완료를 선언하지 않는다.






















- [ ] M8.4 권리 증거: 참조 PNG 생성 영수증/원본 권리 및 Meshy 생성 당시 플랜을 입증한 뒤 상용 게시 허용 여부 확정. 현재 로컬 증거가 없어 외부 확인 필요.

- [x] M8.5 정산 후 동일 프레임의 추가 처치·다이아 처리 차단. 완료: 최종보스 동시피격에서도 결과/저장 처치·금화가 같고 중복 보상 없이 유지.
- [x] M9.1 적의 나무·폐허 우회와 정체 탈출. 완료: 추격 경로의 장애물에 장시간 붙지 않고 바퀴·차체 모션을 유지하며 도착.
- [x] M9.2 기본 대포 출발 난이도/첫 시설 선택 안내. 완료: 강제해금 없이 대포 출발도 첫판 진행 가능하며 새 사용자에게 강화/무기 해금 흐름을 설명.

- [x] M9.3 배포 에셋 용량/첫 로딩 개선. 완료: Meshy 원본을 보존하고 실제 런타임과 같은 텍셀·기하를 쓰는 경량 GLB로 시작 지연/ZIP용량을 줄이며 전후 픽셀·버퍼 동일성 검증.
- [ ] M9.4 [반복 작업 감소 적용, 원인 일부 미확정] 드문 긴프레임 분석. 완료: 장시간 측정의81.8ms 같은 외란/GC/셰이더 프레임 원인을 구분하고 재현되는 부분을 개선. 중앙/실제장애물뒤 추적2회와 무추적GL계측에서 전체 원인을 확정하지 못해 BLOCKERS에 기록하고 M9.5로 이동한다.

- [x] M8.6 이전 밀집 전투 저장 복원. 완료: 구버전25~40적 체크포인트를 손실 없이 재개하고, 이후 새 생성에는24일반적 상한 적용.

- [x] M9.5 첫 화면 시작 병목. 완료: 연결전29.8초 환경대기와앱준비를분리하고 불필요정점/바퀴임시벡터를제거했다. 첫장면을로딩뒤에서준비해실제배포직접연결최신표본의숨김후대기514~948→54~61ms,12모델픽셀차이0/전체205테스트/저장불변확인. 준비전키보드입력은inert로막는다. 정확한외부연결원인과모든기기속도는보증하지않는다.
- [x] M9.6 배포 교체 시 에셋 캐시 갱신. 완료:69개실제배포SHA URL/최종licenseHTML·JSON버전/메타데이터ETag/빌드정합성검사를적용했다. 실제PNG·GLB A캐시→B교체에서무쿼리A디스크적중/새SHA B네트워크본문과반복캐시를확인하고루트·하위경로12종모델/첫전투·동일저장이어하기/오류0/225테스트통과. 원본·4180저장은보존하며ZIP은최종재생성한다.
- [x] M9.7 정지·비활성 화면의 GPU 작업. 완료: 비전투전체tick30Hz/활성매RAF/숨김0회와시간누적·복귀dt0을적용했다. 실제순차비교에서메뉴렌더54.65~56.15→29.87~30.05회/초,주민·효과·체력바·저장/재개·235테스트/배포오류0. 활성3지역각1800RAF/1800렌더도확인했으나54.76~55.06fps/빈페이지55.90으로M7.4현재목표미달은보존한다.
- [x] M9.8 기존 사용자 주소의 실행 서버 갱신. 완료: 임시root식별파일/CIM생성시각·명령대조후정확한레거시PID7884만교체해4180을1.0.0-rc.1/build7d7a1d4236542506으로갱신했다. 새launcher는자식소유listener/버전·build·root/명시loopback환경검사. 241테스트·새ZIP106파일/12모델SHA·4180/추출root/subpath69맵/메타데이터54조건·전투/저장/건설/30종선택/오류0. 기존inapp탭은무조작/자동reload없음.
- [x] M9.9 최신 정상엔진15판·엔딩 회귀. 완료:48e10cf소스/새140→온실90→정상무기·선택·능력/획득시설만으로15판·30보스완료,전투time합188.2133분/5496처치/보상27391−구매5565+140=잔액21966 일치.1420회체크포인트성공/정산15회/엔딩·크레딧·마을·reload/저장불변·오류0/소스SHA불변을확인했다. 가속30Hz엔진회귀로FPS·사람난이도증거와구분한다.
- [x] M9.9a 사거리 밖 적의 자동 저장 거절. 완료: 실제 실패payload의attack=-12.4384를확인하고타이머를0에포화했다. 실제엔진35초대기/복귀공격/저장로드5회귀·전체255테스트와새저장3판완료를확인했다. 15판전체검증은M9.14/M9.13발견사항수정후재개한다.
- [x] M9.10 완주 후 엔딩 재관람. 완료:타이틀/마을/정상정산결과에서엔딩재관람·크레딧·뒤로/ESC복귀,저장실패시엔딩차단·마을연타무저장을구현했다.285전체테스트/한영3화면비6조합·114왕복저장대조/새정상탐험13대조·같은ID이어하기/39이미지/오류0을확인했다. 획득15판fixture의재관람회귀이며새완주·물리모바일·FPS증거와구분한다.
- [x] M9.11 건설 키보드 입력 경계. 완료: 실제취소Enter가75금화구매로이어짐을재현후UIcontrol/편집입력·배치단축키·전투HUD키를분리했다.297테스트/실제PC38·세로6·전투9점검/Enter·Space16활성화/구매1회·무료이동·저장reload·HUD운전2.422m/0.196m·오류0. CtrlR키기본처리미차단과명시reload는별도검증했고headlessnative재탐색미관측attempt1도보존했다.
- [x] M9.12 마을 지도 주민 위치 갱신. 완료:기존.09초UI주기에9개점의변경좌표만반영하고재진입·언어·exit캐시를관리한다.306테스트/한영3화면비6조합1128자연추적샘플·최대오차0.242SVG/162저장대조·36시설왕복/DOM재생성0·focus/scroll불변·오류0. 첫QA설정진입경로오류도attempt1보고서/이미지로보존했다.
- [x] M9.13 장시간 전투 저장. 완료: 시간 계약을정산과같은0≤t<1e7로맞추고다른검사는유지했다.273테스트/실제2시간초과획득저장의정확한HP·능력치·적종류·체력/재저장·2회reload·이어하기/정상S후진0.555m→W+D0.538m·제공성장5회·원시7202.2723초/primary불변·오류0을확인했다. 다음M9.9정상15판재완주.
- [x] M9.14 격자 시작점 고립으로 보스 정체. 완료: 연속 시작점 연결/겹친 경로 여유만 바깥으로 탈출/모서리 시야·격자 변 검사와 캐시를 적용했다. 실제73장애물3방향 브라우저 비교에서 이전120초이동0→현재35.06~35.28m우회·4.5m정지,최대틱0.0175m/최소장애물표면거리1.5166m(몸체1.4m)/바퀴·저장로드/오류0/전체266테스트 통과. 다음M9.13→M9.9재완주→M9.10.
- [x] M9.15 최신 적 우회 적용 후 기본 대포 출발 회귀. 완료:ff22d4f/새140·시설0·대포/기존3시드·동일운전선택정책의정상엔진에서348.033/387.533/336.233초승리·97/113/93처치,보상600/668/546·잔액740/808/686·각1정산/보스2/primary·독립직접감사·49소스SHA불변·오류0·306테스트. 자연획득첫upgrade/grow선택저장6개도보존했다. 가속엔진/사람난이도·FPS를구분하고과거60증거는보존한다. 다음M9.17필수선택/모달보호→M9.16정보배치.
- [x] M9.16 마을 정보 패널 겹침. 완료:제목→능력치를CSS내용흐름으로배치하고짧은세로시설3개를한행으로압축해능력치를유지했다.315테스트/빌드/획득완주전후·한영·6화면비24조합/resize·reload저장불변·source49불변/겹침·클리핑·버튼접근문제0·오류0. 제목/능력치간격최소10px,완주21966금화의320px설정버튼x268~312/44px완전노출. 기존짧은가로능력치숨김은별도기록하고배치·도감·저장은보존한다. 다음M9.18성장알림→M9.19마을HUD수치.
- [x] M9.17 모달 키보드 초점과 필수 성장 선택. 완료: 자연획득성장/정산결과의Tab→HUDpause→resume우회2개를실제재현후liveRun4전환가드·모달HUDinert·Tab/ShiftTab순환·초기GPU준비후입력인계를적용했다.315테스트/빌드/3화면비각20순환·필수선택Enter1회·HUD운전1.418~1.527m·정상Pause/RetreatCancel·설정언어focus/scroll·엔딩·로딩20TabEnter/49소스불변·오류0. 저장형식/수치는보존한다. 다음M9.16정보배치→M9.18성장알림가림.

- [x] M9.18 성장 선택 화면의 알림 가림. 완료: 자연획득49.9초성장재개의단순복귀안내만생략하고성장진입시기존알림을정리했다.319테스트/빌드/한영3화면비6조합에서선택1회·CP/HP/시간·저장불변/새저장실패game079·일반재개game080유지,별도실제90.466초제공성장1→2/game089유지/49소스불변·오류0. quota는임시Storage.prototype 실패fixture로물리디스크실패와구분한다. 다음M9.19마을HUD수치.
- [x] M9.19 마을·타이틀 HUD 내구도 표시와 시설 성장 연동. 완료:UI표시원천만home시설능력치로바꾸고run현재HP/max·lab220·저장정책을유지했다.326테스트/신규7RED3→GREEN7·빌드/한영3화면비6조합home400·lab220/정상75건설740→665·220→250/출격·재개250/획득손상203/220선택재개·native2저장원장·49소스불변·오류0. QA경로와unload console관측실패3기록은보존했고동기QA session으로검증·청소했다. 다음M9.20세로성장카드.

- [x] M9.20 성장 카드 폭·내용 높이와 정렬. 완료: CSS만으로390세로중심36→0px/320세로43px라벨넘침/낮은가로39.77px넘침을해소했다.326전체테스트·빌드/한영4화면비8조합·128nativeTab에서내용클리핑0·header0/제공선택각1회·run/CP/save/storage불변·49소스불변·오류0. PC/가로3열과글꼴·이미지크기를유지했고native버튼접근성공과이전내용넘침을구분한다. 다음순수프로덕션타이틀입력→최종15판/성능/패키지.

- [x] M9.21 배포 타이틀의 설정 클릭. 완료: 실제모바일4조합title-wrap가림을수정해한영PC/세로/가로6조합HUDcenter-hit·정상클릭35~66ms·타이틀6메뉴nativeTab·저장불변/49소스불변/디버그훅·참조버튼0·오류0/326테스트·빌드통과. 다음정산복구후새탐험체크포인트보존(M9.22)→최종15판/성능/패키지.


- [x] M9.22 정산 복구와 새 탐험 체크포인트 소유권. 완료: A정산quota→마을정상persist→B출격/정상CP→nativeReload에서B소실을재현후A의ID일치슬롯만청소했다.334테스트/신규8(1GREEN7RED→8GREEN)·빌드/실제Storage25→23호출원장·Bprimary/backup바이트보존/Continue정확복원(invuln3)/보상추가지급0·source49불변·오류0. 혼합A/B·읽기/삭제/journal실패·2회로드도회귀검증. 임시quota주입은물리디스크와구분한다. 다음M9.23증기포음향→최종15판/성능/패키지.


- [x] M9.23 증기포 고유 발사·피격음. 완료: 실제steam피격key/발사음2호출을연결했다.338테스트/신규4(3RED→GREEN)·빌드/NodeactualWebAudio·한영PC/세로도감자동/수동/음소거/복귀/reload저장불변·49소스불변·오류0. steamshot1·정상50ms피격rate/주파수·gain/noise·ring/발사연기6/피격연기를구분했고cannon전용hitStop신규발생0. QA연기를1개로가정한attempt1실패를보존후수정해retry2통과. 다음동결소스최종15판→성능→출시패키지.


- [x] 최종동결회귀1(M9.9후속): 4c24d6f 소스의새저장15판/30보스/187.891111분·5535처치·27752보상−5565구매+140=22327잔액·15정산/18구매·엔딩/재로드/49소스불변을독립2감사로확인했다. report984f659a…/independentbd4ff5bf…/verification/campaign/2026-10-17T11-53-58-889Z-final-4c24d6f4-seed20261017 참조. 가속엔진증거이며FPS/사람난이도와구분한다.
- [x] M9.24 작은 타이틀 제목 스크롤과 설정 공존. 완료: 제목pointer차단을제거하고타이틀HUD층5/다른화면층2를유지했다.338테스트·빌드/순수배포한영PC·세로4문맥/8휠관측scrollTop0→156~214px/7메뉴Tab·초기/하단HUDcenterhit·엔딩/크레딧/마을/ESC/reload저장바이트불변·compiled36응답일치·오류0·CSS만변경/49소스불변. 이전실패8관측은보존. 다음옛0.1탐험의공격타이머음수호환(M9.25)→최종정상회귀/패키지.

- [x] M9.25 옛0.1 공격 타이머 음수 호환. 완료: 유한−1e7..0만ready0으로정규화하고기타검증/입력원본을보존했다.347전체테스트·신규9(3GREEN6RED→9GREEN)/빌드/원본0.1공개15파일·실제480tick/W→writer의16초·220HP·9적·attack−14.1713저장으로before거절/after정확Continue·PauseSave·reload·2ndContinue·원본프로필/backup불변·source49불변·오류0을확인했다. 접지Y불변을가정한QA실패는보존후nativeSave클릭순간pose기준으로해소했다. 사용자4180은무조작. 다음최종정상15판/터치·마감패키지.

- [x] 최종동결회귀2(M9.25 후속): e6a104b 새 저장에서15판/30보스/188.410000분·5544처치·27528보상−5565구매+140=22103잔액·15정산/18구매·엔딩/재로드/49소스불변을확인하고독립전체저장재구성감사를통과했다. verification/campaign/2026-10-17T12-22-04-841Z-final-e6a104b3-seed20261017/report.json 및 independent-audit.json 참조. 가속30Hz엔진회귀로실시간FPS/사람난이도와구분한다.

- [x] 마감 터치 입력 점검: 한영320×568/844×390 4문맥에서native touch 제목156~165px·버튼156~165px·하단156~214px·설정8열기/모달inert·층2/타이틀층5·정상언어설정외전체저장불변·compiled12/소스49불변·오류0·QA키청소통과. verification/release-touch/2026-10-17T12-31-27-557Z-601556a7/report.json. 첫synth합성은touchmove0이어서직접touch대조로구분했고중간48px좌표여백실패도보존후28px로보완했다. 제품무변경이며물리기기통과로확대하지않는다.

- [x] 21:35 최신 패키지 1차 검증: build41c6c0cc597ade4d/347테스트·빌드·web93/실행106안전경로·12모델/출처SHA·개인경로/키/DEV/소스맵제외·alias지문일치. own4187/새추출4188/4189/hearth의54인코딩조건/69자산SHA·12실제GLB·튜토리얼/이동/CP저장·reload·Continue·철수,4187건설배치/회전·지도·30도감선택/오류0. archive-final-2026-10-17T12-34-09-953Z 및 server-release-final-2026-10-17T12-34-43-326Z 보고서 참조. 새추출실행기의NoBrowser·다른cwd에서4180동일listener재사용도확인했고탭/저장은무조작. 21:45 마감 문서 반영 재패키징·새 추출 확인은 별도 진행한다.

- [x] 최종 마감 ZIP:21:42전체347테스트·빌드후최신문서반영web72,416,031B/실행72,457,043B·build41c6c0cc597ade4d를새폴더에서다시검증했다.archive12-42-59/server12-44-58/안전경로12-44-07보고서의106파일·12모델·54인코딩조건·69SHA·3주소튜토리얼/이동/CP저장/재로드/이어하기/철수·건설/지도/도감30선택/오류0.늦은응답body관측실패는원본보존후QA대기경계로해소했고제품/ZIP은불변이다.미해결권리·성능·실기기차단유지.

- [x] M9.26 전경 수목·아치 뒤 큰 성 가시성.21:51실제배포native첫판240초장면에서큰성의상당부분이전경수목/아치에가려짐을확인했다.증거verification/live-first-stage/2026-10-17T12-46-55-782Z-fbf942ae/battle-240s.png.완료기준:해당지형근처의전투에서플레이어몸체/포신/이동방향을읽을수있는가림처리를구현하고충돌·원본Meshy·저장·성능예산을유지해실제재플레이로확인한다.한장면의가시성발견이며이동소프트락/모든기기현상으로확대하지않는다.21:45마감검증구간이므로새렌더링구조를급히추가하지않고미완료품질후속으로보존한다. 2026-10-18 후속 M10.3에서 별도 새12장면/9시각검수·정상플레이·배포를 검증해 제한된 수목/아치 가림 처리를 완료했다. 이전240초사진과 정확히 같은 pose 재현 주장은 하지 않는다.

- [x] 최종 실제시간입력 관측:시설0/기본대포/새저장으로328.295wall초·실제run310.4488초,정상W/A/D·기술·제공성장5선택/220→280HP·중간보스2페이즈/처치·최종보스DOM등장을확인했다.87처치/5:10HP0자연패배→UI+226금화/primary140→366→마을정상복귀·오류0·compiled3/source49불변.관측절차PASS이며승리/사람난이도/FPS/이번실행reload성공증거는아니다.마을저장의backup140→366만바뀌고primary·정산통계는불변임을독립읽기감사했다. verification/live-first-stage/2026-10-17T12-46-55-782Z-fbf942ae/report.json 및9이미지참조.

## M10 · 2026-10-18 전투 표현 고도화

### 09:12 사용자 실플레이 긴급 후속 (순차 진행)
- [x] M10.2c 성장 후 바퀴 일그러짐 교정. 완료 기준: 원 Meshy의 실제 원판/축을 먼저 확인하고 성장한 성의 네 바퀴가 원형을 유지하며 이동 거리와 맞게 구른다. 원본 GLB·UV·PBR·다른 모델·저장 호환을 보존하고 중형 앞뒤6위상·실제 성장/이동·전체 테스트를 통과한다. 완료: 원판 B의 실제 축을 Z에 맞춰 네 평행 축에 배치하고 세 추가 바퀴는 같은 원본의 파생으로 명시했다. 다른 세 비스듬한 원판은 숨긴 source archive로 보존하며 원본 모든 면이 화면에 그대로 남았다고 주장하지 않는다. 목재13덧댐은 중형에서 얇은 테두리로 바꿨다. 최종635검사·빌드·실제6위상 시각 검수 및 선언된 성장 선택 뒤20.414초/46.7698m/163.5296rad·동일 탐험 저장/재로드/재개·철수1회/보상8을 통과했다. verification/medium-parallel-wheels와 medium-parallel-native 참조. 기존14 Meshy/71자산 보존; 자연 성장 획득·15판·청감/FPS/상용Ready 증거는 아니다.
- [x] M10.9a 장애물 접촉 후 조향 탈출. 완료 기준: 정적 장애물 정면에서 속도가 거의0이어도 전진/후진과 좌우 조향을 함께 눌러 방향을 바꾸며 장애물 관통·무입력 자동 회전·프레임률 의존을 막는다. 완료: 실제 정적 보정·요청 방향 진행률로 만든 이전 프레임 marker가 같은 위치/장애물 배열과 일치할 때만 yaw용 하한1.5/response12를 적용한다. 기존 speed/travel/acceleration 식·정적 반경/solver·저장과 일반 주행을 유지한다. 신규11(4PASS/7기능RED→11PASS)·전체646·빌드·실제 같은 초원 나무 stage2 좌우 전후12사진을 통과했다. BEFORE는8wall초 탈출0/2, AFTER는3.210/3.1926wall초 탈출2/2·후진·원형 collider clearance 유지/오류0이다. 별도 actualGame/World CPU18fixture는3stage×30/60/144Hz×좌우를 검증했다. 프로덕션 루트/하위 경로 정상 저장재개·정산도 통과했다. verification/blocked-turn/root-review.json 및 native/deployment 참조. 선언된 pose/growth fixture이며 모든 혼합 장애물·완전 Meshy 정적 hull·실기기/FPS/15판 증거는 아니다.
- [x] M10.9b 성과 적 차체 충돌·충격. 완료 기준: 성장 크기별 살아 있는 차체를 겹침 없이 제한적으로 분리하고 밀집/동일중심/벽 끼임에서 안정적이다. 접촉 반동·짧은 먼지/불꽃·충격음의 반복 상한과 감소동작/음소거를 검증하며 포구는 최종 차체 위치와 일치한다. 완료: 실제 Meshy 몸체 원형/캡슐 hull·접촉 속도 감쇠·조향 보조·같은 프레임 late repair와 충격/파편/음향을 연결했다. 신규43/전체689·빌드·실제3상황/전후18사진·프로덕션 루트/하위 경로 저장/재개/1회 정산을 통과했다. selected head-on 최대 penetration1.9299→1.33e−15m, 큰 보스3.45→9.51e−8m이며 발사 시 실제 최종 main 위치 포구오차0/원14 Meshy·71자산 보존이다. verification/actor-contact/root-review.json과 native/deployment 참조. 고속 CPU 첫 접촉의.347475m 한시 잔여와 수용 불가능 밀집의 residual은 명시하며 완전 animated triangle/continuous collision·모든 배치 무겹침·실기기/FPS/새15판 증거로 확대하지 않는다. 합법 측면 우회를 관통으로 오인한 첫 QA 실패도 보존했다.
- [ ] M10.9c 누적 피해 외형. 완료 기준: 체력 비율별 균열·그을음·심한 손상 연기가 누적 피해를 읽게 하고 회복/성장/재개 때 현재HP에 맞게 복구한다. 공유 원본 재질·형상을 오염시키지 않고 효과 예산/감소동작/정리를 검증한다.
- [x] M10.9c.1 균열·그을음 기반과 수명주기. 실제 Meshy 흰 벽/UV로6패치를 선정해 체력65/35/15%의2/4/6개 표시를 구현했다. 전체711·실제16뷰의성장/회복/재로드·6raw렌더/PBR·원14/71보존을 검증했다. 큰 성의 갈라진 흰 벽은 직접 확인했고 작은 성은 상대적으로 미묘하다. 전체M10.9c는 연기 가독성이 미승인이므로 미완료다. 다음 시설 항목을 끝낸 후 새 표면/차폐 진단으로 연기 가독성을 다시 다룬다.
- [x] M10.9d 시간형 시설 강화. 완료 기준: 강화 비용을 한 번만 차감하고 진행 시간·공사 애니메이션·완료 피드백을 제공하며 완료 때 외형/능력치를 적용한다. 이동/전투/재로드·오프라인 완료·연타·저장 실패·옛 저장 호환을 검증한다. 완료: 레벨별10/14/18/22/26/30초·시설별1/총3공사·공사예약 위치/발판·크레인·총6작업자와190공유파티클상한·감소동작을 연결했다. 실제140→50 온실90단회 차감/진행중level0·기한전 저장재로드·페이지없는 동안 완공level1·기존CP 능력치 유지/철수1회·새출격만 새능력치 및 프로덕션 루트/하위 경로 실제10초공사를 통과했다. 신규29/전체740·빌드/14모델71자산 보존. 첫전체726/14와 기존2test 유지보수의 정확역변환을 보존하며 native blank canvas3은 시각근거에서 제외했다. verification/construction/root-review.json·native/deployment 참조. 물리기기·FPS·청감/권리/최신15판은 별도 후속이다.
- [x] M10.9e 마을 카메라 줌·이동. 완료 기준: 마을의 빈 땅 드래그와 휠/핀치로 지도를 살피고 줌 상한/하한·지도 경계·자연스러운 보간을 유지한다. 건물 클릭·위치 선택·UI·모달·전투 카메라와 입력이 충돌하지 않으며 PC/터치·화면비·마을 재진입을 회귀 및 실제 브라우저에서 검증한다. 기존 저장은 변경하지 않는다. 완료: 줌10..34/기본22·pan반경14·실제휠/드래그/두손가락/3semantic버튼, modal freeze·same-ray건물선택·배치22중앙/취소후이전시점복귀·공사완료시점유지·전투follow원형/같은CP저장재개/철수1회·홈reset을 PC1440x1000/세로390x844/가로844x390에서 통과했다. 신규16/전체756·빌드·compiled두경로의실제공사/카메라/저장불변·14모델71자산 보존. 원3QA오류·각좁은교정계보를 남겼으며 root선택10full+2prod를 검토했다. verification/village-camera/root-review.json·native/deployment 참조. 발견한 위치안내undefined는 다음별도M10.9d.1이며 카메라기능승인을 전체UI출시승인으로 확대하지 않는다.
- [x] M10.9d.1 위치 선택 안내문 호환 교정. 발견: camera 실제PC/세로/가로 placement 사진에 undefined 표시. 완료 기준: 새 공사 validator의 성공/invalid-position/예약부지 code를 기존 한영 성공·경계·겹침 안내로 표시하며 건설가능 판정·좌표·비용·공사·저장은 그대로다. 실제한영배치/경계/겹침과 전체검사·배포를 확인한다. 완료: UI만두치환/정확역변환으로 기존 성공283·경계281·겹침282번역을표시했다. 신규13은3PASS10기능RED→13PASS, 전체769/빌드·compiled한영6실제이동배치/잘못된위치disabled/취소후저장불변·같은탐험정산/공사/카메라두경로를 통과했다. root6사진직접검토/14모델71자산보존; verification/placement-hint/root-review.json 참조. 다음M11앱연결로진행한다.
- [x] M11.1 Android/iOS 출시 경로·환경 조사. 완료 기준: 현재 오프라인 자산·저장·WebGL·터치·앱 수명주기와 SDK/서명 환경을 조사하고 Google/Apple 공식 요구에 맞는 로컬 패키지 및 제출 차단 목록을 정한다.
- [ ] M11.2 Android/iOS 앱 셸·로컬 실행 패키지. 완료 기준: 원 게임 자산을 포함한 앱 프로젝트·재현 가능한 동기화/빌드 스크립트·안전한 앱 전환/오디오/저장을 구현한다. 가능한 실제 빌드를 실행하고 불가능한 서명·Apple 빌드는 명확한 재현 절차와 차단으로 남긴다. Web 배포 경로도 유지한다.
- [x] M11.2a Native 저장 기반. 완료 기준: 기존5키 동기저장/반환/예외/옛CP·보상·공사계약을유지하면서 네이티브보조A/B전체snapshot·SHA검증·복구·marker/await경쟁방어·유효LS우선/degraded·confirmed-empty profile우선을연결한다. 실제원생성/저장함수·신규49회귀와전체검사·web실제저장재개를검증하며 main/UI진입과기기내구성은다음별도항목이다.
- [x] M11.2b AudioContext 숨김/복귀 경합. 완료 기준: 빠른suspend/resume·context교체/재사용·reject에서최신의도로직렬화하고 원음향DSP/볼륨/게임시간·웹동작을유지한다. deferred16·전체·실제브라우저소유AudioContext호출/정리/저장회귀를검증한다.
- [x] M11.2c Native 진입/수명주기/Back/진동. 완료 기준: main에서검증된저장·App상태준비전입력을열지않고 단일숨김소유자/공통Escape/foregroundpause/시간점프0·120ms진동gate·수동CP1회와고정ticket대기/재시도/취소를연결한다. 웹분기·공사·카메라·저장호환을유지하고CPU/실제브라우저Native모의bridge검증을실기기증거와구분한다.
- [x] M11.2d 최종게임Native 프로젝트/실제빌드. 완료 기준: placeholder를현재검증된게임payload71자산/14runtimeGLB로교체하고브랜드아이콘/버전/고정origin/PrivacyInfo·동기화/unsigned Android APK/AAB·Mac용iOS소스/서명절차를제공한다. 실제build결과와미서명/미실행iOS를구분하고원키·GLB·유저4180을보존한다.
- [ ] M11.2e 소유Native 실행검증. 완료 기준: 호스트에서가능한소유Android가상기기만격리ADB로기동해오프라인자산·bridge·저장/재시작·Back·앱전환을검증한다. 실패3회는원문과차단을기록하며물리기기/촉감/청감/60fps/Apple실행으로확대하지않는다.
- [ ] M11.3 모바일 스토어 자료·출시 검증. 완료 기준: 앱 식별자·버전·아이콘/스플래시·한국어/영어 소개·스크린샷 촬영·개인정보/연령/권리 확인 목록·Android/iOS 테스트 절차를 제공한다. 실제 검증과 미검증을 구분하고 계정 없이 제출/승인 완료를 주장하지 않는다.

새 사용자 승인으로 이전 마감을 대체한다. 오늘 자정은 **2026-10-19 00:00 KST / 2026-10-18 15:00 UTC**이며 23:45부터 새 큰 작업 대신 최종 회귀·빌드·ZIP·추출본 실제 플레이·기록을 마무리한다. 기존12개 Meshy 원본, 저장 호환,30무기/15판,시설 능력치 연동을 보존한다. 항목마다 구현→의미 있는 테스트/전체 테스트→격리 브라우저 실제 확인→커밋→PROGRESS 순서를 지킨다. 외부 권리·실기기·성능 미확인 상태를 완료로 바꾸지 않는다.

- [x] M10.1 고지대 탄환 명중 정확성. 완료 기준: 실제 지형 높이1m 이상에서 플레이어/적의 유효 발사체가 XZ명중 범위와 기존 수직 판정에 맞으면 정상 피해·피격 연출을 발생시킨다. 높은Y가 수평거리로 섞이지 않으며 사거리 밖/상공/곡사 상승중/관통·종료 후 불변 회귀와 실제 고지대 전후 QA를 통과한다. 피해·경제·저장 수식은 바꾸지 않는다. 완료:18신규회귀(13GREEN/5RED→18GREEN)·전체365/빌드통과,고도1.41457m양측명중+6대조8조건전후실제렌더·HP·효과·12모델/49소스·저장불변/오류0.23.018초native입력7주포·21전체발사·12피격/5플레이어피격·저장/Continue/철수1회/마을귀환을확인했다. verification/projectile-xz/15-14-16before·15-15-15after 및 projectile-native-smoke/15-18-17 원장참조. 고정충돌fixture와짧은실제플레이를구분한다.
- [x] M10.2 성 증축 시 이동 연속성과 질량감. 완료 기준: 이동 중 증축 선택 뒤 속도·조향·가감속 상태가 이어지고 새 바퀴 리그는 실제 변위로 구른다. 정지/후진/키 해제/저장 재개와 자연 지형 접지를 회귀·실제 플레이로 확인한다. 완료:8신규회귀2GREEN/6RED→8GREEN·전체373/빌드통과. native제공성장선택시4.2→0/재낙하0.18m를before재현후after4.165665→4.165665/24RAF높이변화0·drive/contact값독립복사/새바퀴회전·역주행·저장/reload/동일IDContinue/오류0을확인했다. 진행level3설정fixture1개를명시했고1→2실제입력과2→3/경사지/boost/역주행Node회귀를구분한다. 저장스키마의정지재개와새단계상한은유지한다. verification/growth-motion/2026-10-17T15-22-54-828Z-before-653c8602 및 2026-10-17T15-24-06-250Z-after-653c8602 참조.
- [x] M10.2a 바퀴 분리의 긴 차체 면 혼입 교정. 완료 기준: 중형 성의 바퀴로 분리된 source5718/6502 등 실제 최대1.82~1.92m 삼각형을 회전부에서 배제해 차체에 보존한다. 정상 바퀴 형상을 과도하게 제외하지 않는 전체면 경계 검사를 검증하며 원본12GLB·삼각형총수/순서·UV/normal·공유재질·바퀴수/실제이동회전과성장/저장호환을 보존한다. 위상별 실제렌더/이동·전체회귀로 확인한다. 발견근거: work/wheel-triangle-audit/2026-10-17T15-27-03-265Z/report.json의actual추출역변환오차1.2e-8이하; 사진pixel과정확면ID대응은미확정. 완료:10신규회귀4GREEN/6RED→10GREEN·전체383/빌드·독립22partitionhash일치/53면전부staticbody·포신재편입0·12원본SHA/전체삼각형·UV/normal보존. 중형실제8위상전후2712→2694회전면/몸체+18·전체15185면/UV동일·최대반경비3.223→1.448767·큰돌출감소/별도native성장·W/S회전125.283rad·SaveTitle·오류0. verification/wheel-phase/2026-10-17T15-38-31-286Z-after-13535f98 참조. 남은후륜2원판형상은다음M10.2b로분리한다.
- [x] M10.2b 중형 성 후륜2의 분리 축·원판 형상 교정. 완료 기준: 이전/수정후 모두 headingPI 회전위상에서확인된후륜2의불완전원판·파편형상에대해원본Meshy의실제바퀴면/축을검사하고올바른회전부로분리한다. 중형rear2/3에동일axisX강제의적합성을비교하며원본/UV/normal·긴면경계·회전방향/주행·성장/저장호환을유지하고새8위상/실제입력으로검증한다. 정적그림자/전체바퀴추정만으로완료하지않는다. 진단:rear2Z단독도원판5/12구간으로부족하므로동일Meshyfront1의804면/PBR공유·localZ반사수복을선택하고원래105면은차체로복귀한다. 원본15185면1회+추가파생804면/총16613(624tread포함)을명시적으로검증한다. 완료: 신규6회귀(1GREEN/5RED→6GREEN), 관련22/전체389·빌드통과. 동일helper 실제8위상전후에서 후륜원판 가독성 개선·donorbuffer/PBR공유·원본15185면/UV보존+추가804면을 확인했다. 별도native전진·후진·증축/124.953rad회전·정상SaveTitle/오류0·12원본/runtime SHA보존. 독립CPU는105/53면 전부staticbody/포신0·ordered POS/NORMAL/UV 정확1회를 검증했다. verification/wheel-calibration/15-56-26before·15-57-46after 및 support 독립감사 참조. 원본 바퀴의 불규칙 테두리/모든 위상 완전원형·AABB포함·FPS는 보증하지 않는다.
- [x] M10.3 전경 가림 처리(M9.26). 완료 기준: 수목·아치 뒤 큰 성의 몸체/포신/이동 방향을 읽을 수 있고 인스턴싱·그림자·충돌·원본Meshy·저장과 성능 예산을 유지한다. 가리는 부분만 처리하고 다른 나무 전체를 함께 바꾸지 않는다. 완료: center 깊이/작은 rounded window로 수목·아치·빙하 수목 눈덮개만 부분 표시한다. 실제MSAA4는 부드러운 coverage와 alpha-only 후처리, 미지원은 기존dither를 사용한다. 신규20회귀/전체476·빌드·동일helper BEFORE/FINAL 12장면 및 정상20.115초/51.887m·저장reloadContinue/철수1회·71binary/14원본·runtime/PBR/오류0을 확인했다. 독립48PNG rawGL SHA 일치, 최종24PNG 21,229,920픽셀 alpha255·창밖 RGB-L1 최대2/3초과0, 12장면 draw/triangle·geometry/texture수 불변(프로그램4~9개 증가). 순수prod root/subpath도 정상 저장재개·1정산/DEV0/오류0 통과. verification/scenery-occlusion/visual-review.json 및 scenery-opaque-alpha·scenery-coverage·scenery-occlusion-deployment 참조. 캐시box/center 근사와 혼합negative 한계·추가alpha-clear GPU비용·물리기기/FPS 미검증을 보존하며 모든배경/산/적 가림 해결로 확대하지 않는다.
- [x] M10.4 Meshy 탄환·폭발 파편 에셋 연결. 완료 기준: CLI견적/잔액/실제 사용크레딧·task lineage·원본/배포SHA/미리보기를 기록한 최소kit을 실제 풀링 발사체/파편에 연결한다. 정적인Meshy메시와 코드 기반 시간/물리 애니메이션을 구분하고 새 자산 때문에 기존12모델 검증을 약화하지 않는다.
- [x] M10.4a 첫 Meshy ironshot 포탄. 완료 기준: standard7.1 preview/refine 실제비용·계보·렌더미리보기·원본/배포SHA를 남기고 실제 양측 cannon 발사에서 PBR·포구/논리위치·기존피해·풀/해제/저장을 검증한다. 기존12source/runtimeSHA와13모델/70binary·root/subpath 배포지문을 보존한다. 완료: 실제622면/2KPBR·30credits/2task계보·원본6.38MB→runtime2.79MB·404전체tests/빌드. 원본12source/runtimeSHA/36RGBA보존+새13모델/39이미지·70binary를 검증했다. 실제양측고지대8조건·별도native25초관측player10/enemy13표본·풀재사용·Save/reload/Continue/철수1정산·오류0/경고0. 순수dist root/subpath 각각70HTTP SHA·actual13GLB버전URL·튜토리얼/정상입력/저장/재개/귀환·DEV훅0/오류0을확인했다. verification/meshy-ironshot·ironshot-game·ironshot-deployment 참조. 첫2회배포QA reward DOM범위오검출(1회수정셸인용실패포함)은원장보존후helper만교정했다. 다음M10.4b파편.
- [x] M10.4b Meshy 파편과 물리 폭발. 완료 기준: 최소kit 두번째 단일파편을 생성·검수·출처등록하고 전용 활성상한/풀에 연결해 방향·중력·바운스·연기/충격환 시간축과 양측실제명중을 검증한다. 정적모델과폭발애니메이션을 구분하며 다른무기·피해·음향fallback범위를 유지한다. 완료:실제156면/2KPBR/30credits(kit60)·source8.16MB→runtime3.25MB·424전체/빌드·원래13source/runtimeSHA보존. 독립실물13경로+4상한·actual양측17피해1회·7/9파편·4고정충돌×5시각0/.08/.2/.5/.9·PBR공유/재질독립/소멸active0·native25초assigned105표본/SaveReloadContinueRetreat·오류0경고0. 순수root/subpath각71HTTP SHA/actual14GLB·정상저장재개·1정산/DEV0/오류0. verification/meshy-impact-shard·meshy-shard-game·shard-deployment참조. 일반카메라에서파편은작은보조표현이므로극적인flash/충격환/음향은다음M10.5a에이어간다.
- [ ] M10.5 무기 계열별 극적인 발사·비행·피격·폭발. 완료 기준: 포구 섬광/반동→3D궤적/잔상→재질별파편·충격파·연기/불꽃·짧은hit-stop이 계열 특성과 일치한다. 발사체의 실제3D접촉·곡사·관통·연쇄·범위/설치/유도별로 구별하고 피해와 피드백을 중복 호출하지 않는다.
- [x] M10.5a 실제 대포 명중의 섬광·팽창 충격파. 완료 기준: 양측 실제 cannon hit만 짧은 중심광/잔광/지면 충격파를 생성하고 기존 Meshy 파편·피해·음향·shield/reduced/AoE 경계를 보존한다. 30/60/144Hz 수명·풀 재사용·190상한·배치 UV/alpha를 검증하고 같은 helper의 정상 카메라 전후 시간축·경사지(18,14)·native 전투/저장/재개를 확인한다. 지면 충격파는 지형 접선에 맞추며 정적인 Meshy 파편과 코드 애니메이션을 구분한다. 완료:10신규회귀2GREEN/8RED→10GREEN·focused49/전체434·빌드통과. .085/.22/.28초 중심광/잔광/ground3층과5spark1.7배를strict물리cannon에만연결하고기존7/9Meshy파편·190입장우선/풀재사용100회·source52/14GLB·71binary불변을검증했다. 같은helper SHA8e1b0688…의평지양측+경사18,14 actual17damage/hit1/7시간전후·ground접선/배치alpha·native25초/일반저장reloadContinue/1철수정산·오류0경고0,순수root/subpath각71HTTP SHA/14actualGLB·정상재개·DEV0·오류0통과. verification/cannon-impact-envelope 및 cannon-envelope-deployment참조. normalcamera의.025섬광/.1팽창환/.2경사소멸을직접검수했고추가유료API·원본변경없음. 음향·반동/30계열전체·FPS/청감·상용ready는후속이다.
- [ ] M10.6 성·적의 가속/조향/회피·피격 모션. 완료 기준: 속도와 바퀴·접지·회전·제동·차체의 관성이 맞고 적의 회피/충돌/경직과 공격 전조가 읽힌다. 카메라/체력바 떨림과 무한 밀침을 새로 만들지 않는다.
- [x] M10.6a 성 차체의 가속·회전 기울기 축 분리. 완료 기준: Meshy 성의 고정Y=PI/2에서 기존XYZ의pitch/roll축붕괴를회귀로재현하고별도pitch/roll상태와lean×staticFacing quaternion으로교정한다. 기존3성/성형보스·타워Y0대조/계수·거리bob·기하/바퀴/포구/피해/저장/감소모션을보존하고30/60/144·정상카메라전후·native운전/저장재개를확인한다. 회전합성후Euler를다음damp상태로재사용하지않는다. 완료:11신규0GREEN/11RED→11GREEN·focused77/전체456·빌드통과. 동일helperSHA3098b520… 실제13조건에서3성roll기존오차.038148rad→수정후4.3e−8이하·타워Y0불변, 독립Hamilton raw재계산최대1.4e−17rad를확인했다. 정상native25.077초/55.652m W/D/S/A·선택0·일반SaveTitle/reload동일IDContinue/철수1정산·보상11/최종151gold, 원본14source/runtime·71binary·PBR/저장불변/오류0경고0. 순수prodroot/subpath각71HTTP SHA/14actualGLB·정상저장재개·1정산/DEV0/오류0(report0a4fa818…)통과. verification/body-axis/support·independent-audit 및body-axis-deployment참조. 기존계수의축교정이며진폭확대/모든피격모션·FPS/실기기/상용ready증거와구분한다. 다음M10.3전경가림.
- [x] M10.6b 방향별 지면 기울기 축 교정. 완료 기준: heading-local terrainTilt를 defaultXYZ root에 적용할 때90도에서 나타나는 약5.79도 법선 오차를 actual BEFORE로 재현하고 yaw×localTilt 순서로 교정한다. 회전Y/방향 입력/저장heading·성장·적/보스·바퀴·포구·body lean을 보존하고 여러 경사지/방향/프레임률·정상플레이·배포를 확인한다. 산술후보: work/terrain-axis-followup-20261018.json; 새구현은 M10.3커밋 뒤 시작한다. 완료:3factory root의초기YXZ만변경. 12신규RED→GREEN/focused138/전체488·빌드통과. 동일v2helper32158… genuine12조건전후+독립raw감사e835c80f…에서최대법선오차5.706164°→.003551588°·저장yaw/몸체/바퀴/포구settled행렬불변을확인했다. 정상20.198초/47.039m WDSA·SaveTitle/reload동일ID/HP/time/heading/XYZContinue·철수1/6보상/146gold·오류0경고0, 순수prodroot/subpath71HTTP SHA/14GLB/DEV0/정상저장재개/각1정산·오류0통과(4a6bd20b…). 원154e helper의첫AFTERsignedzero비교FAIL은보존했고교정한32158동일helper로BEFORE부터다시측정했다. 4고정PNG+native화면육안승인; 실제접지근사/발사시점미관측/30계열/성능·권리·실기기한계유지.
- [x] M10.6c 추가무기의 주행 기울기·상하 움직임 동기화. 완료 기준: 실제BEFORE에서model-only drive lean/bob과visualRig형제mount 사이의부착점상대이동을재현한뒤, feedback/접지스쿼시와분리된attachment drive wrapper에같은actor-frame변환을전달한다. 기본포신·추가포신ownaim/recoil/emitter원점·성장/30도감·save를보존하고동일실화면/전체테스트/정상플레이/배포로확인한다. 완료:body-motion/Game2파일의cached lean+bob follower만추가했다. 12신규RED→GREEN/focused159/전체500·빌드, 동일8a9helper8실조건전후/독립e41b98b3…에서장착점최대오차.106231993m→6.29e−15m를확인했다. 일반카메라4PNG육안승인/현재30키registration·동기발사포구·성장/CP단위회귀통과. 정상20.374초/51.524m WDSA·선택0·SaveTitle/reload동일ID·HP/time/heading/XYZContinue·철수1/보상8/148gold·오류0경고0, pureprodroot/subpath각71HTTP SHA/14actualGLB/DEV0·정상저장재개/각1정산통과(886c1fed…). 고정렌더는선언한4무기/비정상slot진행fixture이고20초native에서추가무기획득은관측하지않았다. 전체30탄도/성능/실기기/상용ready와구분한다.
- [ ] M10.7 무기 고유 타격음과 공간 음향. 완료 기준: 금속/목재/마법/얼음/폭발·보호막의 attack/body/tail을 구분하고 거리감·동시음 상한·음량/BGM/SFX/음소거·탭전환을 유지한다. 실제 WebAudio 예약 검증과 스피커 청감/실기기 미검증을 구분한다.
- [x] M10.7a 실제 대포 양측 명중음. 완료 기준: strict physicalShard+cannon의 기존 한 음향 호출을 attack/body/metal tail 3층으로 대체하고 원거리 gain/lowpass·Context별8(out6/in2)상한·공유 noise buffer·멱등 stop/disconnect를 검증한다. 기존50/45ms gate·나머지29종/증기포/발사/BGM을 보존하고 hidden/mastermute/sfx0에서 잔향을 정리한다. 실제 AudioContext 예약/Offline PCM·actual17damage 양측·native설정/저장재개를 점검하고 청감/실기기/FPS 증거와 구분한다. 완료범위:11신규1GREEN10RED→11GREEN·focused43/전체445·빌드. source53/14모델71binary보존·actual6충돌/대조와7설정의원시ledger독립감사e8b16641…에서양측17damage/1feedback/3source·기존fallback2/steam4·shield/invul0/18source ended·disconnect/volume12ms/zero중단·backup을확인했다. 실제Offline48k7종PCM/WAV·cap8peak.364194/quiet비율.2857143/원거리감쇠/무음·stop0,순수prodroot/subpath각71HTTP SHA/14GLB·native입력3초/정상저장reloadContinue/각1철수정산·DEV0/오류0통과. 통합도구3문제는BLOCKERS에기록해재실행을중단했으며원통합report.passed=false/25초음향미완료/actualHiddenfalse를유지한다. 별도완료근거를전체통합PASS로확대하지않고청감/실기기·최신긴플레이는M10.8후속이다. verification/cannon-impact-audio/scoped-audit·cannon-offline-audio·cannon-audio-deployment참조.
- [ ] M10.8 보스 임팩트·품질·새 패키지. 완료 기준: 판별 전조/페이즈/특징의 극적인 연출과 정상15판·30보스·성장/마을/저장/엔딩 회귀를 확인한다. 실제 활성 부하·3화면비·배포디버그 제외·최종ZIP 새추출 root/subpath·버전/지문/출시 체크리스트를 검증하고 미해결 사항은 그대로 남긴다.
- [ ] M10.8a 최신 음향의 긴 정상 플레이·실제 숨김 후속. 완료 기준: 새 소스의 긴 native 전투/음향·저장재개를 작은독립도구로확인하고실제document.hidden전환가능환경에서신규tail중단/복귀를관측한다. M10.7a 통합도구FAIL을덮어쓰지않고headless미관측·물리기기/청감한계를구분한다. 최신15판/성능/마감검증과함께수행한다.

- [x] M10.1b 고급 폭발탄의 단일 폭발 정확성. 완료 기준: AdvancedCombat의동일프레임직격→floor 경로에서primary detonation이중호출 후보를actual shot/update·피해/FX/SFX요청원장으로재현한뒤한발한폭발로교정한다. 7radius키/내부fragment·seedpod상속·다수피해자·관통/도탄/부메랑·지뢰device·cluster후속탄을보존한다. 명시고속/보스fixture와정상플레이증거를구분하고전체검사/실브라우저/배포를거친다. 다음우선순위이며FX확대보다먼저수행한다. 완료:radius직격branch의첫blast전에endpointY를기존heightAt+.05이상으로보정하는한곳만변경했다. 9신규4GREEN/5RED→9GREEN·focused196/전체509·빌드통과. 동일helper723af…actual3조건전후(0c927e40…/4231beaa…)와독립0b626d99…에서sameframe중앙2→1/범위내생존HP926→963, 공중·지면대조1/963·범위밖1000·cleanup0·첫중심.05를확인했다. flatBEFORE중심.04는terrain0보다높아지하였다는증거로말하지않는다. actualAudioSources는양측모두1이며기존gate관측과구분한다. 정상20.060초/52.661m·선택0/4처치6코인·일반Save/reload동일ID·HP/time/yaw/XYZContinue·철수1/보상12/152gold·오류0경고0, pureprodroot/subpath각71HTTP SHA/14actualGLB/DEV0·정상재개/단일정산·오류0통과(c0aed2ec…). 현재radius7키+내부fragment/씨앗radius6·expiry/floor·cluster6/acid장치·관통/도탄/왕복을단위회귀로보존했으며새radius+pierce미래정책/최근접sweep재작성·모든무기시각/청감·15판/FPS/상용ready는범위밖이다.
- [x] M10.5b Meshy 고급 폭발 중심 효과. 완료 기준: 기존impact-shard PBR·풀을재사용해rocket/meteor/clusterbomb/landmine+축소fragment의primary 폭발을구분되는시간·반경·속도·기하로표현한다. 피해자별큰폭발중복을피하고24Meshy/190particles admission·reduced·대포효과/피해·저장을보존한다. 기존procedural3D BEFORE와실제Meshy수/시간대별일반카메라AFTER·전체검사/정상플레이를확인한다. M10.1b뒤한항목으로진행한다. 완료:동일f83037cd 도구 BEFORE01ae5cd9/AFTERc68eb16e actual4경로·12일반20mPNG 및15장직접검수에서중앙Meshy12/8/9/6·자연자탄6·원HP/탄도/통계동일·14PBR156면/71binary·24/190/reset0을확인했다. 신규12회귀3GREEN/9RED→12GREEN·focused43/전체521·빌드통과, 독립434ba79f1aa2 감사49절대envelope표본·source55중정확4변경·원본/기존75tests보존을통과했다. 정상20.018초/49.190m·선택0·일반Save/reload동일ID·HP184/time/yaw/XYZContinue·철수1/보상7/147gold·오류0경고0, pureprodroot/subpath각71HTTP SHA/14actualGLB/DEV0·정상재개/단일정산도통과(4397a89a5008). 새timeScale/opacity/크기는절대값1회이며기존cannon record·7/9파편·3층/음향과피해/경제/저장을보존했다. 상한에서새파편생략·최종보스해당폭발허용/종료후신규0·100reuse를Node로검사했다. 지뢰의근접성뒤일부가림·PCmeadow밖가독성/새음향/반동·최신15판/FPS/청감/상용ready는범위밖이다.

- [x] M10.7b 폭발 무기별 중앙 타격음. 완료 기준: rocket/meteor/clusterbomb/landmine/작은fragment의 attack/body/tail·지속시간·거리감을 구분하고 기존cannon PCM/노드/8voice(out6+in2)·음량/음소거/hidden 정리를 보존한다. 중앙 gate를 피해자와 공유해 cap거절 뒤 기본음 중복을 피한다. 독립Node/실제AudioContext 예약·Offline PCM·정상플레이/저장·배포를 검사하며 청감/실기기 한계를 분리한다. 완료: 5중앙폭발을고유attack/body/tail3층으로연결하고8voice/out6/in2·피해자50msgate·정리/거리감쇠를유지했다. 신규11RED→GREEN/전체532·실AudioContext8조건/설정4·원callback종료·동시상한/20.297초정상입력41.772m·저장reload동일CP/철수1회/보상10·150gold·오류0을확인했다. Offline 새v3의44.1/48k18전·28후조건은전체수치동등성/원노드·시간exact·각rate5wave유일·8혼합peak최대.643897을통과했다. fullbit실패2건은보존하며cross8중3bitexact·fresh8중5bitexact를수치동등성과구분한다. 독립15cab02d 및순수prod root/subpath각71binary/14GLB·DEV0·정상재개/단일정산통과. verification/explosive-audio·explosive-offline-audio·explosive-audio-native·explosive-audio-deployment참조. 스피커청감/실제탭hidden/전체게임clipping/FPS·실기기·상용완료는미확인이다.
- [ ] M10.5c 지역·화면비별 폭발 가독성 후속. 완료 기준: 초원/화산/빙하와PC/세로/가로에서 새중앙FX·피해숫자·성/적·근접지뢰가 읽히는지 실제렌더로 확인하고 발견한 과다밝기/가림만 교정한다. 전체상한·원본PBR·저장과 기존무기효과를 보존한다.
  - [x] M10.5c1 큰 성 근접 지뢰의 바닥 충격파. 완료 기준: 실제36고정fixture/72canvas BEFORE59efec에서 확인된 차체 아래 약한 지뢰 파장을 바닥 layer만 조정한다. landmine groundScale1.8 후보의 실제 .025/.18 노출을 같은0cd도구로 승인하며 중앙광·잔광·alpha/time·파편/원본PBR·피해68/실범위/다른4계열·190/24·저장을 보존한다. 전체검사·실제일반입력/저장재개·프로덕션root/subpath·커밋후기록을 완료한다. ended radius3.6은 alpha0 시점이므로 육안 최대폭으로 주장하지 않는다. 숫자는 BEFORE에서 읽혀 별도 renderOrder 수정은 하지 않는다.
    완료: 바닥층만 groundScale1.8로 확장했다. 신규8(4대조GREEN/4의도RED→8GREEN)·전체569/빌드(index-DWGceTc0) 통과, 동일0cd BEFORE59efec/AFTERfdc9 36쌍·144canvas/독립d5dbc·원55소스중2변경/53불변·기존79test중78불변+1의도교정·14Meshy/PBR/71binary·피해68/범위/190·24/저장 보존. root11원PNG(지뢰.18s 3지역×3화면비9조합+early2)·3overview에서 차체밖 파장 개선만 승인(7a81961f); .025s 차폐와HUD미포함은 유지한다. 정상20.497초/50.231m·Save/reload동일CP·trustedContinue/invuln3·철수1/5보상/145gold·오류경고0, prod315be9bab401 root/subpath 각71HTTP·14GLB·DEV0·동일재개/각단일정산·오류0 통과. 전체M10.5c와c2는 아직미완료이며 FPS/자연stage3지뢰/청감/실기기/최신15판·ZIP을검증했다고말하지않는다.
  - [ ] M10.5c2 실제 HUD와 지역·화면비 조합. 완료 기준: 별도 실제 HUD/적 DOM체력바/무기·기술·미니맵까지 포함한 초원·화산·빙하×PC·세로·가로 화면을 확인하고 발견한 가림/넘침만 교정한다. c1의 canvas-only72장을 전체UI 검수로 확대하지 않으며 정상입력 흐름·저장보존과 에뮬레이션/물리기기 한계를 기록한다.
    - [x] M10.5c2a 동시 피격 숫자 겹침. 완료 기준: 실제9조합/18full 원화면에서 확인한 동일 피해자28/49/37/68의 거의 같은 중심 중첩을 시각전용으로 완화한다. 각 무기 실제피해/소리/시간/경제·190/24·단발/플레이어표시·64텍스처/원PBR/저장을보존하고ID별분리·빠른연타·수명/정리·pool포화·reduced회귀 및 같은실제장면으로승인한다. 1d159 전체FAIL의 QAreadback경고9는별도원본보존/동일픽셀기준외부PNG검증으로교정하며globalFAIL을PASS로바꾸지않는다.
    - [x] M10.5c2b 낮은 가로 화면 피해 숫자 크기. 발견: 같은v4 AFTER의844×390 3지역/6full에서 숫자는 분리되지만 글리프가 작다. 완료 기준: 화면 크기에 따른 제한된 숫자 크기와 분리 간격을 함께 검증하고 PC/세로·단발/플레이어·수명/상한/정리·저장·실피해를 보존한다. c2a승인은분리한정이며전체가독성완료로확대하지않는다.
    - [x] M10.5c2c 피해 숫자와 적 체력바 공존. 발견: c2b의같은전후.18s/3지역가로화면에서첫28표시와own DOM체력바가교차한다. 숫자확대개선만승인했고전체가독성은미완료다. 완료 기준: 숫자·체력바의안정적인공존을수명/이동/빠른연타/가장자리/3화면비에서검증하며바떨림·피해/저장·원PBR·상한을보존한다. 전후quad교차와실제글리프가림을구분하고root실화면검수가필수다.
      완료: 재사용 투명 canvas를 적 체력바 위·주 HUD 아래에 두고 실제 최종 카메라로 그린 뒤에만 원 숫자 Sprite를 숨긴다. 동기 부분 실패는 같은 월드 렌더 전 복구하고 이후 프레임·화면 크기·HUD 재생성에서 같은 canvas를 재사용한다. 신규 15개·전체 613개 검사, 같은 도구의 9화면 조합 전후·독립 감사, 정상 대포 조작 20.302초/50.352m와 동일 탐험 저장·재로드·재개·철수 1회, 프로덕션 루트/하위 경로를 통과했다. 루트는 AFTER 18장·가로 BEFORE 3장·복구 4장·정상 전투 1장을 검토해 체력바 가림 개선만 승인했다. 14 Meshy 모델·71개 자산·피해·음향·시간·저장을 유지하며 2D 색 합성 차이·기존 주 HUD 보스 이름 가림·기기/FPS/청감/권리 한계를 보존한다. verification/damage-number-layer/root-review.json 및 해당 independent-audit 참조.
    - [ ] M10.5c2d 화면 방향 변경 직후 기존 피해 숫자 크기. 발견: c2c 생명주기 실제 PC→844×390 전환에서 이미 떠 있던 숫자는 기존 출생 world scale을 유지해 남은 수명 동안 작아진다. 완료 기준: 전환 전후 살아 있는 숫자의 제한된 화면 크기·분리 간격을 실제 렌더로 확인하고 수명·속도·피해·저장·64캐시·190상한과 fallback을 보존한다. c2c 표시층 승인과 별개이며 물리 모바일 회전 검증은 아니다.

- [x] M10.6d 치명타의 방향성 시각 퇴장. 완료 기준: 일반적의sameframe삭제와최종보스결과뒤정적잔류를실엔진으로재현한뒤,실제Meshy root의짧은visualRig퇴장만추가한다. 논리죽음/HP/처치·드롭·정산/healthbar·살아있는성/적모션·저장형식은유지한다. 최대4개/일반.28초·보스.40초와동작줄이기/초과즉시정리,절대경과시간의방향반동·압축/축소,공유PBR·geometry보존/만료·reset1회정리/최종보스finish전소유권이전을검증한다. 전체테스트·actual일반/최종보스·시각검수·정상플레이/저장·배포로확인한다. 완료: Game+Feedback2파일로실제Meshy root의방향반동·축소퇴장을추가했다. 일반.28초/보스.40초·최대4개, reduced/cap즉시정리/소유권·flash·외부remove/reset1회, 작살/음파/회오리/증기포의fatal후위치튐을render전복원하며live넉백·HP/드롭/정산/CP필터는유지한다. 신규15/전체547·동일1f4 actualBEFOREa2cc→FINAL65fd의ordinary23피해/1loot·final선언17피해/12loot/실정산221·361gold·소유권/expiry/14PBR/71보존·PC6사진승인통과. 원rawPASSa175의.45축소는시각미승인으로보존한뒤.04양수하한/strict p.99≤.05로교정했다. 정상20.301초/53.0549m·7발/3처치·HP213.25·Save/reload동일CP/time/invuln3·철수1회/보상6/146gold·오류0경고0, 독립12f1e4e8·프로덕션빌드/순수prod root/subpath71HTTP·14GLB·DEV0/정상재개·단일정산을확인했다. verification/retirement·retirement-native·retirement-deployment참조. 고정lowHP/최종보스fixture와정상플레이는구분하고다른지역·모바일·FPS·모든보스/rigidbody파괴·권리/상용ready미확인은유지한다.

- [x] M10.7c 화염·빙결 피격과 방패 접촉음. 완료 기준: 적/BossSystem typed fireball·icebolt실제탄환피격을고유attack/body/tail로구분하고방패무피해접촉에도짧은고유음을연결한다. Game+weapon-audio+cannon-audio3파일범위/공유impact8(out6/in2)·기존cannon/5primary/30발사·BGM/untypehull·피해/빙결slow/방패.12gate·hull.045gate·저장/새retire모션을보존한다. cap/partial/resume실패fallback중복0·음량/mute/hidden정리·공유.50s버퍼/명시random0·실AudioContext/Offline수치·정상플레이/전체검사·배포로확인하고청감/실제탭hidden/전체게임clipping한계를구분한다.
  완료: fireball/icebolt/shield 고유3층을공유incoming2에연결하고실패gate를선예약한다. 기존hull의resume-before-gate/catch누락은같은preamble만교정하고원runninggraph를보존했다. 신규14/전체561·빌드통과, 같은4d2helper actual8피격/3설정전후(3b20→085ac)·HP17/ice.8/방패3·0·3·untype2/cannon3/owned정리·오류0을확인했다. Offline44.1/48k18→38행/원18graph exact·전체.8s 수치최대5.59e−9/RMS1.92e−10·3새파형/반복14·cappeak.498/.526<.85·음소거0을독립0ec7로검증했다. 정상20.263초42.629m/11발4처치·HP163·Save/reload동일CP/invuln3·철수1/보상12/152gold, prod299b root/subpath71HTTP·14GLB·DEV0·동일재개/단일정산·오류0. 원cannon전체prefix/5primary/30합성·14원본/PBR/저장을보존하며원78test중77exact+shield기대1개만의도교정했다. 실제청감/숨김탭·전체게임clipping/실기기/FPS/권리·최신ZIP은후속이며다음M10.5c지역·화면비별폭발가독성이다.
- [x] M10.5d 폭발 카메라 반응. 완료 기준: 실제 로켓·운석·집속탄·지뢰의 현재 반응을 먼저 관측하고 무기별 짧은 충격을 primary당 한 번만 적용한다. 거리 감쇠·움직임 줄이기·자탄 제외·기존 .22 상한과 감쇠/정리를 유지하며 피해·음향·hitStop·진행 시간·저장·Meshy/PBR을 바꾸지 않는다. 여러 피해자/반복 폭발의 중복, 실제 전후 카메라와 정상 조작·저장 회귀를 검증한다. 스틸사진을 전체 움직임/청감/60fps 검증으로 확대하지 않는다.
  완료: 로켓·운석·집속탄·지뢰의 단일 주폭발에 실제 플레이어와의 거리로 감쇠하는 카메라 충격을 연결했다. 감소 동작과 자탄은 추가 충격 0, 다중 피해자와 효과 상한에도 한 번만 반응한다. 신규 10회귀(3PASS/7의도RED→10PASS)·전체 598, 같은 도구의 실제 7장면 전후·독립 감사·정상 20.252초/52.43m와 저장·재로드·같은 ID 재개·철수 1회, 프로덕션 루트/하위 경로를 통과했다. source55 중 한 파일과 새 테스트 하나만 바뀌었고 14개 Meshy 모델·71개 자산·피해·음향·시간·저장을 유지했다. verification/explosive-camera-pressure-paired 및 최신 native/deployment 보고서 참조. 사진과 카메라 수치 검증을 주관적 타격감·청감·60fps·전체 HUD 완료로 확대하지 않는다. c2c와 보스 전조·긴 정상 플레이·최신15판·성능·최종ZIP은 계속 진행한다.

- [x] M10.8b 보스 공격 직전 전조 가독성. 완료 기준: 현재 실제 charge/meteorRain의 동일 경고를 발동 직전까지 촬영해 문제를 확인한 뒤 필요한 표시만 바꾼다. 경고 반경·공격 시점·판정·원본 Meshy/PBR·피해·음향·저장과 감소 동작을 보존하고 실제 전후·전체 검사·정상 흐름·배포·커밋/진행 기록으로 마친다. 30개 프로필 전체의 새 패턴/청감/FPS 증거로 확대하지 않는다.
  완료: 기존 3회 점멸을 시작 .35에서 발동 직전 .75 이하로 꾸준히 밝아지는 표시로 바꿨다. 감소 동작 .55 고정·고리 기하/위치·발사체·공격 시점/피해·음향·저장을 유지한다. 신규10(7대조PASS/3의도RED→10PASS)·전체623, 30프로필×30/60/144Hz 공격/발동/정리 회귀, 같은 도구의 실제 PC 2대표 전후와 실제 설정으로 켠 감소 동작 2대표·독립 감사·정상20.509초/52.582m/동일 탐험 재개·철수1/보상17, 프로덕션 루트/하위 경로를 통과했다. 루트는 전후16장·감소2장·정상1장을 검토했다. 원본14 Meshy/71자산은 유지한다. 실제 전체보스 진행·돌진 이동·모바일·청감/FPS/권리/상용Ready를 검증했다고 확대하지 않는다. verification/boss-warning/root-review.json 및 independent-audit 참조.

- [ ] M10.6e 돌진 준비와 예약 방향 일치. 완료 기준: 실제 추적 회전→준비→돌진 전환에서 chargeHeading/몸체 heading/잔여 yawRate/첫 이동을 먼저 관측한다. 발견한 방향 불일치를 순간 회전이나 바퀴·Meshy 재제작 없이 교정하고 일반 추적·접지·바퀴·충돌·슬로우·공격 시간/피해·저장을 보존한다. 실제 경로 변화는 시각 전용이라고 주장하지 않으며 정상 입력·전후·전체 검사·배포·커밋/진행 기록을 완료한다.
  - [ ] M10.6e.1 현재 준비 방향과 제한된 회전 보호. 현재69소스/112테스트의 실제3정책에서 확인된 준비 목표의 예약각 이탈을 교정하고 실제 AFTER에서 준비 목표 일치·돌진각속도≤.18·공격타이머·PBR·저장을 검증한다. cap의 방어식은 과거9tick 및 현재 실제Game/접지/바퀴 CPU16으로 대조하되 현재 BEFORE의 cap 초과를 관측했다고 주장하지 않는다.
  - [ ] M10.6e.2 급격한 navigation 목표 전환 실제 후속. 과거 원관측의 정지플레이어에서combined navigation/avoidance 목표가 .0167초에.38747rad 바뀌고 yaw.41558가 남았던 조건을 현재엔진에서 진단한다. 최신3정책 BEFORE는모두yaw초과미재현이며부모완료·전체보스경고정확성으로확대하지않는다.

- [x] M11.3a 모바일 저장 안내/영어 표시 마무리. 발견: 실제native PC사진에서 pause의1stage/0defeated가붙고,빠른Continue→Cancel뒤이전저장성공toast가남는다. 완료기준: 실제수치/거래·고정ticket·뒤로가기/공사/저장을유지하며영어간격과취소피드백을교정하고 한영PC/모바일배치·전체검사·실제브라우저를확인한다. 기술적인저장안내도사용자의다음행동이명확한문구로검토한다.

- [x] M11.2d 검증: 890전체·실제 Android/iOS sync·Android252task/4m52s unsigned APK81,962,396B/AAB80,929,524B·90payload×2/71binary/14GLB·4SDK검사·공식bundletool validate·compiled2경로 정상 저장재개/공사/카메라·독립결과감사를 통과했다. verification/native-package/root-review.json 참조. 원3서로다른검사도구 FAIL/107개 빌드전소스+3템플릿 보존. 서명/OS/iOS 컴파일/스토어승인 미확인, 후속 UI/Back/splash 뒤 재빌드한다.
- [ ] M11.3b Android 타이틀 Back. 발견: 등록한 native Back listener가 타이틀에서 false를 반환해 기본 처리가 소비된다. 완료 기준: 안전한 Android 타이틀에서만 App.minimizeApp으로 보내고 모달/전투/배치/저장대기·숨김/연타/실패·iOS/웹의 공통 Escape는 유지한다. 전체 검사와 실제 core 모의 bridge를 검증하고 OS 실행과 구별한다.
- [ ] M11.3c 고유 브랜드 시작 화면. 발견: native template splash에 Capacitor 기본 로고가 남는다. 완료 기준: 기존 자체 아이콘의 동일 바이트/형태와 크림색을 Android launch theme·iOS launch storyboard에 연결한다. 모든 qualifier/실효 windowBackground·PNG/XML/전체 검사를 확인하고 재빌드 및 가능한 실제 cold start를 검증한다. iOS/Mac 미실행은 차단으로 남긴다.
- [ ] M11.3d 추가 네이티브 라이브러리 고지. 발견: source mobile/licenses에는 원문8개가 있지만 실제 앱 내 licenses.html에 Drifty/Ionic/Paul Miller의 full MIT3종이 누락됐다. 완료 기준: 원문을 기존 두 고지 문서에 정확히 포함하고 기존 크레딧 경로·번역·Meshy 권리 차단을 유지한다. 전체 검사/실제 배포본 고지 열기/재빌드 native payload 일치를 검증한다. 법적 충분성·모든 전이 의존성·이미지 상용권리 승인으로 확대하지 않는다.

M11.3a 완료: UI두치환·영어공백2개로 Title 저장성공 node만 이탈 즉시 제거하고 일반 경고·재개알림·3초수명은 유지했다. 신규8/기존2DOM mock의조회함수추가만/전체898·build717ms·genuine5문맥 전후19+19사진/known8→0·실제CP1/Cancel5키·같은run·PBR14/71·compiled2경로 저장재개/철수1·10초공사/카메라를 통과했다. 원QA timeout/PASS·2startup FAIL·첫878/20전체를 보존하며 verification/pause-save-toast/root-review.json 참조. 다음M11.3b AndroidTitleBack→M11.3c splash→M11.3d 고지→최신native재빌드/실행.

M11.3b 부분검증: 1runtime hook/신규12/전체910/productionbuild통과. genuineBEFORE4/8·두AFTER4/8의모든기능조건은통과했으나gracefulEdgeclose가동일원인3회FAIL해완료체크를보류한다. verification/native-title-back/root-review.json·BLOCKERS참조. 같은QA재시도중단→M11.3c로이동.
- [ ] M11.3e Android binary 고지. 발견: 실제50 Maven좌표 중46 AAR/JAR(직접8·전이38)의native식별고지가문서에서누락되고8AAR LICENSE가APK/AAB에남지않는다. 완료기준: 설치원문·exact좌표/46binary지문과8동일Apache원문연결을고지에보존하고MIT3/권리차단을유지한다. 원문/전체·최신payload/화면을검수하며법적충분성·모든권리승인으로확대하지않는다.

- [x] M11.3c.1 고유 시작화면 소스·컴파일 매핑. 기존 자체icon을 Android11 XML qualifier/명시windowBackground와iOS3 PNG/storyboard에연결했다. 신규11/전체921, actual양쪽sync/Android252task8m53, sameAPK193ecf/AABc593의15AAPT raw·4SDK payload/unsigned/정렬·manifest, native109/source69/dist90/14·71, compiled2경로20PNG·같은저장재개/철수1/10초공사/카메라·경계안내/오류경고0·152001ms/ownedtermination까지통과했다. root2실사진+소스PNG를검토했다. verification/native-splash/root-review.json 참조.
- [ ] M11.3c.2 Native cold-start/transition. 실제소유Android에서새시작화면→WebView첫프레임/재시작을검증하고 API31mask를확인한다. iOS source검사를Mac compile/기기증거로확대하지않는다. 원parentc완료체크는이후까지보류한다.

- [x] M11.3d.1 full MIT·앱내고지뷰어. 원문3 MIT를두문서에보존하고native같은-origin 1pre를inert textContent로표시했다. token/abort/cache/재시도/공통Back/비활성·닫기와web기존anchor를유지한다. 신규22/전체943·빌드·source5문맥11full사진/오류경고0·bounded정리/compiled고지2HTTP경로·원14/71을검증했다. verification/native-legal-viewer/root-review.json 참조. 원GLBtimeout과readytimeout은FAIL보존/후자의간헐원인미확정이며V4는기존예산그대로첫실제전체PASS다.
- [ ] M11.3d.2 최신Native 고지payload. e Apache/f 개인정보후속반영뒤최종Android재빌드·동일고지본문/앱내진입및가능한OS실행을검증한다. parentd는이항목전까지미완료다.

- [ ] M10.9f 지역별 마을 풍경. 현재 전투의 초원/화산/빙하 15판과 마을 지도 연결은 있으나 실제 마을은 초원 하나다. 완료 기준: 캠페인 1/6/11판 진입 해금에 따라 세 마을 풍경을 선택하고, 같은 시설·주민·위치·공사·경제·저장을 유지한다. 마을 전용 시각 그룹/지면/지도만 바꾸며 전투 환경·장애물 identity·지역 위험·성 능력치를 건드리지 않는다. 배치/모달/native 저장대기 입력을 보호하고 세 화면비·귀환/새출격·PBR·전체 테스트·실제 브라우저로 확인한다. 기존 저장 형식에 지역 선택 필드를 추가하지 않는다.

- [x] M11.3e.1 Android native 고지 문서/진입. 관측50좌표(46binary/4metadata)·8동일Apache LICENSE10175B를두문서에정확추가하고3MIT/기존권리차단을보존했다. 전체951·신규8/집중13·build·5격리문맥11사진·90.5s owned정리·compiled두HTTP본문을통과했다. source69변경0/14·71보존. 원950/1과원test를보존하고엄격suffixSHA검증뒤원553efHTMLhashassert를유지하는test후손만적용했다. verification/android-binary-notices/root-review.json 참조.
- [ ] M11.3e.2 최종Native dependency/고지payload. d.2와함께최신APK/AAB에고지가포함됐는지확인하고46resolvedbinary지문을새build메타데이터와대조한다. parente완료/법적충분성은아직주장하지않는다.

- [x] M11.3f.1 로컬 개인정보 안내/안전진입. 한영초안에실제localStorage/Preferences·로컬합성음향/자산·Android인터넷/OS백업가능성을설명하고web고정anchor/native문서별cache·abort·late응답방어·선택문서Retry를연결했다. 전체962/집중41/build·5격리문맥22full사진/오류경고0·85.031s owned정리·compiledroot/subpath두문서4HTTP본문을검증했다. 원14/71·저장호환을유지하며 verification/native-privacy-viewer/root-review.json 참조.
- [ ] M11.3f.2 운영자/문의처/공개정책 URL·스토어실제선언. 현재모두미확정이며임의로만들지않는다. f.1로법적충분성/백업실행/실기기/스토어승인을주장하지않고최종Nativepayload도d.2/e.2와검증한다.

- [ ] M11.3g 현재 바퀴 변형 고지. 실제 provenance는 image-to-3d12와 text-to-3d2이므로 기존12 분류는 맞다. 다만 licenses의105원면/804donor 설명은 과거 M10.2b 기록이고 현재 M10.2c의 B원판1+파생3 평행바퀴/다른3원판 숨김archive·geometry 재정렬 설명이 필요하다. 완료 기준: 원생성분류/권리차단을 보존하고 현재 변형 범위와 역사 설명을 구분해 고지·관련 exact 회귀·최종 payload를 갱신한다. work/native-asset-notice-current-gap-read-20261018의 실제15185면·912원판/UV/PBR 근거를 따른다.

- [x] M10.6e.1 준비 중 예약 돌진방향. windup의 finite chargeHeading을 실제 목표로 유지하고 charging의 approach 뒤 실제 yawRate를 기존 ±.18로 제한하는 두 식만 교정했다. 원16 기능회귀/집중16·전체978·build, 동일 V4/승인 genuine 전후3정책·각6raw+6full·오류경고0·정상RAF/AI/입력/PBR14·71/owned정리를 검증했다. BEFORE 모두 warm target mismatch, AFTER 모두 예약각 일치이며 양쪽 actual cap초과는 관측되지 않았다. verification/charge-motion-paired/root-review.json 참조.
- [ ] M10.6e.2 급격한 복합 navigation 목표변화 실제 재현. 역사3417의 약23.2rad/s target jump와 actual cap초과는 현재 pair에서 재현되지 않았다. e.1은 CPU yaw보호와 현재 warm 예약각만 완료하며 parent M10.6e·완전 차체정렬/모든 화면 가독성은 미완료다.

- [x] M10.9c.2 실제 지붕vertex/캐시·회복수명 기능. 동일 maintained114 genuine전후/전체994/집중38/원14·71·cleanup은 PASS. 네번째 시각 HOLD로 actual plume 가독성 승인은 아니다.
- [ ] M10.9c.3 손상연기 대비·실제 가독성. medium215 birth4 가림/0.4흐림·큰성미묘함/wholeplume·parentM10.9c OPEN. 같은 시각 재시도는 중단하고 마을로 이동한다.

- [x] M10.9f 지역 마을 풍경. 기존1/6/11해금의초원·화산·빙하색감/마을랜드마크·지도색·선택버튼을같은시설/주민/공사/배치/경제에연결했다. 전체1007/집중36+28/build·실제3환경9full+9raw/PC정상75비용·10초공사/화산출격·같은CP재개/철수1회·14/71보존을통과했다.
- [x] M10.9f.1 실제가로844x390 HUD겹침교정. 짧은화면의지역선택만한줄3버튼으로줄이고44px를유지했다. sourceUI class1/CSSappend1·전체재검사/같은V3실제3환경/최종9사진을직접검토했다. 전체지역새월드/실기기승인으로확대하지않는다.

- [x] M11.3g.1 현재 medium 바퀴 변형고지/앱내진입. 과거105/804 기록을 지우지 않고 현재 원B912 한 개+명시파생3/숨김원판3·POSITION/NORMAL회전/UV·PBR공유·runtime thinrim을 별도 부록으로 구분했다. 두고지·기존엄격suffix 유지보수/새6·집중19·전체1013/build·실제5문맥11full/오류경고0·원14/71·source69를 검증했다. verification/medium-wheel-notices/root-review.json 참조.
- [ ] M11.3g.2 최신 Native 고지payload. d/e/f/g 최종 문서·변형고지가 새APK/AAB와 실제앱에 포함되는지 재빌드/가능한OS에서 확인한다. 이 source QA로 법적충분성/권리/스토어 승인을 주장하지 않는다.

- [x] M10.9c.3a 손상연기 재질 대비 한정교정: warm dark-grey color 한 표현만 적용. 전체1013/집중38/build·actual6raw+6full/오류경고0/정리·14/71/PBR/회복보존. 작은 성/연기기둥 전체가독성과 parent c/c.3는 계속 OPEN이다.

- [ ] M7.4p 최신 고정 부하의 요청 취소 진단. 실제 3지역 측정은 9개 GLB ERR_ABORTED로 measurementValidated=false이며, 초원·빙하의 원시 수치도 기준에 미달했다. 발생 시각과 단계를 구분해 원인을 검증하고 원래 59.5/20/33.3 기준을 충족하는 측정과 실기기 검증을 별도로 완료한다.

- [x] M11.final1 최신69소스/91웹파일 양플랫폼동기화·최종빌드입력. 전체1013와기존최신실브라우저기능검증조합을고정하고원guard/dependency2274/native109/14runtime71을모두재검사했다. Android/iOS각91복사와3plugin/child0·postSyncAccepted를확인했다.
- [ ] M11.final2 최신 unsigned APK/AAB 실제재빌드·출력감사/bundletool·최종추출ZIP. 준비입력742a78c8...만으로새앱빌드완료라말하지않는다. 정상캠페인검증후14:15UTC부터실행한다.

- 2026-10-18T11:45:10.308Z Native final2: 최신source69/tests116·전체1013 및 dist91/14runtime/71을 포함한 unsigned APK/AAB·4출력감사·bundletool·compiled raw15/11layer160dp를 확인/보존했다. verification/native-gameplay-final/root-review.json 및 releases/mobile/source69-gameplay-20261018-unsigned 참조. releaseReady=false; SDKmetadata5만이며 SDK4/emulator563 전체불변 주장은 하지 않는다. 서명·OS/coldstart·Apple compile·계정/권리·정상15판·FPS는 미완료. 기존 network FAIL/연기 전체가독성HOLD/charge e.2 OPEN 유지.

- [ ] M11.final3 최신 전달문서/웹·실행 ZIP·네이티브 소스 ZIP. 완료 기준: 현재 source69/native109·14원본/runtime·71과 고지4종을 보존해 전체검사·빌드·각 ZIP의 SHA/CRC/새추출을 확인하고 실제 추출 dist의 root/subpath·조작/저장재개/공사/마을카메라를 확인한다. 상용 출시 차단/미서명·정상15판/FPS 미완료는 유지한다.
