const BLOCKED_CLASS_OPTIONS = {
    "11": ["11", "300", "301", "302", "303", "304", "305", "306", "307", "308", "309", "310", "311"],
    "21": ["21"],
    "22": ["22"],
    "300": ["11", "305"],
    "301": ["11", "305"],
    "302": ["11", "305"],
    "303": ["11", "303"],
    "304": ["11", "304"],
    "305": ["11", "300", "301", "302"],
    "306": ["11", "306"],
    "307": ["11", "307"],
    "308": ["11", "308"],
    "309": ["11", "309"],
    "310": ["11", "310"],
    "311": ["11", "311"]
}

function getClassCombinationKey(class1, class2) {
    let c1 = Math.min(class1, class2)
    let c2 = Math.max(class1, class2)

    return c1 + "-" + c2
}

function setupClassTable(){

    let temp1 = Number($("#class1 option:selected").val())
    let temp2 = Number($("#class2 option:selected").val())
    let config = CLASS_COMBINATION_CONFIGS[getClassCombinationKey(temp1, temp2)]

    if (!config) {
        $('table').remove()
        $('#cc').remove()
        return
    }

    let addit_cols = config.addit_cols || []

    $('table').remove()
    let ct = genClassTable(
        config.classTitle,
        config.hd_col,
        config.ab_col,
        config.focus_col,
        addit_cols[0],
        addit_cols[1],
        addit_cols[2],
        addit_cols[3]
    )
    $('#ct').append(ct)

    $('#cc').remove()
    let class_card = genClassAbilities(config.abi_id || [])
    $("#class_card").append(class_card)

}

