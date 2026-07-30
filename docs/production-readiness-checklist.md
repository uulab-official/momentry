# 모멘트리 프로덕션 완성도·출시 체크리스트

> 점검일: 2026-07-29 22:34 KST
> 기준 앱: `apps/app` / `kr.co.uulab.momentry` / Expo SDK 57 / runtime `1.0.0`

이 문서는 `docs/product-intent.md`의 로컬 우선·계정 없는 개인 기록 범위를 기준으로 기능, 안정성, OTA, 바이너리, 스토어 심사와 출시 후 운영을 한 번에 판정한다.

상태 표기:

- `[x]` 확인 또는 완료
- `[ ]` 실제 기기·콘솔·운영자 결정이 남음
- `범위 밖` 현재 제품 의도에 포함하지 않음

## 1. 제품 범위와 정보 구조

- [x] 로그인 없이 일기·영화·책 기록 시작
- [x] 하단 탭 `일기 / 영화 / 책 / 전체` 유지
- [x] 기록 우선 홈, 소셜 피드·공개 프로필·팔로우 없음
- [x] 영화·책 검색 실패 시 직접 등록 가능
- [x] 기록 본문·별점·사진은 운영 서버로 전송하지 않음
- [x] 계정·클라우드 동기화·원격 분석을 기본값으로 두지 않음
- [x] 제품 카피가 “개인 기록”, “로컬 저장”, “백업 직접 보관” 사실과 일치

## 2. 핵심 기능

- [x] 일기: 날짜·제목·본문·사진 생성
- [x] 영화: 검색 또는 직접 등록·별점·감상
- [x] 책: 검색 또는 직접 등록·별점·독서 노트
- [x] 기록 수정·사진 교체·사진 제거
- [x] 삭제 확인·최근 삭제 30일 보관·복원
- [x] 최신순·오래된순 정렬
- [x] 종류별 검색과 전체 통합 검색
- [x] 제목·본문·저자·연도·날짜 검색
- [x] 상세 화면 메타데이터·본문·별점·사진 재열람
- [x] 검색 API 오류·빈 결과·초기 안내·재시도 상태
- [x] 저장 중 중복 탭 방지와 실패 메시지
- [x] 저장하지 않은 작성·수정 화면 이탈 확인
- [x] 저장 성공 내비게이션은 이탈 확인을 우회하고 상세 화면을 한 번만 표시
- [x] 알림 권한 안내·기기 설정 이동
- [x] 2초 로컬 테스트 알림
- [x] 사용자가 정한 매일 로컬 리마인더 예약·취소
- [x] 저장된 리마인더 상태와 OS 실제 예약 재대조
- [x] 기기 설정과 무관한 라이트 전용 단일 강조색 화면
- [x] 설정·공지·FAQ·약관·개인정보·문의·앱 정보

## 3. 데이터 신뢰성·복구

- [x] SQLite WAL과 kind/date 인덱스
- [x] 제목·본문·날짜·별점 서버/DB 경계 검증
- [x] 날짜 범위 `2000-01-01 ~ 오늘`을 생성·수정·백업 가져오기에서 동일 적용
- [x] 사진을 앱 전용 영구 파일로 복사
- [x] 사진 파일 상한 8MB
- [x] 백업 `momentry.backup` v2 JSON 내보내기와 v1 가져오기 호환
- [x] 사진을 portable data URI로 변환 후 백업
- [x] 30일 보관 기간 안의 최근 삭제 기록·사진도 함께 백업
- [x] 백업 파일 100MB·JSON·스키마·버전·필드·ID 중복 검증
- [x] 100MB 초과 내보내기 차단과 공유 후 캐시 임시 파일 정리
- [x] 백업 미리보기 후 사용자 확인 시에만 교체
- [x] 가져오기 실패 시 기존 기록 유지
- [x] 교체 트랜잭션과 이미지 정리
- [x] Expo SQLite Web의 일반 transaction과 네이티브 exclusive transaction 분기
- [x] 잘못된 파일·큰 파일·미래 날짜 거부
- [x] 앱 삭제·기기 분실 시 복구 한계를 화면/문서에 고지
- [ ] 암호화 백업 — 별도 제품 제안 필요
- [ ] 선택적 병합 가져오기 — 충돌 UX/정책 필요
- [ ] 자동 클라우드 동기화 — 현재 제품 의도 범위 밖

