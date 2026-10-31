# 수 없는 세계 

이 웹페이지는 Worlds Without Number와 그 서플인 Atlas of the Latter Earth의 플레이어용 데이터의 팬 번역 사이트입니다. 이 웹페이지는 룰북을 대체할 용도로 만들어지지 않았습니다. 

이 웹페이지는 Kevin Crawford와 Sine Nomine Publishing과 아무런 연관이 없습니다. 

두 책은 아래의 링크에서 각각 구매할 수 있습니다.

#### Worlds Without Number: [DrivethruRPG](https://www.drivethrurpg.com/product/348791/Worlds-Without-Number)
#### Atlas of the Latter Earth: [DrivethruRPG](https://www.drivethrurpg.com/product/416284/The-Atlas-of-the-Latter-Earth)


## 수정할 파일 찾기

| 작업 | 위치 |
| --- | --- |
| 포커스·주문·기교·장비 등의 번역이나 수치 수정 | [공용 JSON 자료](character-builder/frontend/data/) · [포커스 파일](character-builder/frontend/data/foci.json) |
| 자료집의 설명문이나 페이지 구조 수정 | [페이지 템플릿](database/templates/) |
| 감사의 말, 메뉴, 클래스 페이지, 공통 색상과 서체 수정 | [정적 페이지와 스타일](database/public/) |
| 캐릭터 생성 화면과 규칙 수정 | [화면](character-builder/frontend/src/) · [공유 규칙 코드](character-builder/shared/) |
| 검수 작업 이어가기 | [남은 작업](docs/character-builder/TASKS.md) · [포커스 검수 기록](docs/character-builder/FOCUS_SEMANTIC_AUDIT.md) |

JSON이나 템플릿을 수정한 뒤 `npm run build:database`를 실행하면 [자료집 HTML](database/generated/)이 갱신됩니다. 생성된 HTML도 소스 변경과 함께 커밋합니다. `npm run check:database`로 최신 상태인지 확인할 수 있습니다.

이전 번역의 대조 자료는 [원본 기록](docs/history/builder-sources/)과 [기존 공개 텍스트](database/public/data/)에 있습니다.

## 로컬 미리보기

처음에는 저장소 루트에서 다음 명령으로 의존성을 설치합니다.

```sh
npm ci --prefix character-builder/frontend
npm ci --prefix character-builder/backend
```

아래 명령으로 테스트한 뒤 전체 사이트를 빌드하고 미리보기 서버를 실행합니다.

```sh
npm test
npm run build
python -m http.server 8765 --bind 127.0.0.1 --directory .site
```

[로컬 홈페이지](http://127.0.0.1:8765/)와 [캐릭터 생성기](http://127.0.0.1:8765/character/)에서 확인할 수 있습니다. 수정한 뒤에는 다시 빌드하고 브라우저를 새로고침하세요.

## 번역하신 분들과 담당하신 파트

주문: xnaudemforhs(사령술, 고마법), carljang(사령술, 고마법, 원소술), 아큐

클래스: carljang (고마법사, 사령술사, 구도자), 아큐

포커스: blue_sphere(기본), 아큐

배경: blue_sphere

장비: blue_sphere

검수, 취합, 통일: 아큐

#### WWN의 기본 룰 및 무료 배포판 번역을 해주신 blue_sphere님께 감사를 표합니다.

## 라이센스
Worlds Without Number SRD에 포함된 원문은 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)에 따라 제공됩니다. 이 저장소의 모든 게임 자료가 SRD에 포함되거나 CC0로 제공되는 것은 아닙니다. SRD에 포함되지 않은 원문 및 기타 제3자 자료의 권리는 각 권리자에게 있으며, 이 고지는 해당 자료의 이용·재배포 허락을 의미하지 않습니다.

한국어 번역·편집 및 사이트 제작에는 아큐와 기여자들이 참여했습니다. 자료집 코드에는 [루트 LICENSE](LICENSE), 캐릭터 생성기 코드에는 [해당 LICENSE](character-builder/LICENSE)를 참고해 주세요. 코드 라이선스는 게임 원문이나 제3자 자료에 대한 이용 허락을 부여하지 않습니다.

이 사이트는 Kevin Crawford 또는 Sine Nomine Publishing의 공식 제작물이나 승인된 서비스가 아닙니다.

