import rawClasses from '../data/classes.json'
import type { SelectableClass } from '../../shared/classSelection'
import { nameFor } from './korean'
import './RulesPage.css'

const classes: Array<SelectableClass & { name: string }> = rawClasses

const TOPICS = [
  ['attributes', '능력치와 수정치'], ['background', '배경'], ['skills', '기술 레벨'],
  ['classes', '클래스 조합'], ['foci', '포커스'], ['equipment', '장비와 자금'],
  ['combat', '전투 수치'], ['arts', '기교'], ['spells', '주문'], ['scope', '자동 적용 범위'],
] as const

export function RulesPage({ returnTo }: { returnTo: string }) {
  const fullClasses = classes.filter((option) => option.can_be_full_class)
  return <main className="rules-page">
    <header className="rules-page-header" id="rules" tabIndex={-1}>
      <div><p className="step-label">캐릭터 생성 안내</p><h1>생성 규칙</h1>
        <p className="support-text">1레벨 캐릭터 생성에 적용하는 규칙입니다. 읽고 돌아가도 작성 중인 선택은 유지됩니다.</p></div>
      <a className="rules-return" href={returnTo}>캐릭터 만들기로 돌아가기</a>
    </header>
    <div className="rules-page-layout">
      <nav className="rules-contents" aria-label="생성 규칙 목차">
        <strong>찾아보기</strong>
        {TOPICS.map(([id, title]) => <a key={id} href={'#rules-' + id}>{title}</a>)}
        <a className="rules-return" href={returnTo}>작성 화면으로</a>
      </nav>
      <div className="rules-articles">
        <section className="card rules-article" id="rules-attributes" aria-labelledby="rules-attributes-title" tabIndex={-1}>
          <h2 id="rules-attributes-title">능력치와 수정치</h2>
          <ul>
            <li>고정 수치 배정: 14, 12, 11, 10, 9, 7을 각각 한 번씩 배정합니다. 이미 사용한 수치를 고르면 두 능력치의 수치가 서로 바뀝니다.</li>
            <li>주사위 배정: 3d6을 여섯 번 굴려 근력, 민첩, 건강, 지능, 지혜, 매력 순서로 적용합니다. 순서를 바꾸거나 결과를 직접 수정할 수 없으며, 원하면 능력치 하나를 14로 대체할 수 있습니다.</li>
          </ul>
          <table className="rules-table"><caption>능력치에 따른 기본 수정치</caption>
            <thead><tr><th scope="col">능력치</th><th scope="col">수정치</th></tr></thead>
            <tbody>{[['3', '-2'], ['4–7', '-1'], ['8–13', '0'], ['14–17', '+1'], ['18', '+2']].map(([score, modifier]) =>
              <tr key={score}><th scope="row">{score}</th><td>{modifier}</td></tr>)}</tbody>
          </table>
          <h3>점수, 수정치, 한계는 서로 다릅니다</h3>
          <p>능력치 점수를 바꾸는 효과는 기본 수정치를 다시 계산합니다. 수정치 보너스는 점수를 바꾸지 않고 수정치에 더합니다. 수정치 한계를 바꾸는 효과는 허용 범위만 바꾸며, 그 자체로 보너스를 주지 않습니다.</p>
          <p>최종 수정치는 기본적으로 -2부터 +2까지입니다. 포커스에 명시된 한계 변경은 해당 능력치에만 적용합니다. 여러 한계 변경은 더하지 않고 가장 넓은 범위를 사용하므로, 최대 +3 효과가 두 개여도 최대 +3입니다. 모든 수정치를 합산한 뒤 최종 한계로 제한합니다.</p>
        </section>

        <section className="card rules-article" id="rules-background" aria-labelledby="rules-background-title" tabIndex={-1}>
          <h2 id="rules-background-title">배경</h2>
          <p>배경의 보너스 기술을 받고, 추가 기술은 아래 두 방식 중 하나로 얻습니다. 추천 기술은 안내일 뿐 추가로 부여되지 않습니다.</p>
          <table className="rules-table"><caption>추가 배경 기술 획득 방식</caption>
            <thead><tr><th scope="col">방식</th><th scope="col">선택 내용</th></tr></thead><tbody>
              <tr><th scope="row">기술 선택</th><td>학습 표에서 기술 두 개를 고릅니다. ‘아무 기술’ 항목은 제외하며, ‘전투 기술’ 항목에서는 전투 기술만 선택합니다.</td></tr>
              <tr><th scope="row">주사위</th><td>성장 표(d6)와 학습 표(d8)에 총 세 번의 굴림을 자유롭게 나누어 배정합니다. 표의 중복 항목도 그대로 사용합니다.</td></tr>
            </tbody>
          </table>
          <p>고정 기술과 주사위 결과는 다른 기술로 바꿀 수 없습니다. ‘아무 기술’, ‘전투 기술’, 능력치 증가처럼 선택이 필요한 결과만 허용된 목록에서 고릅니다. 직접 고르는 기술에는 <a href="#rules-skills">기술 배정 제한</a>이 적용됩니다.</p>
          <p>능력치 상승은 선택한 능력치의 점수에 더하며, 같은 능력치에 나온 상승도 합산합니다. 최대 점수는 18입니다. 배경 성장을 먼저 적용한 뒤 포커스 효과와 최종 수정치·HP·AC·내성을 계산합니다.</p>
          <p>배경이나 획득 방식을 바꾸면 이전 배경 선택과 굴림이 초기화됩니다. 클래스 단계의 자유 기술 하나는 배경의 두 선택 또는 세 굴림과 별개입니다.</p>
        </section>

        <section className="card rules-article" id="rules-skills" aria-labelledby="rules-skills-title" tabIndex={-1}>
          <h2 id="rules-skills-title">기술 레벨</h2>
          <p>숙련 기술은 0부터 4까지 다섯 레벨이며, 모든 기술은 미숙련인 -1에서 시작합니다. 생성 시 최고 레벨은 1입니다.</p>
          <table className="rules-table"><caption>같은 기술의 배정 횟수와 시작 레벨</caption>
            <thead><tr><th scope="col">배정</th><th scope="col">결과</th></tr></thead><tbody>
              <tr><th scope="row">없음</th><td>-1레벨 · 미숙련</td></tr>
              <tr><th scope="row">첫 번째</th><td>0레벨</td></tr>
              <tr><th scope="row">두 번째</th><td>1레벨</td></tr>
              <tr><th scope="row">세 번째 직접 선택</th><td>선택 불가</td></tr>
              <tr><th scope="row">포커스의 세 번째 고정 부여</th><td>1레벨 유지 · 해당 기술의 다음 레벨을 위한 성장 점수 2점</td></tr>
            </tbody>
          </table>
          <ul>
            <li>배경·클래스·포커스·자유 기술의 배정 횟수를 모두 합산합니다. 출처마다 별도의 제한을 갖는 것이 아닙니다.</li>
            <li>이미 두 번 받은 기술은 자유 기술이나 포커스의 선택형 기술 등으로 직접 다시 고를 수 없습니다. 고정 부여를 받았던 경우도 횟수에 포함됩니다.</li>
            <li>특정 기술을 고정으로 주는 포커스는 그 기술이 이미 1레벨이어도 선택할 수 있습니다. 성장 점수는 기술별로 기록하며 시작 레벨을 2로 올리지는 않습니다. 포커스 외의 강제 초과 배정은 별도 확인이 필요합니다.</li>
            <li>적용 순서는 배경 보너스 → 배경 선택·굴림 → 클래스 고정 기술 → 클래스 선택 기술 → 포커스 → 자유 기술입니다. 앞선 선택을 바꾸면 뒤의 선택도 다시 확인합니다.</li>
            <li>이전에 선택한 기술이 제한에 걸리면 오류로 표시되며 보너스를 주지 않습니다. 해당 선택을 직접 수정해야 합니다.</li>
          </ul>
        </section>

        <section className="card rules-article" id="rules-classes" aria-labelledby="rules-classes-title" tabIndex={-1}>
          <h2 id="rules-classes-title">클래스 조합</h2>
          <p>클래스 슬롯 두 개를 채웁니다. 같은 클래스를 두 번 선택하면 순수 클래스, 서로 다르면 두 부분 클래스의 조합입니다. 같은 계열이어도 서로 다른 클래스는 순수 클래스가 아닙니다.</p>
          <dl className="rules-definitions">
            <div><dt>순수 클래스 가능</dt><dd>{fullClasses.map((option) => option.name).join(', ')}</dd></div>
            <div><dt>부분 클래스 전용</dt><dd>{classes.filter((option) => !option.can_be_full_class).map((option) => option.name).join(', ')}. 각 클래스는 한 슬롯에만 넣을 수 있습니다.</dd></div>
          </dl>
          <h3>함께 선택할 수 없는 조합</h3>
          <ul>{classes.filter((option) => option.incompatible_archetypes?.length || option.incompatible_classes?.length).map((option) =>
            <li key={option.id}><strong>{option.name}:</strong> {[
              ...(option.incompatible_archetypes ?? []).map((id) => nameFor(id) + ' 계열 전체'),
              ...(option.incompatible_classes ?? []).map((id) => classes.find((entry) => entry.id === id)?.name ?? nameFor(id)),
            ].join(', ')}와 조합할 수 없습니다.</li>)}</ul>
          <p>제한은 두 클래스 모두 확인하며 슬롯 순서로 우회할 수 없습니다. 마법사 계열 제한에는 주문을 쓰지 않는 마법사 계열 클래스도 포함됩니다.</p>
          <h3>클래스 보너스와 능력</h3>
          <ul>
            <li>클래스 보너스는 서로 다른 클래스마다 한 번씩 부여합니다. 같은 클래스를 두 번 골라도 고정 기술을 두 번 받지는 않습니다. 서로 다른 두 클래스가 같은 기술을 주면 두 번 배정됩니다.</li>
            <li>현인의 선택형 보너스 기술은 클래스 단계의 자유 기술과 별개입니다. 모든 클래스의 고정 기술을 적용한 뒤 선택형 기술을 배정합니다.</li>
            <li>순수 전사의 추가 능력과 순수 전문가의 추가 능력은 정확히 같은 클래스를 두 번 선택했을 때만 얻습니다. 같은 계열의 다른 클래스를 조합하는 것으로는 얻지 못합니다.</li>
            <li>히트 주사위·기본 공격 보너스·포커스 선택권은 두 클래스의 계열 조합으로 정합니다. 클래스 조합의 표시 이름은 능력 부여 조건이 아닙니다.</li>
          </ul>
        </section>

        <section className="card rules-article" id="rules-foci" aria-labelledby="rules-foci-title" tabIndex={-1}>
          <h2 id="rules-foci-title">포커스</h2>
          <h3>항마사의 항마도</h3>
          <p>항마도는 무화자 1레벨을 자동으로 부여하며 일반 포커스 선택권을 소모하지 않습니다. 이미 직접 선택한 무화자 1레벨은 자동 습득으로 대체하고 그 선택권을 돌려줍니다. 효과는 한 번만 적용하며, 반환된 선택권은 원래의 전사·전문가·자유 구분을 따릅니다.</p>
          <p>자동 습득한 무화자는 개별 해제하거나 중복 선택할 수 없습니다. 항마사나 부여 기교를 잃으면 자동 습득분과 그 효과도 사라집니다. 환급받은 이전 선택은 자동으로 복구하지 않으며, 원하면 일반 선택권으로 다시 선택해야 합니다. 생성 시 2레벨 포커스 금지는 그대로 유지하므로 항마도로 2레벨을 얻거나 2레벨 보유에 따른 대체 포커스를 받지는 않습니다.</p>
          <h3>소언사의 전통적 교육</h3>
          <p>한 번만 선택할 수 있으며, 고마법·원소마법·사령마법 중 하나의 전통을 지정합니다. 소언사의 순수·부분 여부에 맞는 시작 기교를 얻고 해당 전통의 주문도 배울 수 있습니다. 시작 주문 수는 부분 소언사 2개, 순수 소언사 4개로 그대로 유지되며, 모두 1레벨 주문이어야 합니다.</p>
          <p>최대 분발은 마법 기술 레벨과 같고 최소 1점입니다. 능력치 수정치나 기술 성장 점수는 더하지 않습니다. 이 전통에서는 이후 추가 기교를 얻지 않습니다. 다른 클래스의 분발과 합산하거나 소비·회복을 관리하는 기능은 포함하지 않습니다.</p>
          <h3>공통 선택 규칙</h3>
          <p>1레벨 캐릭터를 만드는 단계이므로 1레벨 포커스만 선택할 수 있습니다. 선택권이 남거나 선행 포커스를 갖고 있어도 2레벨 포커스는 선택할 수 없으며, 설명만 읽을 수 있습니다.</p>
          <table className="rules-table"><caption>포커스 선택권</caption>
            <thead><tr><th scope="col">선택권</th><th scope="col">사용 가능한 포커스</th></tr></thead><tbody>
              <tr><th scope="row">전사</th><td>전투 태그가 있는 포커스</td></tr>
              <tr><th scope="row">전문가</th><td>비전투 태그가 있는 포커스</td></tr>
              <tr><th scope="row">자유</th><td>선택 조건을 충족하는 모든 포커스</td></tr>
            </tbody>
          </table>
          <p>태그가 없거나 주문 전용인 포커스는 자유 선택권을 사용합니다. 이름이나 설명으로 태그를 추정하지 않습니다. 선택권 배정은 자동으로 조정하며, 남은 제한형 선택권을 다른 종류의 포커스에 사용할 수는 없습니다.</p>
          <ul>
            <li>각 포커스의 클래스·선행 포커스·상호 배제 조건을 모두 충족해야 합니다. 선택 불가 항목도 설명은 읽을 수 있습니다.</li>
            <li>각 선택은 선택권 하나씩 사용합니다. 이전 저장본의 2레벨 포커스는 오류로 표시되며 보너스가 적용되지 않으므로 해제해야 합니다.</li>
            <li>기원 포커스는 한 계열만 선택할 수 있습니다.</li>
            <li>반복 가능으로 지정된 1레벨 포커스만 여러 번 선택할 수 있습니다. 특성화 인재는 각 선택마다 서로 다른 기술을 지정합니다.</li>
            <li>특성 묶음의 장단점은 함께 적용되며 서로 다른 묶음의 효과를 섞을 수 없습니다. 능력치 선택과 선택형 보너스도 모두 해결해야 합니다.</li>
            <li>추가 선택권을 주는 포커스를 해제하거나 클래스를 바꾸면 선택권을 다시 배정합니다. 먼저 고른 유효한 선택을 우선 유지하며, 조건이나 선택권을 잃은 항목과 연결된 향상은 해제될 수 있습니다.</li>
          </ul>
          <p>기술 부여는 <a href="#rules-skills">기술 배정 제한</a>, 능력치 효과는 <a href="#rules-attributes">점수·수정치·한계 규칙</a>을 따릅니다. 개별 효과와 선택 조건은 각 포커스의 전체 설명에서 확인하세요.</p>
        </section>

        <section className="card rules-article" id="rules-equipment" aria-labelledby="rules-equipment-title" tabIndex={-1}>
          <h2 id="rules-equipment-title">장비와 자금</h2>
          <ul>
            <li>시작 장비는 꾸러미 하나 또는 3d6 × 10은화 중 하나입니다. 함께 받을 수 없으며, 꾸러미 이름은 추천 용도이지 클래스 제한이 아닙니다.</li>
            <li>꾸러미 내용은 수정하거나 판매할 수 없습니다. 구매는 꾸러미의 자금 또는 굴린 자금으로 하며, 10동화는 1은화입니다. 가격 미기재 항목은 무료가 아니라 구매 불가입니다.</li>
            <li>구매 수량 1은 목록에 표시된 단위입니다. 화살은 20개 한 묶음, 투척용 단검은 한 자루입니다. 구매를 취소하면 비용이 반환됩니다.</li>
            <li>꾸러미·획득 방식을 바꾸거나 은화를 다시 굴리면 구매와 착용 내역이 초기화됩니다.</li>
            <li>보유한 장비 중 갑옷·방패·사용 무기를 직접 지정합니다. 자동으로 착용하지 않으며, 미선택은 맨몸·방패 없음·비무장입니다. 시작 장비를 고르기 전에도 맨몸 AC는 10 + 최종 민첩 수정치로 계산합니다.</li>
            <li>양손 무기와 손에 든 방패는 함께 사용할 수 없습니다. 방패로 공격하려면 해당 방패를 손에 들고 있어야 합니다.</li>
          </ul>
          <h3>표기 하중</h3>
          <p>꾸러미의 행별 하중에는 수량이 이미 반영되어 있습니다. 구매한 장비는 등록된 묶음 특성을 적용합니다. 미기재 하중은 0으로 보지 않으며, 출처의 각주나 수치 불일치는 확인 대상으로 표시합니다.</p>
          <p>시트의 합계는 표기 하중 합산이지 실제 휴대 하중이나 운반 한도 판정이 아닙니다. 준비·보관 구분, 운송 수단, 동전 하중은 추적하지 않습니다.</p>
        </section>

        <section className="card rules-article" id="rules-combat" aria-labelledby="rules-combat-title" tabIndex={-1}>
          <h2 id="rules-combat-title">전투 수치</h2>
          <dl className="rules-definitions">
            <div><dt>시작 HP</dt><dd>클래스 조합의 히트 주사위에 적용 가능한 능력 조정을 반영합니다. 최종 주사위 식의 최댓값에 최종 건강 수정치를 더하며, 최소 HP는 1입니다.</dd></div>
            <div><dt>공격 보너스</dt><dd>클래스 성장 수치에 기본 공격 보너스를 직접 바꾸는 효과를 먼저 적용합니다. 일반적인 포커스 공격 보너스는 그 뒤에 별도로 더합니다.</dd></div>
            <div><dt>AC</dt><dd>초기 맨몸 AC는 10 + 최종 민첩 수정치입니다. 장비를 착용하면 갑옷의 기본 AC(맨몸은 10)와 손에 든 방패의 기본 AC 중 높은 값을 사용합니다. 갑옷의 기본 AC가 방패 이상이면 방패 보너스 +1을 받습니다. 마지막으로 최종 민첩 수정치를 더합니다.</dd></div>
            <div><dt>불괴의 AC</dt><dd>기본 AC는 15 + (캐릭터 레벨 ÷ 2, 올림)로, 1레벨에서는 16입니다. 착용 갑옷의 기본 AC와 비교하여 높은 값 하나를 사용합니다. 여기에 기존 방패 규칙을 적용하고 최종 민첩 수정치를 더합니다. 갑옷의 기본 AC를 더하지 않으며, 착용 갑옷의 잠행·운동 페널티는 그대로 유지합니다. 불괴를 해제하면 장비와 맨몸 기준으로 다시 계산합니다.</dd></div>
            <div><dt>갑옷 페널티</dt><dd>잠행·운동 판정에 적용되며 습득한 기술 레벨 자체를 낮추지 않습니다. 방패의 충격 방어 등 상황별 특성은 해당 장비 설명을 참고합니다.</dd></div>
          </dl>
          <table className="rules-table"><caption>1레벨 내성 목표값 · 낮을수록 유리</caption>
            <thead><tr><th scope="col">내성</th><th scope="col">기본 계산</th></tr></thead><tbody>
              <tr><th scope="row">육체</th><td>15 - 근력·건강 중 높은 수정치</td></tr>
              <tr><th scope="row">회피</th><td>15 - 민첩·지능 중 높은 수정치</td></tr>
              <tr><th scope="row">정신</th><td>15 - 지혜·매력 중 높은 수정치</td></tr>
              <tr><th scope="row">행운</th><td>15</td></tr>
            </tbody>
          </table>
          <p>먼저 최종 능력치 수정치로 내성 목표값을 계산한 뒤, 별도의 상시 내성굴림 보정을 뺍니다. 내성굴림 +2 보너스는 목표값을 2 낮추고, -2 페널티는 목표값을 2 높입니다. 이 직접 보정에는 능력치 수정치의 -2~+2 한계를 적용하지 않습니다. 시트의 최종 목표값에는 이미 반영되어 있으므로 같은 상시 보정을 주사위 결과에 다시 적용하지 않습니다.</p>
          <p>오니·노역종·반인종·예속종의 정신 내성 -2는 능력치 수정치 변화와 별개인 상시 페널티입니다. 반면 노동자 포병종의 정신 내성 -2는 정신에 영향을 미치는 효과에만 적용합니다. 드워프의 +2는 적대적인 마법 효과에, 무화자의 +2는 자신과 20피트 이내 아군이 마법 효과에 대항할 때만 적용합니다.</p>
          <p>조건부 보정은 출처·조건과 함께 따로 표시하며 기본 목표값에 합산하지 않습니다. 여러 조건부 효과의 중첩, 재굴림, 자동 성공과 사용 횟수는 플레이 중 판정합니다. 하중 계산용 근력 보정은 실제 근력 점수를 바꾸지 않습니다.</p>
        </section>

        <section className="card rules-article" id="rules-arts" aria-labelledby="rules-arts-title" tabIndex={-1}>
          <h2 id="rules-arts-title">기교</h2>
          <ul>
            <li>시작 기교는 서로 다른 클래스마다 한 번 부여하며, 순수·부분 클래스에 등록된 시작 규칙을 따릅니다. 클래스 슬롯 수만큼 단순히 곱하지 않습니다.</li>
            <li>고정 기교는 자동 습득하고, 지정 목록의 선택과 추가 기교 선택은 각각 해결합니다. 고정 또는 이미 습득한 기교를 다시 고를 수 없습니다.</li>
            <li>지정 목록이 전용인 경우 그 목록의 남은 기교를 추가 기교로 고를 수 없습니다. 전용이 아니라면 남은 항목을 추가 선택할 수 있습니다.</li>
            <li>클래스와 포커스 모두 기교를 부여하지 않을 때 이 단계를 건너뜁니다. 필요한 시작 규칙이나 목록이 누락된 경우 ‘기교 없음’으로 처리하지 않고 확인 필요로 표시합니다.</li>
            <li>전통적 교육은 소언사의 순수·부분 여부에 맞춰 선택한 전통의 시작 기교를 부여합니다. 고정 기교도 포함하며, 중복 기교는 한 번만 습득하고 대체 선택권은 받지 않습니다.</li>
            <li>클래스를 바꾸면 유효한 선택은 유지하고, 조건을 잃거나 개수를 초과한 선택은 해제합니다.</li>
          </ul>
        </section>

        <section className="card rules-article" id="rules-spells" aria-labelledby="rules-spells-title" tabIndex={-1}>
          <h2 id="rules-spells-title">주문</h2>
          <p>소언사·원소술사·사령술사·고마법사는 주문 시전 클래스입니다. 마지막 단계에서 해당 슬롯마다 1레벨 주문 두 개를 배웁니다. 상위 레벨 주문은 표시하거나 선택하지 않습니다.</p>
          <table className="rules-table"><caption>클래스별 선택 가능한 학파</caption>
            <thead><tr><th scope="col">클래스</th><th scope="col">학파</th></tr></thead><tbody>
              <tr><th scope="row">소언사</th><td>고마법. 전통적 교육이 있으면 선택한 전통의 주문도 가능</td></tr>
              <tr><th scope="row">고마법사</th><td>고마법</td></tr>
              <tr><th scope="row">원소술사</th><td>고마법·원소마법</td></tr>
              <tr><th scope="row">사령술사</th><td>고마법·사령마법</td></tr>
            </tbody>
          </table>
          <ul>
            <li>순수 주문 시전 클래스는 두 슬롯에서 총 네 개를 배웁니다. 같은 주문을 두 슬롯에 중복 배정할 수 없습니다.</li>
            <li>두 주문 시전 클래스를 조합해도 각 슬롯에서 두 개씩 고릅니다. 예를 들어 원소술사·사령술사는 네 주문을 합쳐 자유롭게 고르는 것이 아닙니다.</li>
            <li>각 슬롯에서 두 주문을 모두 고마법으로 골라도 됩니다. 전문 학파 주문을 반드시 포함할 필요는 없습니다.</li>
            <li>클래스 변경 시 해당 슬롯에서 계속 배울 수 있는 주문만 유지합니다. 주문 준비와 일일 시전 횟수는 이 선택과 별개이며 계산하지 않습니다.</li>
          </ul>
        </section>

        <section className="card rules-article" id="rules-scope" aria-labelledby="rules-scope-title" tabIndex={-1}>
          <h2 id="rules-scope-title">자동 적용 범위</h2>
          <ul>
            <li>이 도구는 1레벨 캐릭터 생성용입니다. 선택한 배경·클래스·포커스·장비·기교·주문의 등록 데이터로 선택 가능 여부와 구현된 효과를 확인합니다.</li>
            <li>능력 설명에 적혀 있다고 모든 효과가 자동 계산되지는 않습니다. 전투 중 행동·지속 시간·제작·조건부 보정과 미구현된 포커스·기교 예외는 설명을 참고해 직접 적용하세요.</li>
            <li>무기 표는 기본 수치입니다. 기술·능력치·포커스·상황에 따른 최종 명중 및 피해 굴림은 계산하지 않습니다. 현재 기관계 부담도 추적하지 않습니다.</li>
            <li>규칙 확인이 필요한 데이터는 해당 항목에 표시합니다. 최종 시트는 구현된 계산 결과이며, 미구현 효과까지 모두 적용됐다는 뜻은 아닙니다.</li>
            <li>서버 연결이 필요하며 연결이 끊기면 최종 수치를 확인할 수 없습니다. 선택은 현재 브라우저에 자동 저장되며 다른 기기와 공유되지 않습니다.</li>
          </ul>
        </section>
      </div>
    </div>
  </main>
}
