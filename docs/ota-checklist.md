# 모멘트리 OTA 체크리스트

모멘트리는 `runtimeVersion: 1.0.0`, EAS 프로젝트 `uulab/momentry`, `production` 채널을 사용한다. 이 문서는 앱 코드 변경을 OTA로 보낼 수 있는지와 실제 배포 전 확인할 항목을 한 곳에서 관리한다.

## 1. 변경 분류

- [ ] 제품 의도와 현재 구현을 대조했다.
- [ ] 변경이 JavaScript/TypeScript, 스타일, 문구 또는 기존 번들 자산만 바꾸는 `ota`인지 확인했다.
- [ ] Expo/RN/native dependency, lockfile, config plugin, 권한, 알림/딥링크/스킴, 아이콘·스플래시, `app.base.json`, `runtimeVersion` 변경이 없음을 확인했다.
- [ ] 위 항목이 하나라도 바뀌면 OTA를 중단하고 영향을 받는 플랫폼의 새 바이너리로 분류했다.

## 2. 로컬 품질 게이트

```bash
cd apps/app
npm run install:ota-baseline
npm run ota:check
```

- [ ] `supabase:check`, `social-auth:check`, 로컬 알림 `push:check`가 통과했다.
- [ ] TypeScript, ESLint, OTA용 Expo Doctor와 native baseline guard가 통과했다.
- [ ] 설치된 스토어 runtime을 대상으로 하는 OTA라면 Doctor의 최신 패치 권고보다 검증된 package/lockfile 기준선을 우선하며, 의존성 업그레이드는 별도 바이너리 작업으로 분리했다.
- [ ] 현재 스토어 기준 lockfile을 재현할 때는 `npm ci` 대신 hash 검증이 포함된 `npm run install:ota-baseline`을 사용했다.
- [ ] `ota:config`가 owner `uulab`, 프로젝트 ID, `production` 채널, runtime을 확인했다.
- [ ] `guard:update`가 네이티브 변경을 차단하지 않았다.
- [ ] `git diff --check`가 통과했다.

## 3. 수동 회귀 시나리오

- [ ] 앱 시작: OTA 서버가 느리거나 오프라인이어도 번들 앱으로 진입한다.
- [ ] 일기/영화/책: 추가, 저장 중 중복 탭 방지, 상세, 수정, 삭제 확인이 동작한다.
- [ ] 날짜: 오늘 이후 날짜와 2000-01-01 이전 날짜가 거부된다.
- [ ] 검색: Open Library/TMDB 실패 시 직접 등록이 계속 가능하고, 연속 검색 결과가 뒤섞이지 않는다.
- [ ] 사진: 선택·제거·저장·앱 재진입을 확인한다.
- [ ] 목록: 탭 전환 후 다른 종류의 기록이 잠깐 보이지 않고, 검색·정렬·재탭 스크롤이 유지된다.
- [ ] 성능: 이미지가 있는 기록을 빠르게 스크롤해도 프레임 끊김·화면 이탈 후 상태 업데이트 경고·중복 로딩이 없다.
- [ ] 통합 검색: `전체 → 모든 기억 검색`에서 일기·영화·책을 제목·본문·저자·날짜로 한 번에 찾고 상세로 이동할 수 있다.
- [ ] 백업: 내보내기 후 가져오기, 잘못된 JSON, 중복 ID, 큰 파일, 기존 기록 보존을 확인한다.
- [ ] 화면: 기기가 다크 모드여도 앱은 라이트 외관과 단일 딥그린 강조색을 유지한다.
- [ ] 알림: 권한 안내, 로컬 테스트 알림, 알림 탭 라우팅을 확인한다. 원격 Expo Push가 연결되지 않았다는 약속과 일치하는지 확인한다.

## 4. OTA 게시 직전

- [ ] 변경을 커밋하고 마지막 production OTA 커밋과 변경 범위를 확인했다.
- [ ] 사용자에게 보이는 변경을 한 문장으로 작성했다.
- [ ] production 환경 변수와 광고 모드가 production인지 확인했다.
- [ ] 다음 명령으로 OTA를 게시한다.

```bash
npm run update:msg -- "사용자에게 보이는 변경 요약"
```

- [ ] EAS 출력에서 owner, project ID, `production` channel, runtime, update group을 기록했다.
- [ ] 배포 직후 새 설치가 아닌 현재 스토어 바이너리에서 업데이트가 적용되는지 확인했다.
- [ ] 오류가 있으면 같은 runtime의 이전 update로 되돌릴 계획을 확인했다. 네이티브 변경은 OTA로 우회하지 않는다.

## 5. 기록할 결과

- 배포 분류: `none` / `ota` / `binary`
- 검증 명령과 결과:
- OTA 메시지:
- EAS update group:
- 대상 runtime/channel:
- 수동 회귀 결과:
- 남은 미비 기능 또는 owner/console blocker:

## 2026-07-26 점검 결과