function genClassAbilities(ids){

    let wrapper = $('<ul class="card-wrapper" id="cc"></ul>');

    ids.forEach(function(id, index){

        let block = $('<li class="card"></li>');

        if (id === "s1000"){
            block.append($('<h3>클래스 능력: 치명적 일격</h3>'));
            block.append($('<h4>Class Ability: Killing Blow</h4>'));
            block.append($('<p>전사가 공격, 주문, 또는 특별한 능력으로 피해를 입혔을 때, ' +
                '피해에 캐릭터 레벨의 반을 더합니다(소수점 아래 올림).' +
                '이 피해는 충격 피해에도 추가됩니다. 충격 피해를 강화하는 여러 포커스와 조합된다면,' +
                '숙련된 전사는 공격 굴림의 결과와 상관없이 평범한 병사 여럿을 순식간에 처리할 수 있습니다.</p>'));

        } else if (id === "s1001"){
            block.append($('<h3>클래스 능력: 베테랑의 행운</h3>'));
            block.append($('<h4>Class Ability: Veteran\'s Luck</h4>'));
            block.append($('<p>장면마다 한 번, 전사는 즉시 행동을 사용해 빗나간 공격을 맞춘 것으로 간주할 수 있습니다. ' +
                '또는 스스로를 향한 공격이 성공했을 때 빗나간 것으로 간주할 수도 있습니다.' +
                '이 능력은 환경으로 인한 피해 또는 자신이 타고 있는 동물이나 ' +
                '이동 수단을 향한 피해를 없앨 수는 없습니다.</p>'));

        } else if (id === "s1100") {
            block.append($('<h3>항마사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Mageslayer</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•항마사 기교</b></p></li>'));

        } else if (id === "s2000"){
            block.append($('<h3>클래스 능력: 전문화</h3>'));
            block.append($('<h4>Class Ability: Masterful Expertise</h4>'));
            block.append($('<p>장면마다 한 번, 전문가는 즉시 행동을 사용해 비전투 기술 판정을 다시 굴릴 수 있습니다.</p>'));

        } else if (id === "s2001"){
            block.append($('<h3>클래스 능력: 빠른 학습자</h3>'));
            block.append($('<h4>Class Ability: Quick Learner</h4>'));
            block.append($('<p> 캐릭터의 레벨이 올라갔을 때, 비전투 기술을 향상하는 데 사용할 수 있는 기술 점수 하나를 추가로 받습니다.' +
                ' 이때 받은 점수는 나중을 위해 저장할 수 있습니다.</p>'));

        } else if (id === "s2100"){
            block.append($('<h3>음유시인 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Bard</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•공연 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•바드 기교</b></p></li>'));

        } else if (id === "s2200"){
            block.append($('<h3>현인 시작 혜택</h3>'));
            block.append($('<h4>Benefits of the Wise</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•캐릭터 컨셉에 알맞은 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•현인 기교</b></p></li>'));

        } else if (id === "s30000") {
            block.append($('<h3>고마법사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of High Mage</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 4</p></li>'));
            block.append($('<li><p><b>•주문 목록:</b> 고마법</p></li>'));
            block.append($('<li><p><b>•고마법사 기교</b></p></li>'));

        } else if (id === "s30001") {
            block.append($('<h3>고마법사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of High Mage</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 2</p></li>'));
            block.append($('<li><p><b>•주문 목록:</b> 고마법</p></li>'));
            block.append($('<li><p><b>•고마법사 기교</b></p></li>'));

        } else if (id === "s30100") {
            block.append($('<h3>원소술사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Elementalist</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 4</p></li>'));
            block.append($('<li><p><b>•주문 목록: </b>고마법, 원소마법</p></li>'));
            block.append($('<li><p><b>•원소술사 기교</b></p></li>'));

        } else if (id === "s30101") {
            block.append($('<h3>원소술사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Elementalist</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 2</p></li>'));
            block.append($('<li><p><b>•주문 목록: </b>고마법, 원소마법</p></li>'));
            block.append($('<li><p><b>•원소술사 기교</b></p></li>'));

        } else if (id === "s30200") {
            block.append($('<h3>사령술사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Necromancer</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 4</p></li>'));
            block.append($('<li><p><b>•주문 목록: </b>고마법, 사령마법</p></li>'));
            block.append($('<li><p><b>•사령술사 기교</b></p></li>'));

        } else if (id === "s30201") {
            block.append($('<h3>사령술사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Necromancer</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 2</p></li>'));
            block.append($('<li><p><b>•주문 목록: </b>고마법, 사령마법</p></li>'));
            block.append($('<li><p><b>•사령술사 기교</b></p></li>'));

        } else if (id === "s30300") {
            block.append($('<h3>치료사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Healer</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•치료 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•치료사 기교</b></p></li>'));

        } else if (id === "s30400") {
            block.append($('<h3>구도자 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Vowed</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•구도자의 종파에 따른 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•구도자 기교</b></p></li>'));

        } else if (id === "s30500") {
            block.append($('<h3>소언사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Invoker</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 4</p></li>'));
            block.append($('<li><p><b>•주문 목록:</b> 고마법</p></li>'));

        } else if (id === "s30501") {
            block.append($('<h3>소언사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Invoker</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•시작 주문 수:</b> 2</p></li>'));
            block.append($('<li><p><b>•주문 목록:</b> 고마법</p></li>'));

        } else if (id === "s30600") {
            block.append($('<h3>변신술사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Skinshifter</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•생존 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•변신술사 기교</b></p></li>'));

        } else if (id === "s30700") {
            block.append($('<h3>결투가 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Duelist</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•접전 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•결투가 기교</b></p></li>'));

        } else if (id === "s30701") {
            block.append($('<h3>허약함의 단점</h3>'));
            block.append($('<h4>Flaw of Fragility</h4>'));
            block.append($('<p>결투가의 규율은 훌륭한 일대일 전투원을 만들지만 일반적인 전사 동료들에 비해 순수 ' +
                '육체적 훈련에 있어서 훨씬 더 적은 시간을 사용하게 됩니다. 이들이 사용하는 기법은 빠르고 치명적이지만, ' +
                '일반적인 훈련으로 얻어지는 고통을 인내하는 방법을 배우지는 않습니다. 이렇기 때문에 부분 전사/부분 결투가는 ' +
                '부분 전사의 1d6+2 이 아닌 1d6을 HD로 사용합니다. ' +
                '다른 부분 클래스 조합은 이 단점으로 인해 특별한 영향을 받지 않습니다.</p>'));

        } else if (id === "s30800") {
            block.append($('<h3>야수조련사 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Beastmaster</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•생존 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•야수조련사 기교</b></p></li>'));

        } else if (id === "s30900") {
            block.append($('<h3>사제 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Priest</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•기도 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•사제 기교</b></p></li>'));

        } else if (id === "s31000") {
            block.append($('<h3>생각 귀족 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Thought Noble</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•감지 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•생각 귀족 기교</b></p></li>'));

        } else if (id === "s31100") {
            block.append($('<h3>저주받은 자 시작 혜택</h3>'));
            block.append($('<h4>Benefits of Accursed</h4>'))
            block.append($('<ul></ul>'));
            block.append($('<li><p><b>•마법 기술</b> +1</p></li>'));
            block.append($('<li><p><b>•저주받은 자 기교</b></p></li>'));
        }

        wrapper.append(block)

    });


    return wrapper

}

function blockClassChoice(id, to_block_select){

    $(to_block_select).children().removeAttr('disabled');
    $(to_block_select + " option[value='0']").attr('disabled', 'disabled')

    let blockedOptions = BLOCKED_CLASS_OPTIONS[id] || []

    blockedOptions.forEach(function(optionValue) {
        $(to_block_select + " option[value='" + optionValue + "']").attr('disabled', 'disabled')
    })
}

