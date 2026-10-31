function setInputLength(){

    let div_width = $( ".name-box" ).width()
    let name_label_width = $("#name-label").width()/*$("#name-label").text().length*/

    console.log(div_width)
    console.log($("#name-label").width())

   /*$('#pc-name').attr('size', div_width - name_label_width)*/
}


function rollStatAndGetMod(){

    let val = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1)
        + (Math.floor(Math.random() * 6) + 1)

    let val_str = ""

    if (val == 3) {
        val_str = val + "(-2)"
    } else if (3 < val && val < 8) {
        val_str = val + "(-1)"
    } else if (7 < val && val < 14) {
        val_str = val + "(+0)"
    } else if (13 < val && val < 18) {
        val_str = val + "(+1)"
    } else if (val == 18) {
        val_str = val + "(+2)"
    }

    return val_str

}

function genStats(){

    $( "#strVal" ).empty().append(rollStatAndGetMod())
    $( "#dexVal" ).empty().append(rollStatAndGetMod())
    $( "#conVal" ).empty().append(rollStatAndGetMod())
    $( "#intVal" ).empty().append(rollStatAndGetMod())
    $( "#wisVal" ).empty().append(rollStatAndGetMod())
    $( "#chaVal" ).empty().append(rollStatAndGetMod())

    $( ".changeStats" ).val(0)

}

function changeTo14(){

    let stat_val = $( ".changeStats" ).val()

    if (stat_val == 1){
        $( "#strVal" ).empty().append("14(+1)")
    } else if(stat_val == 2){
        $( "#dexVal" ).empty().append("14(+1)")
    } else if(stat_val == 3){
        $( "#conVal" ).empty().append("14(+1)")
    } else if(stat_val == 4){
        $( "#intVal" ).empty().append("14(+1)")
    } else if(stat_val == 5){
        $( "#wisVal" ).empty().append("14(+1)")
    } else if(stat_val == 6){
        $( "#chaVal" ).empty().append("14(+1)")
    }
}