## 4. UX·접근성·성능

- [x] `safeTop + 56pt` 고정 앱바와 inset 갱신 시 높이 안정화
- [x] `64pt + bottomInset` 고정 하단 탭과 홈 인디케이터 영역 분리
- [x] 카드·설정 행의 가로 축·폭·축소 규칙 및 탭 scene FAB의 safe-area 중복 제거
- [x] 선택 탭 재탭 시 목록 상단 이동과 햅틱
- [x] 카드·설정 행·검색·주요 버튼 터치 피드백
- [x] 공통 스프링 프레스 효과와 동작 줄이기 접근성 대응
- [x] 삭제 확인·백업 가져오기·날짜 선택 다이얼로그 공통 진입·퇴장 애니메이션
- [x] 작성·알림·휴지통 주요 액션의 일관된 압축 피드백
- [x] 버튼 role/label/disabled/busy/selected 상태
- [x] 로딩·빈 상태·오류·재시도 레이아웃
- [x] 상세 로딩 shimmer와 stale ID 데이터 방지
- [x] 이미지 목록 렌더링 windowing·Android clipped subviews
- [x] 웹에서 native animation driver 경고 제거
- [x] 키보드가 작성 입력·저장 버튼을 가리지 않음
- [x] 긴 한국어 문구·라이트 전용 기본 화면 확인
- [x] 모달 작성·검색은 닫기 아이콘, 확인·오류는 공통 제품 대화상자 사용
- [x] 시작 진행 화면부터 라이트 외관과 단일 강조색 유지
- [x] 시작 진행률 막대·숫자 동기화와 고정 슬롯 유지
- [x] 공용 사진 뷰어 iOS·Android 1~4배 멀티터치 확대·이동·로딩·오류·세로 드래그 닫기·안전 영역
- [x] 스택 없는 알림·외부 딥링크 화면의 안전한 홈 복귀
- [ ] iOS/Android 실기기 프레임·메모리·사진 스크롤 측정
- [ ] VoiceOver/TalkBack 전체 흐름 수동 확인
- [ ] 자동 E2E 회귀 스위트

## 5. 시작·OTA·네이티브 기준선

- [x] native splash → custom startup gate → OTA 확인 → 앱 진입 순서
- [x] `updates.checkAutomatically = NEVER`
- [x] OTA 실패·오프라인 시 설치된 번들로 fail-open
- [x] production runtime `1.0.0`, channel `production`
- [x] native-change guard가 verified baseline `26072302`와 일치
- [x] JS/TS 변경만 OTA로 분류
- [x] 이번 완성도 개선은 JS/TS·문서만 변경해 OTA 후보로 분류
- [x] production 광고 환경 강제 후 export
- [x] 최신 OTA `08c9cd18-e40d-4472-bb2f-0f77ba05f81c` 확인
- [x] 최신 OTA `bba4c146-fc75-4bdb-9e6c-b43c36397b16` — 대화상자와 작성 흐름 애니메이션 개선
- [x] 최신 OTA `c125a02f-1a16-4c31-bb63-ed99056b2ec9` — 앱바와 하단탭 safe-area 및 가로 정렬 안정화
- [x] 동일 변경의 중복 게시 그룹 `06b05f34-2e28-47c1-b735-45034f2016f5`와 최신 그룹 모두 rollback 아님
- [ ] 네이티브 변경 시 새 바이너리·새 build code 발행
- [ ] 다음 바이너리에서 로컬 알림만 유지한다면 불필요한 iOS `remote-notification` background mode와 plugin background remote option 제거
- [ ] 설치된 App Store/Play 바이너리에서 OTA 적용 실기기 확인

## 6. 빌드·서명·릴리스 자산