- 배포 분류: `ota`
- 검증 명령: `npm run verify`, `npm run ota:check`, `npm run release:audit`, `npm run release:verify`
- 결과: 모두 통과
- OTA 메시지: `전체 기능 완성도 점검 및 데이터 안정성 개선`
- EAS update group: `a6cf179a-2ef1-4fd7-abfa-c27309a88894`
- 대상 runtime/channel: `1.0.0` / `production` / iOS·Android
- 수동 회귀 결과: Expo Web 핵심 흐름 통과. 네이티브 사진·오프라인·권한 QA 대기
- 남은 blocker: TMDB 운영 결정, 원격 Expo Push 백엔드/transport, 실기기 QA

## 2026-07-26 추가 개선

- 변경 분류: `ota`
- 수정: 백업 가져오기에서도 생성·수정과 동일하게 미래 날짜를 거부
- 검증: `npm run ota:check`, `git diff --check` 통과
- OTA 메시지: `백업 날짜 검증 및 데이터 안전성 개선`
- EAS update group: `08c9cd18-e40d-4472-bb2f-0f77ba05f81c`
- 대상 runtime/channel: `1.0.0` / `production` / iOS·Android

## 2026-07-27 전체 출시 게이트 재점검

- `npm run release:audit`, `release:verify`, `preflight:production`, `ota:check` 통과
- `npm run release:assets:check` 통과
- `ios:pricing-status`, `ios:store-status`, Google Play remote asset audit 통과
- 외부 marketing/privacy/contact URL HTTP 200 확인
- iOS P12/profile와 Android keystore 검증 통과
- Apple `READY_FOR_SALE`, Google production `IN_REVIEW` 상태를 API로 재확인
- 동일 OTA 변경이 두 update group(`06b05f34-2e28-47c1-b735-45034f2016f5`, `08c9cd18-e40d-4472-bb2f-0f77ba05f81c`)으로 게시되었으나 두 그룹 모두 rollback이 아니며 같은 runtime/platform 코드임

## 2026-07-27 인터랙션 애니메이션 개선

- 변경 분류: `ota`
- 수정: 공통 `AnimatedPressable`로 앱바·설정 행·추가 FAB·검색 액션·검색 결과의 스프링 압축 효과를 통일하고, 동작 줄이기 설정에서는 즉시 전환
- 검증: `npm run verify`, `npm run ota:check`, Expo Web export 통과
- OTA 메시지: `부드러운 인터랙션과 전환 효과 개선`
- EAS update group: `3347e9da-250f-4e36-b871-107e80c56fe8` (iOS `019fa2c2-3470-7512-9c9b-d046d962415b`, Android `019fa2c2-3470-7d49-b9f6-742cbd06b201`)
- 대상 runtime/channel: `1.0.0` / `production` / iOS·Android

## 2026-07-27 다이얼로그·작성 흐름 개선

- 변경 분류: `ota`
- 수정: 공통 `AnimatedDialog`로 삭제 확인·백업 가져오기·날짜 선택을 fade/scale/slide 진입으로 통일하고, 작성·알림·테마·휴지통의 주요 액션에 스프링 피드백 적용
- 검증: `npm run verify`, `npm run ota:check`, Expo Web export 통과
- OTA 메시지: `대화상자와 작성 흐름 애니메이션 개선`
- EAS update group: `bba4c146-fc75-4bdb-9e6c-b43c36397b16` (iOS `019fa2cf-36f8-7322-a2dc-1e1eef340017`, Android `019fa2cf-36f8-7377-b9e1-730394969d73`)
- 대상 runtime/channel: `1.0.0` / `production` / iOS·Android

## 2026-07-29 기능·디자인 표준화 점검

- 변경 분류: `ota` — TypeScript·스타일·문서만 변경, native guard 통과
- 수정: 백업 v2에 최근 삭제·사진 포함, Web SQLite 트랜잭션 호환, 저장 후 내비게이션 경합, 공통 삭제/오류 대화상자, 테마 시작 화면, 작은 화면·안전 영역·접근성 보강
- 검증: `preflight:update`, `guard:update`, `release:verify`, App Store 자산 검사, Google Play 원격 자산 검사, `git diff --check` 통과
- Web 회귀: 320×568에서 생성→상세, 삭제→최근 삭제, 복원과 공통 대화상자 확인. 콘솔 오류 0건
- production 채널의 최신 게시 그룹은 아직 `bba4c146-fc75-4bdb-9e6c-b43c36397b16`
- 새 OTA는 게시하지 않음: 현재 Expo 이관 전체가 아직 하나의 정리되지 않은 working tree이므로, 변경 커밋과 실기기 회귀 확인 뒤 게시

## 2026-07-29 UULab Expo 완성도 강화

