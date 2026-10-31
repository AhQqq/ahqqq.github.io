function arrayToCardsFocus(tableData, locus) {
    let wrapper = $('<ul class="card-wrapper"></ul>');
    $(tableData).each(function (i, rowData) {
        let block = $('<li class="card"></li>');
        $(rowData).each(function (j, cellData) {
            if (j == 0) {
                block.append($('<h3>' + cellData + '</h3>'));
            } else if (j == 1) {
                block.append($('<h4>' + cellData + '</h4>'));
            } else if (j == 3) {
                block.append($('<p>' + cellData + '</p>'));
            } else if (j == 4) {
                if(cellData) {
                    block.append($('<p><b>레벨 1</b> ' + cellData + '</p>'));
                }
            } else if (j == 5) {
                if(cellData){
                    block.append($('<p><b>레벨 2</b> ' + cellData + '</p>'));
                }
            } else if (j == 6){
                block.append($('<h4>' + cellData + '</h4>'));
            } else if (j == 7){
                block.append($('<p>' + cellData + '<p>'));
            } else {
            }
        });
        wrapper.append(block);
    });
    locus.after(wrapper);
}

function arrayToCardsArt(tableData, locus) {
    let wrapper = $('<ul class="card-wrapper"></ul>');
    $(tableData).each(function (i, rowData) {
        let block = $('<li class="card"></li>');
        $(rowData).each(function (j, cellData) {
            if (j == 0) {
                block.append($('<h3>' + cellData + '</h3>'));
            } else if (j == 1) {
                block.append($('<h4>' + cellData + '</h4>'));
            } else if (j == 3) {
                block.append($('<p>' + cellData + '</p>'));
            } else {
            }
        });
        wrapper.append(block);
    });
    locus.after(wrapper);
}

function arrayToCardsSpell(tableData, locus) {
    let wrapper = $('<ul class="card-wrapper"></ul>');
    $(tableData).each(function (i, rowData) {
        let block = $('<li class="card"></li>');
        $(rowData).each(function (j, cellData) {
            if (j == 0) {
                block.append($('<h3>' + cellData + '</h3>'));
            } else if (j == 1) {
                block.append($('<h4>' + cellData + '</h4>'));
            } else if (j == 2) {
                block.append($('<h5><b>' + cellData + '</b></h5>'));
            } else if (j == 3) {
                block.append($('<h5><b>' + cellData + '  </b></h5>'));
            } else if (j == 4) {
                block.append($('<p>' + cellData + '</p>'));
            } else {
            }
        });
        wrapper.append(block);
    });
    locus.after(wrapper);
}

function subset(tableData, category){
    let temp = new Array()
    $(tableData).each(function (i, rowData) {
        if (rowData.length != 1 && rowData[2].match(category)){
            temp.push(rowData)
        }
    });
    return temp

}