function genClassTable(class_title, hit_dice, ab, focus, addit_col1, addit_col2, addit_col3, addit_col4){
    let table = $('<table>');
    table.append($('<caption></caption>').text(class_title))

    let table_head = $('<thead></thead>')
    table_head.append("<tr></tr>")
    table_head.append($('<th>' + levels[0] + '</th>').addClass('stat'))
    table_head.append($('<th>' + hit_dice[0] + '</th>').addClass('stat'))
    table_head.append($('<th>' + ab[0] + '</th>').addClass('stat'))
    table_head.append($('<th>' + focus[0] + '</th>').addClass('stat'))

    if (addit_col1){
        addit_col1[0].forEach(function(item, index){
            table_head.append($('<th>' + item + '</th>').addClass('stat'))
        });
    }

    if (addit_col2){
        addit_col2[0].forEach(function(item, index){
            table_head.append($('<th>' + item + '</th>').addClass('stat'))
        });
    }

    if (addit_col3){
        addit_col3[0].forEach(function(item, index){
            table_head.append($('<th>' + item + '</th>').addClass('stat'))
        });
    }

    if (addit_col4){
        addit_col4[0].forEach(function(item, index){
            table_head.append($('<th>' + item + '</th>').addClass('stat'))
        });
    }


    table.append(table_head)

    for(i=1; i<11; i++){
        var row = $('<tr>')
        row.append($('<td>').text(levels[i]).addClass('stat'));
        row.append($('<td>').text(hit_dice[i]).addClass('stat'));
        row.append($('<td>').text(ab[i]).addClass('stat'));
        row.append($('<td>').text(focus[i]).addClass('stat'));

        if (addit_col1) {
            addit_col1[i].forEach(function (item, index) {
                row.append($('<td>' + item + '</td>').addClass('stat'))
            });
        }

        if (addit_col2) {
            addit_col2[i].forEach(function (item, index) {
                row.append($('<td>' + item + '</td>').addClass('stat'))
            });
        }

        if (addit_col3) {
            addit_col3[i].forEach(function (item, index) {
                row.append($('<td>' + item + '</td>').addClass('stat'))
            });
        }

        if (addit_col4) {
            addit_col4[i].forEach(function (item, index) {
                row.append($('<td>' + item + '</td>').addClass('stat'))
            });
        }

        table.append(row);
    }
    return table

}

let levels = ["레벨","1","2","3","4","5","6","7","8","9","10"]

let warrior_hp = ["히트 다이스","1d6+2","2d6+4","3d6+6","4d6+8","5d6+10","6d6+12","7d6+14","8d6+16","9d6+18","10d6+20"]
let expert_hp = ["히트 다이스","1d6","2d6","3d6","4d6","5d6","6d6","7d6","8d6","9d6","10d6"]
let mage_hp = ["히트 다이스","1d6-1","2d6-2","3d6-3","4d6-4","5d6-5","6d6-6","7d6-7","8d6-8","9d6-9","10d6-10"]

let to_ten_ab = ["공격 보너스","+1","+2","+3","+4","+5","+6","+7","+8","+9","+10"]
let to_seven_ab = ["공격 보너스","+1","+2","+2","+3","+4","+5","+5","+6","+6","+7"]
let to_five_ab = ["공격 보너스","+0","+1","+1","+2","+2","+3","+3","+4","+4","+5"]
let to_two_ab =["공격 보너스","+0","+0","+0","+0","+1","+1","+1","+1","+1","+2"]

let focus_war = ["포커스 선택","전사 1, 자유 1","자유 1", "-", "-", "자유 1", "-", "자유 1", "-", "-", "자유 1"]
let focus_mage = ["포커스 선택","자유 1","자유 1", "-", "-", "자유 1", "-", "자유 1", "-", "-", "자유 1"]
let focus_exp = ["포커스 선택","전문가 1, 자유 1","자유 1", "-", "-", "자유 1", "-", "자유 1", "-", "-", "자유 1"]
let focus_war_exp = ["포커스 선택","전사 1, 전문가 1, 자유 1","자유 1", "-", "-", "자유 1", "-", "자유 1", "-", "-", "자유 1"]