- [x] iOS bundle ID `kr.co.uulab.momentry`
- [x] Android package `kr.co.uulab.momentry`
- [x] iOS/Android build `26072302`
- [x] iOS IPA 식별자·버전·Team ID 확인
- [x] Android AAB package·versionCode·versionName 확인
- [x] Android keystore alias `momentry`와 SHA-256 확인
- [x] App Store Connect ID `6793449140` 확인
- [x] Apple 가격 스케줄 USA customer price `0.0` 확인
- [x] Apple 스크린샷 4개 local/remote checksum 일치
- [x] Google Play icon·feature graphic·phone screenshot 4개 remote 일치
- [x] 개인정보·연령등급·심사 연락처·리뷰 노트 준비
- [x] privacy/support/marketing URL 외부 HTTP 200
- [x] 비밀값·JKS·P12·service account가 저장소 추적 대상이 아님
- [x] App Store Connect 일시 503 후 재시도 성공, 상태 직접 재확인

## 7. 자동 게이트 증적

- [x] `npm run verify`
- [x] `npm run preflight:production`
- [x] `npm run ota:check`
- [x] `npm run release:audit`
- [x] `npm run release:verify`
- [x] `npm run release:assets:check`
- [x] `npm run ios:pricing-status`
- [x] `npm run ios:store-status`
- [x] `bundle exec ruby scripts/verify-google-play-remote-assets.rb`
- [x] `git diff --check`

## 8. Apple App Store 상태

- [x] 공개 버전 `1.0.0`
- [x] 상태 `READY_FOR_SALE`
- [x] 공개 build `26072302`
- [x] 175개 territory, base price `0.0`
- [x] 공개 URL HTTP 200 확인
- [x] 진행 중 심사 없음
- [x] 동일 바이너리 중복 재제출하지 않음
- [ ] 다음 네이티브 변경 때만 새 public version/build와 재심사

## 9. Google Play 상태

- [x] production release `1.0.0`
- [x] versionCode `26072302`
- [x] Android Publisher API track 상태 `completed`
- [x] Play package `kr.co.uulab.momentry`
- [x] 공개 URL HTTP 200과 스토어 제목 확인
- [x] 2026-07-29 IARC 라이브 등급 통지 수신
- [x] 모멘트리 거절 메일 없음 — 같은 개발자 계정의 다른 앱 거절과 구분
- [x] 동일 바이너리 중복 업로드하지 않음
- [x] Google 심사·공개 완료 확인

현재 Momentry 자체의 확인된 심사 거절은 없다. 공개 중인 동일 바이너리를 다시 제출하지 않으며, 위 원격 background 설정 정리는 다음 네이티브 릴리스가 실제로 필요할 때 심사 리스크 축소 항목으로 함께 처리한다.

## 9-1. 2026-07-29 회귀 QA

- [x] 320×568 Web에서 새 일기 저장 후 상세 화면 전환
- [x] 저장 직후 작성 이탈 확인 대화상자가 겹치지 않음
- [x] 공통 삭제 확인 대화상자와 처리 중 상태
- [x] 삭제 후 최근 삭제 이동과 복원
- [x] 콘솔 오류 0건 — Expo Notifications의 Web 미지원 안내 1건만 확인
- [x] 사진 선택·저장·공용 뷰어 열기·버튼 닫기·세로 드래그 닫기
- [x] 공통 확인 대화상자 열기·취소·퇴장
- [x] 스택 없는 상세 딥링크의 뒤로 가기 → 홈 대체 경로, 콘솔 오류 0건

## 10. 의도적으로 보류한 항목

- 원격 Expo Push: Momentry 전용 FCM/APNs transport, 토큰 백엔드, 발송 정책 필요
- TMDB 운영 검색: production API key·쿼터·약관 또는 직접 등록 기본값 결정 필요
- 암호화/병합/클라우드 백업: 개인정보·충돌·운영 정책 설계 필요
- 실기기 QA: 사진·알림 권한·오프라인·휴지통·OTA 재진입
- 자동 E2E: 세 플랫폼 기록 흐름 회귀 자동화

## 최종 판정

- 제품 의도 범위 기능: **완료**
- 자동 품질/릴리스 게이트: **완료**
- Apple: **공개 출시 완료**
- Google: **공개 출시 완료**
- 완전한 100% 출시 판정에 남은 것: **실기기 회귀 QA + 운영자 결정 항목**

관련 문서:

- [`product-intent.md`](product-intent.md)
- [`completeness-checklist.md`](completeness-checklist.md)
- [`ota-checklist.md`](ota-checklist.md)
- [QA report](../.gstack/qa-reports/qa-report-localhost-2026-07-26.md)
