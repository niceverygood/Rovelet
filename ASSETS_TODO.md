# 사운드 자원과 교체 목록

현재 재생 가능한 지역별 배경음 4개(마을/초원/화산/빙하)는 `src/audio.js`의 원본 음표 배열을 Web Audio로 합성한다. 무기 30종 발사/명중은 `src/weapon-audio.js`, 수집 차임은 `src/loot.js`, UI/선체/수리는 `src/game.js`에서 합성한다. 외부 녹음·샘플 파일 의존성은 없다.

명시적인 물리 대포의 양측 실제 명중은 `src/cannon-audio.js`의 attack/body/metal-tail 3층 원본 합성을 사용한다. 거리 감쇠·저역 통과·동시8개(out6/in2) 상한·공유 노이즈 버퍼·볼륨 버스와 숨김/음소거 정리를 갖춘다. 대포 발사와 키 없는 환경/보스 범위 피격의 기존 슬롯은 유지한다. `verification/cannon-offline-audio/`의 WAV는 실제 OfflineAudioContext 검증용 렌더이며 게임이 로드하는 외부 샘플이 아니다. 합성 파형 검증과 실제 스피커/실기기 청감 확인을 구분한다.

로켓·운석·집속탄·지뢰·집속 자탄의 중심 폭발과 화염탄·빙결탄·방패 접촉도 같은 8개 impact 버스를 공유한다. 화염은 낮은 삼각파와 필터 노이즈, 빙결은 높은 파열음과 하강 사인파, 방패는 짧은 공명음을 사용한다. incoming 2개 예약은 대포·화염·빙결·방패가 함께 사용하며, 전체 게임의 UI·BGM·옛 일반 충격음까지 8개로 제한한다는 뜻은 아니다. `verification/contact-offline-audio/`의 Float32/WAV와 `verification/incoming-audio/`는 합성·실제 호출 검증 자료이고 스피커 청감이나 물리 기기 검증은 별도다.

향후 녹음 음원으로 교체할 슬롯:

- bgm.home / bgm.meadow / bgm.volcano / bgm.glacier: 60~120초 자연스러운 반복, 마스터 헤드룸 유지.
- sfx.weapon.{30개 무기 ID}.shot / impact: 현재 합성 프로필에 대응하는 개별 클립.
- sfx.pickup.diamond: 짧은 네 음 차임과 연속 획득 변화.
- sfx.hull.hit / shield / repair / boost / ui.click / victory / defeat.
- sfx.hull.fireball / icebolt / shield.contact: 현재 3층 피격·차단 프로필과 꼬리 수명에 대응하는 개별 클립.

현 버전 합성 음향은 실제 연결된 임시 자원이며 최종 사운드 디자인과 녹음 품질은 별도 개선 대상이다. 교체 시 창작자·라이선스·원본 경로·루프점·음량을 출처 목록에 기록해야 한다. 배경음/효과음/전체 볼륨과 전체 음소거는 동일한 채널 구조를 유지한다. 탭 숨김은 오디오를 중단하며, 진동은 지원 기기에서 사용자 설정을 켰을 때만 발생한다.