let full_high_mage_table = [['고마법사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['자유 2', '1', '1', '3'], ['자유 1', '1','1','3'], ['-','2','2','4'],
    ['자유 1', '2', '2', '5' ], ['-', '3', '3', '6'], ['자유 1', '3', '3', '7'],
    ['-', '4', '4', '8'], ['자유 1', '4', '4', '9'], ['-', '5','5','10'],
    ['자유 1', '5', '6', '12']]

let partial_high_mage_table = [['고마법사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['자유 1', '1', '1', '2'], ['자유 1', '1','1','3'], ['자유 1','1','1','3'],
    ['-', '1', '2', '4' ], ['-', '2', '2', '5'], ['자유 1', '2', '3', '6'],
    ['-', '2', '3', '7'], ['-', '2', '3', '7'], ['자유 1', '3','4','8'],
    ['-', '3', '4', '9']]

let full_elem_table = [['원소술사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['<i>원소 촉발</i>, <i>원소 내성</i>, 자유 1', '1', '1', '3'], ['자유 1', '1','1','3'],
    ['-','2','2','4'],
    ['자유 1', '2', '2', '5' ], ['-', '3', '3', '6'], ['자유 1', '3', '3', '7'],
    ['-', '4', '4', '8'], ['자유 1', '4', '4', '9'], ['-', '5','5','10'],
    ['자유 1', '5', '6', '12']]

let partial_elem_art = [['원소술사 기교'], ['<i>원소 촉발</i>, <i>원소 내성</i>, 자유 1'], ['자유 1'],
                        ['-'], ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let partial_necro_art =  [['사령술사 기교'], ['자유 1'], ['-'], ['자유 1'], ['-'], ['-'], ['자유 1'],
                             ['-'], ['-'], ['자유 1'], ['-']]

let partial_high_mage_art = [['고마법사 기교'], ['자유 1'], ['자유 1'], ['자유 1'],
                                ['-'], ['-'], ['자유 1'], ['-'], ['-'], ['자유 1'], ['-']]


let partial_elem_table = [['원소술사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['<i>원소 촉발</i>, <i>원소 내성</i>, 자유 1', '1', '1', '2'], ['-', '1','1','3'],
    ['자유 1','1','1','3'], ['-', '1', '2', '4' ], ['-', '2', '2', '5'], ['자유 1', '2', '3', '6'],
    ['-', '2', '3', '7'], ['-', '2', '3', '7'], ['자유 1', '3','4','8'], ['-', '3', '4', '9']]

let full_necro_table = [['사령술사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['자유 1', '1', '1', '3'], ['자유 1', '1','1','3'],
    ['-','2','2','4'],
    ['자유 1', '2', '2', '5' ], ['-', '3', '3', '6'], ['자유 1', '3', '3', '7'],
    ['-', '4', '4', '8'], ['자유 1', '4', '4', '9'], ['-', '5','5','10'],
    ['자유 1', '5', '6', '12']]

let partial_necro_table = [['사령술사 기교','최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
    ['자유 1', '1', '1', '2'], ['-', '1','1','3'],
    ['자유 1','1','1','3'], ['-', '1', '2', '4' ], ['-', '2', '2', '5'], ['자유 1', '2', '3', '6'],
    ['-', '2', '3', '7'], ['-', '2', '3', '7'], ['자유 1', '3','4','8'], ['-', '3', '4', '9']]

let healer_table = [['치료사 기교'], ['<i>치료의 손길</i>, 자유 1'], ['자유 1'], ['-'], ['자유 1'], ['자유 1'],
    ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let vowed_table = [['격투 명중 보너스','격투 피해','격투 충격','구도자 기교'],
                    ['+0', '1d6', '1/15', '<i>무예</i>,<i>비무장 무력</i>,<i>맨몸 방어술</i>, 자유 1'],
                    ['+1', '1d6','2/15','자유 1'], ['+1','1d8','2/15','-'], ['+2', '1d8', '2/15', '자유 1' ],
                    ['+2', '1d10', '2/15', '자유 1'], ['+3', '1d10', '3/15', '자유 1'], ['+3', '1d10+1', '3/15', '-'],
                    ['+4', '1d10+1', '3/15', '자유 1'], ['+4', '1d10+2','4/15','-'], ['+5', '1d10+3', '4/15', '자유 1']]

let full_adunic_table = [['최대 주문 레벨','주문 점수','준비된 주문 수'],
                            ['1', '1 + 지식 수정치', '2 + 지식 수정치'], ['1','3 + 지식 수정치','3 + 지식 수정치'],
                            ['2','4 + 지식 수정치','4 + 지식 수정치'], ['2', '5 + 지식 수정치', '4 + 지식 수정치' ],
                            ['3', '6 + 지식 수정치', '5 + 지식 수정치'], ['3', '7 + 지식 수정치', '6 + 지식 수정치'],
                            ['4', '8 + 지식 수정치', '7 + 지식 수정치'], ['4', '9 + 지식 수정치', '7 + 지식 수정치'],
                            ['5', '10 + 지식 수정치','8 + 지식 수정치'], ['5', '11 + 지식 수정치', '9 + 지식 수정치']]

let partial_adunic_table = [['최대 주문 레벨','주문 점수','준비된 주문 수'],
                            ['1', '1 + 지식 수정치', '1 + 지식 수정치'], ['1','1 + 지식 수정치','3 + 지식 수정치'],
                            ['1','2 + 지식 수정치','3 + 지식 수정치'], ['1', '2 + 지식 수정치', '4 + 지식 수정치' ],
                            ['2', '3 + 지식 수정치', '4 + 지식 수정치'], ['2', '3 + 지식 수정치', '5 + 지식 수정치'],
                            ['2', '4 + 지식 수정치', '5 + 지식 수정치'], ['2', '4 + 지식 수정치', '6 + 지식 수정치'],
                            ['3', '5 + 지식 수정치','6 + 지식 수정치'], ['3', '6 + 지식 수정치', '7 + 지식 수정치']]

let skinshifter_table = [['형상 보너스','변신술사 기교'], ['+1','<i>형상 변화</i>, 자유 1'], ['+1','자유 1'], ['+2', '-'],
                        ['+2', '자유 1'], ['+3', '자유 1'], ['+3', '자유 1'], ['+4', '-'], ['+4', '자유 1'],
                        ['+5', '-'], ['+6', '자유 1']]

let duelist_table = [['선호 무기 보너스','결투가 기교'], ['+1','<i>선호 무기</i>, 자유 1'], ['+1','자유 1'], ['+2', '-'],
                    ['+2', '자유 1'], ['+3', '자유 1'], ['+3', '자유 1'], ['+4', '-'], ['+4', '자유 1'],
                    ['+5', '-'], ['+5', '자유 1']]

let beastmaster_table = [['야수조련사 기교'], ['<i>동료 결속</i>, 자유 1'], ['자유 1'], ['-'], ['자유 1'], ['자유 1'],
                    ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let priest_table = [['사제 기교'], ['자유 2'], ['자유 1'], ['-'], ['자유 1'], ['자유 1'],
    ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let thought_noble_table = [['생각 귀족 기교'], ['<i>정신 열람</i>, 자유 1'], ['자유 1'], ['자유 1'], ['자유 1'], ['자유 1'],
    ['자유 1'], ['자유 1'], ['자유 1'], ['자유 1'], ['자유 1']]


let dual_mage_table = [['최대 주문 레벨','하루 주문 시전 횟수','하루 주문 준비 수'],
                    ['1', '1', '3'], ['1','1','4'], ['1','2','5'],
                    ['2', '2', '6' ], ['2', '2', '8'], ['2', '3', '9'],
                    ['3', '3', '10'], ['3', '4', '12'], ['3','4','13'],
                    ['4', '5', '15']]

let mageslayer_table = [['항마사 기교'], ['<i>항마도</i>, <i>마법살</i>'], ['<i>마녀탐색자</i>,<i>주문방패</i>'],
    ['<i>주문 방해</i>'], ['<i>사냥감을 알라</i>'], ['<i>고통을 공유해라</i>'], ['<i>마법 일소</i>'],
    ['<i>아군 방호</i>'], ['<i>흠없는 육체</i>'], ['<i>흠없는 정신</i>'], ['<i>절대적 무효화</i>']]

let accursed_table = [['저주받은 자 기교'], ['<i>저주받은 화살</i> 혹은 <i>저주받은 검</i>, 자유 1'],
    ['자유 1'], ['-'], ['자유 1'], ['자유 1'], ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let bard_table = [['바드 기교'], ['<i>천 개의 혓바닥</i>, 자유 1'], ['자유 1'], ['-'], ['자유 1'], ['-'],
    ['자유 1'], ['-'], ['자유 1'], ['-'], ['자유 1']]

let wise_table = [['비마법적 사제','마녀','예언자','기인'],
    ['<i>신성한 존엄성</i>','<i>공포와 경외</i>','<i>학식</i> 혹은 <i>민중의 친구</i>', '자유 1'],
    ['<i>공포와 경외</i> 혹은 <i>민중의 친구</i>','<i>저주와 축복</i> 중 1','<i>예지 기교</i> 중 1','-'],
    ['-','-','-','자유 1'],
    ['<i>숙련된</i> 혹은 <i>학식</i>','<i>의사</i> 혹은 <i>저주와 축복</i> 중 1','<i>예지 기교</i> 중 1','-'],
    ['<i>개인적 비처벌성</i>','<i>예지 기교</i> 중 1','<i>예지 기교</i> 중 1','자유 1'],
    ['<i>연줄</i> 혹은 <i>민중의 친구</i>','<i>숙련된</i>', '<i>숙련된</i> 혹은 <i>연줄</i>', '-'],
    ['-','-','-','자유 1'],
    ['<i>일반 기교</i> 중 1', '<i>예지 기교</i>와 <i>저주와 축복</i> 중 1', '<i>숙련된</i> 혹은 <i>연줄</i>','-'],
    ['-','-','-','자유 1'],
    ['<i>일반 기교</i> 중 1','<i>저주와 축복</i> 중 1','<i>예지 기교</i> 중 1','-']]


const CLASS_COMBINATION_CONFIGS = {
    "10-10": { classTitle: "\uc804\uc0ac", hd_col: warrior_hp, ab_col: to_ten_ab, focus_col: focus_war, addit_cols: [], abi_id: ["s1000", "s1001"] },
    "10-11": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\ud56d\ub9c8\uc0ac)", hd_col: warrior_hp, ab_col: to_ten_ab, focus_col: focus_war, addit_cols: [mageslayer_table], abi_id: ["s1100"] },
    "10-20": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc804\ubb38\uac00)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war_exp, addit_cols: [], abi_id: ["s2001"] },
    "10-21": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc74c\uc720\uc2dc\uc778)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [bard_table], abi_id: ["s2100"] },
    "10-22": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\ud604\uc778)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [wise_table], abi_id: ["s2200"] },
    "10-300": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uace0\ub9c8\ubc95\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [partial_high_mage_table], abi_id: ["s30001"] },
    "10-301": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc6d0\uc18c\uc220\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [partial_elem_table], abi_id: ["s30101"] },
    "10-302": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc0ac\ub839\uc220\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [partial_necro_table], abi_id: ["s30201"] },
    "10-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uce58\ub8cc\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [healer_table], abi_id: ["s30300"] },
    "10-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uad6c\ub3c4\uc790)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [vowed_table], abi_id: ["s30400"] },
    "10-305": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc18c\uc5b8\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [partial_adunic_table], abi_id: ["s30501"] },
    "10-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [skinshifter_table], abi_id: ["s30600"] },
    "10-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uacb0\ud22c\uac00)", hd_col: expert_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [duelist_table], abi_id: ["s30700", "s30701"] },
    "10-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [beastmaster_table], abi_id: ["s30800"] },
    "10-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc0ac\uc81c)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [priest_table], abi_id: ["s30900"] },
    "10-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [thought_noble_table], abi_id: ["s31000"] },
    "10-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: warrior_hp, ab_col: to_seven_ab, focus_col: focus_war, addit_cols: [accursed_table], abi_id: ["s31100"] },
    "11-20": { classTitle: "\ubaa8\ud5d8\uac00 (\ud56d\ub9c8\uc0ac/\uc804\ubb38\uac00)", hd_col: expert_hp, ab_col: to_seven_ab, focus_col: focus_exp, addit_cols: [mageslayer_table], abi_id: ["s1100", "s2001"] },
    "11-21": { classTitle: "\ubaa8\ud5d8\uac00 (\ud56d\ub9c8\uc0ac/\uc74c\uc720\uc2dc\uc778)", hd_col: expert_hp, ab_col: to_seven_ab, focus_col: focus_mage, addit_cols: [mageslayer_table, bard_table], abi_id: ["s1100", "s2100"] },
    "11-22": { classTitle: "\ubaa8\ud5d8\uac00 (\ud56d\ub9c8\uc0ac/\ud604\uc778)", hd_col: expert_hp, ab_col: to_seven_ab, focus_col: focus_mage, addit_cols: [mageslayer_table, wise_table], abi_id: ["s1100", "s2200"] },
    "20-20": { classTitle: "\uc804\ubb38\uac00", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [], abi_id: ["s2000", "s2001"] },
    "20-21": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc74c\uc720\uc2dc\uc778)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table], abi_id: ["s2001", "s2100"] },
    "20-22": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\ud604\uc778)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table], abi_id: ["s2001", "s2200"] },
    "20-300": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uace0\ub9c8\ubc95\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [partial_high_mage_table], abi_id: ["s2001", "s30001"] },
    "20-301": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc6d0\uc18c\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [partial_elem_table], abi_id: ["s2001", "s30101"] },
    "20-302": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc0ac\ub839\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [partial_necro_table], abi_id: ["s2001", "s30201"] },
    "20-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uce58\ub8cc\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [healer_table], abi_id: ["s2001", "s30300"] },
    "20-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uad6c\ub3c4\uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [vowed_table], abi_id: ["s2001", "s30400"] },
    "20-305": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc18c\uc5b8\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [partial_adunic_table], abi_id: ["s2001", "s30501"] },
    "20-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [skinshifter_table], abi_id: ["s2001", "s30600"] },
    "20-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uacb0\ud22c\uac00)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [duelist_table], abi_id: ["s2001", "s30700"] },
    "20-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [beastmaster_table], abi_id: ["s2001", "s30800"] },
    "20-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc0ac\uc81c)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [priest_table], abi_id: ["s2001", "s30900"] },
    "20-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc0dd\uac01 \uadc0\uc871)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [thought_noble_table], abi_id: ["s2001", "s31000"] },
    "20-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uc804\ubb38\uac00/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [accursed_table], abi_id: ["s2001", "s31100"] },
    "21-22": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\ud604\uc778)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, wise_table], abi_id: ["s2100", "s2200"] },
    "21-300": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uace0\ub9c8\ubc95\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, partial_high_mage_table], abi_id: ["s2100", "s30001"] },
    "21-301": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc6d0\uc18c\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, partial_elem_table], abi_id: ["s2100", "s30101"] },
    "21-302": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc0ac\ub839\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, partial_necro_table], abi_id: ["s2100", "s30201"] },
    "21-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uce58\ub8cc\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, healer_table], abi_id: ["s2100", "s30300"] },
    "21-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uad6c\ub3c4\uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, vowed_table], abi_id: ["s2100", "s30400"] },
    "21-305": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc18c\uc5b8\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, partial_adunic_table], abi_id: ["s2100", "s30501"] },
    "21-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, skinshifter_table], abi_id: ["s2100", "s30600"] },
    "21-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uacb0\ud22c\uac00)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, duelist_table], abi_id: ["s2100", "s30700"] },
    "21-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, beastmaster_table], abi_id: ["s2100", "s30800"] },
    "21-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc0ac\uc81c)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, priest_table], abi_id: ["s2100", "s30900"] },
    "21-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc0dd\uac01 \uadc0\uc871)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, thought_noble_table], abi_id: ["s2100", "s31000"] },
    "21-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uc74c\uc720\uc2dc\uc778/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [bard_table, accursed_table], abi_id: ["s2100", "s31100"] },
    "22-300": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uace0\ub9c8\ubc95\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, partial_high_mage_table], abi_id: ["s2200", "s30001"] },
    "22-301": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc6d0\uc18c\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, partial_elem_table], abi_id: ["s2200", "s30101"] },
    "22-302": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc0ac\ub839\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, partial_necro_table], abi_id: ["s2200", "s30201"] },
    "22-303": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uce58\ub8cc\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, healer_table], abi_id: ["s2200", "s30300"] },
    "22-304": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uad6c\ub3c4\uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, vowed_table], abi_id: ["s2200", "s30400"] },
    "22-305": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc18c\uc5b8\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, partial_adunic_table], abi_id: ["s2200", "s30501"] },
    "22-306": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, skinshifter_table], abi_id: ["s2200", "s30600"] },
    "22-307": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uacb0\ud22c\uac00)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, duelist_table], abi_id: ["s2200", "s30700"] },
    "22-308": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, beastmaster_table], abi_id: ["s2200", "s30800"] },
    "22-309": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc0ac\uc81c)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, priest_table], abi_id: ["s2200", "s30900"] },
    "22-310": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc0dd\uac01 \uadc0\uc871)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, thought_noble_table], abi_id: ["s2200", "s31000"] },
    "22-311": { classTitle: "\ubaa8\ud5d8\uac00 (\ud604\uc778/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: expert_hp, ab_col: to_five_ab, focus_col: focus_exp, addit_cols: [wise_table, accursed_table], abi_id: ["s2200", "s31100"] },
    "300-300": { classTitle: "\ub9c8\ubc95\uc0ac - \uace0\ub9c8\ubc95\uc0ac", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [full_high_mage_table], abi_id: ["s30000"] },
    "300-301": { classTitle: "\uc30d \ubd80\ubd84 \ub9c8\ubc95\uc0ac (\uace0\ub9c8\ubc95\uc0ac/\uc6d0\uc18c\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [dual_mage_table, partial_high_mage_art, partial_elem_art], abi_id: ["s30001", "s30101"] },
    "300-302": { classTitle: "\uc30d \ubd80\ubd84 \ub9c8\ubc95\uc0ac (\uace0\ub9c8\ubc95\uc0ac/\uc0ac\ub839\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [full_high_mage_table, partial_high_mage_art, partial_necro_art], abi_id: ["s30001", "s30201"] },
    "300-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uce58\ub8cc\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, healer_table], abi_id: ["s30001", "s30300"] },
    "300-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uad6c\ub3c4\uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, vowed_table], abi_id: ["s30001", "s30400"] },
    "300-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, skinshifter_table], abi_id: ["s30001", "s30600"] },
    "300-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, duelist_table], abi_id: ["s30001", "s30700"] },
    "300-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, beastmaster_table], abi_id: ["s30001", "s30800"] },
    "300-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, priest_table], abi_id: ["s30001", "s30900"] },
    "300-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, thought_noble_table], abi_id: ["s30001", "s31000"] },
    "300-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uace0\ub9c8\ubc95\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_high_mage_table, accursed_table], abi_id: ["s30001", "s31100"] },
    "301-301": { classTitle: "\ub9c8\ubc95\uc0ac - \uc6d0\uc18c\uc220\uc0ac", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [full_elem_table], abi_id: ["s30100"] },
    "301-302": { classTitle: "\uc30d \ubd80\ubd84 \ub9c8\ubc95\uc0ac (\uc6d0\uc18c\uc220\uc0ac/\uc0ac\ub839\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [dual_mage_table, partial_elem_art, partial_necro_art], abi_id: ["s30101", "s30201"] },
    "301-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uce58\ub8cc\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, healer_table], abi_id: ["s30101", "s30300"] },
    "301-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uad6c\ub3c4\uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, vowed_table], abi_id: ["s30101", "s30400"] },
    "301-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, skinshifter_table], abi_id: ["s30101", "s30600"] },
    "301-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, duelist_table], abi_id: ["s30101", "s30700"] },
    "301-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, beastmaster_table], abi_id: ["s30101", "s30800"] },
    "301-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, priest_table], abi_id: ["s30101", "s30900"] },
    "301-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc6d0\uc18c\uc220\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, thought_noble_table], abi_id: ["s30101", "s31000"] },
    "301-311": { classTitle: "\ub9c8\ubc95\uc0ac - \uc0ac\ub839\uc220\uc0ac", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_elem_table, accursed_table, full_necro_table], abi_id: ["s30200"] },
    "302-303": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uce58\ub8cc\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, healer_table], abi_id: ["s30201", "s30300"] },
    "302-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uad6c\ub3c4\uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, vowed_table], abi_id: ["s30201", "s30400"] },
    "302-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, skinshifter_table], abi_id: ["s30201", "s30600"] },
    "302-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, duelist_table], abi_id: ["s30201", "s30700"] },
    "302-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, beastmaster_table], abi_id: ["s30201", "s30800"] },
    "302-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, priest_table], abi_id: ["s30201", "s30900"] },
    "302-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, thought_noble_table], abi_id: ["s30201", "s31000"] },
    "302-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0ac\ub839\uc220\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_necro_table, accursed_table], abi_id: ["s30201", "s31100"] },
    "303-304": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uad6c\ub3c4\uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, vowed_table], abi_id: ["s30300", "s30400"] },
    "303-305": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uc18c\uc5b8\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, partial_adunic_table], abi_id: ["s30300", "s30501"] },
    "303-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, skinshifter_table], abi_id: ["s30300", "s30600"] },
    "303-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, duelist_table], abi_id: ["s30300", "s30700"] },
    "303-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, beastmaster_table], abi_id: ["s30300", "s30800"] },
    "303-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, priest_table], abi_id: ["s30300", "s30900"] },
    "303-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, thought_noble_table], abi_id: ["s30300", "s31000"] },
    "303-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uce58\ub8cc\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [healer_table, accursed_table], abi_id: ["s30300", "s31100"] },
    "304-305": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\uc18c\uc5b8\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, partial_adunic_table], abi_id: ["s30400", "s30501"] },
    "304-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, skinshifter_table], abi_id: ["s30400", "s30600"] },
    "304-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, duelist_table], abi_id: ["s30400", "s30700"] },
    "304-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, beastmaster_table], abi_id: [] },
    "304-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, priest_table], abi_id: ["s30400", "s30900"] },
    "304-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uad6c\ub3c4\uc790/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, thought_noble_table], abi_id: ["s30400", "s31000"] },
    "304-311": { classTitle: "\ub9c8\ubc95\uc0ac - \uc18c\uc5b8\uc0ac", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [vowed_table, accursed_table, full_adunic_table], abi_id: ["s30500"] },
    "305-306": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\ubcc0\uc2e0\uc220\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, skinshifter_table], abi_id: ["s30501", "s30600"] },
    "305-307": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, duelist_table], abi_id: ["s30501", "s30700"] },
    "305-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, beastmaster_table], abi_id: ["s30501", "s30800"] },
    "305-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, priest_table], abi_id: ["s30501", "s30900"] },
    "305-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\uc0dd\uac01 \uadc0\uc871)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, thought_noble_table], abi_id: ["s30501", "s31000"] },
    "305-311": { classTitle: "\ubaa8\ud5d8\uac00 (\uc18c\uc5b8\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [partial_adunic_table, accursed_table], abi_id: ["s30501", "s31100"] },
    "306-307": { classTitle: "\ubaa8\ud5d8\uac00 (\ubcc0\uc2e0\uc220\uc0ac/\uacb0\ud22c\uac00)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [skinshifter_table, duelist_table], abi_id: ["s30600", "s30700"] },
    "306-308": { classTitle: "\ubaa8\ud5d8\uac00 (\ubcc0\uc2e0\uc220\uc0ac/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [skinshifter_table, beastmaster_table], abi_id: ["s30600", "s30800"] },
    "306-309": { classTitle: "\ubaa8\ud5d8\uac00 (\ubcc0\uc2e0\uc220\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [skinshifter_table, priest_table], abi_id: ["s30600", "s30900"] },
    "306-310": { classTitle: "\ubaa8\ud5d8\uac00 (\ubcc0\uc2e0\uc220\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [skinshifter_table, thought_noble_table, skinshifter_table, accursed_table], abi_id: ["s30600", "s31100"] },
    "307-308": { classTitle: "\ubaa8\ud5d8\uac00 (\uacb0\ud22c\uac00/\uc57c\uc218\uc870\ub828\uc0ac)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [duelist_table, beastmaster_table], abi_id: ["s30700", "s30800"] },
    "307-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uacb0\ud22c\uac00/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [duelist_table, priest_table], abi_id: ["s30700", "s30900"] },
    "307-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uacb0\ud22c\uac00/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [duelist_table, thought_noble_table, duelist_table, accursed_table], abi_id: ["s30700", "s31100"] },
    "308-309": { classTitle: "\ubaa8\ud5d8\uac00 (\uc57c\uc218\uc870\ub828\uc0ac/\uc0ac\uc81c)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [beastmaster_table, priest_table], abi_id: ["s30800", "s30900"] },
    "308-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc57c\uc218\uc870\ub828\uc0ac/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [beastmaster_table, thought_noble_table, beastmaster_table, accursed_table], abi_id: ["s30800", "s31100"] },
    "309-310": { classTitle: "\ubaa8\ud5d8\uac00 (\uc0dd\uac01 \uadc0\uc871/\uc800\uc8fc\ubc1b\uc740 \uc790)", hd_col: mage_hp, ab_col: to_two_ab, focus_col: focus_mage, addit_cols: [priest_table, thought_noble_table, priest_table, accursed_table, thought_noble_table, accursed_table], abi_id: ["s31000", "s31100"] },
}