- 변경 분류: `ota` 후보 — 앱 설정·네이티브 모듈·권한·runtime·lockfile 변경 없음
- 수정: 시작 진행률 숫자/막대 동기화, 공통 다이얼로그 퇴장 효과, 공용 사진 뷰어 iOS·Android 멀티터치 확대·이동·로딩·오류·세로 드래그 닫기, 로컬 리마인더 OS 예약 재대조, 스택 없는 딥링크의 홈 복귀
- 제품 정합성: 수동 로컬 백업 아이콘에서 클라우드 암시 제거, 기획 문서의 백업 v1·단일 exclusive transaction 설명을 실제 v2·플랫폼별 transaction 기준으로 갱신
- 검증: `preflight:update`, `guard:update`, `release:verify`, `release:assets:check`, Expo Doctor 20/20, `git diff --check` 통과
- Web 회귀: 320×568에서 사진 선택→저장→상세→뷰어 버튼/세로 드래그 닫기, 확인 대화상자 취소, 스택 없는 상세 딥링크→홈 복귀 확인. 콘솔 오류 0건, Expo Notifications Web 미지원 안내 1건만 확인
- 스토어 읽기 확인: Apple `1.0.0`, 175개 territory, 무료, 진행 중 심사 없음. Google production `1.0.0 / 26072302 / completed`
- 새 OTA는 게시하지 않음: 현재 변경이 Expo 이관 전체와 함께 정리되지 않은 working tree에 있으므로, 변경 커밋과 설치된 iOS·Android 바이너리 실기기 회귀 뒤 게시

## 2026-07-30 앱 셸·safe-area 회귀 수정

- 변경 분류: `ota`
- 검증 중 `expo install --fix`로 발생했던 SDK 57 패치 변경은 UI 수정과 무관하므로 되돌리고, `package.json`·`package-lock.json`·앱 설정을 현재 스토어 바이너리 기준선에 맞춤
- 수정: 앱바 `safeTop + 56pt` 고정, 탭 `64pt + bottomInset` 고정, 설정 행·기록 카드 가로 축 보강, 탭 scene 안 FAB의 bottom inset 중복 제거
- 네이티브 QA: iPhone 16 계열 430×932 시뮬레이터에서 홈·전체의 앱바·탭·가로 행 확인
- Web 회귀: 368×800 홈·전체·설정과 320×568 설정 확인, 콘솔 오류 0건
- 검증: `npm run ota:check` 통과 — TypeScript, ESLint, OTA용 Expo Doctor 19/19, Expo config, native baseline guard
- OTA guard: SDK `57.0.8`, RN `0.86.0`, package/lockfile, runtime `1.0.0`과 모든 native-sensitive 설정이 검증된 스토어 기준선 `1.0.0 (26072302)`과 동일
- production OTA: `c125a02f-1a16-4c31-bb63-ed99056b2ec9` — iOS·Android, runtime `1.0.0`, commit `50d0b7c`
- 다음 단계: 설치된 iOS·Android 스토어 바이너리에서 safe-area·탭 전환·백업·알림 회귀 QA

## 2026-07-30 기능·UI·UX 고도화

- 변경 분류: `ota`
- 기능: 마지막 백업 내보내기 시각을 로컬에 기록하고 성공·오류 상태를 명확히 표시, Web 내보내기 Blob 다운로드와 가져오기 파일 읽기 지원
- UX: 첫 기록 CTA, 중복 FAB 제거, 검색 열기·닫기 애니메이션과 동작 줄이기·접근성 처리, 작성 성공·별점 햅틱
- 디자인: 기록 종류 칩, 일기 사진과 영화·책 포스터 비율 분리, 작성 필드 포커스·별점 수치·저장 버튼 위계 보강
- Web 회귀: 320×568 라이트 빈 상태·검색·작성·저장·카드·설정, 320×568 다크 카드, 320×700 다크 백업 내보내기·가져오기 확인. v2 JSON 다운로드와 복원 성공, 콘솔 오류 0건
- 검증: `npm run ota:check` 통과(Expo Doctor 19/19), production iOS·Android·Web export 통과, native baseline guard 통과
- 참고: 일반 Expo Doctor는 2026-07-30 공개 SDK 57 패치 권장 버전 12건을 보고했다. 현재 스토어 바이너리의 검증 기준선과 달라지는 네이티브 의존성이므로 이번 OTA에서는 올리지 않고 다음 바이너리 릴리스에서 별도 검증한다.
- production OTA: `1667345d-971b-42d8-9427-23143e85fcba` — iOS·Android, runtime `1.0.0`, commit `11ca8ce`

## 2026-07-30 라이트 전용 단일 컬러

- 변경 분류: `ota`
- 화면 정책: 시스템·다크·라이트 선택을 제거하고 기기 설정과 무관하게 라이트 외관 고정
- 컬러 정책: 흰색·회색 중립면과 딥그린 `#24513F` 한 색만 강조색으로 사용
- 정리: 아이보리·코랄·골드·다크 팔레트, 테마 설정 행과 선택 화면 제거
- 호환: 기존 `/settings/theme` 진입은 설정 화면으로 리다이렉트
- Web 회귀: 기존 다크 저장 상태가 있던 320×700 설정, 320×700 영화 작성·별점, 320×700 빈 홈 확인. 콘솔 오류 0건
- 검증: `npm run ota:check` 통과(Expo Doctor 19/19), production iOS·Android·Web export 통과, native baseline guard 통과
