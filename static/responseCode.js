let savedRubric = [];
let savedStudent = [];

function updateBootstrap(i, n) {
    console.log(i)
}

function populateColForm(num, text) {
    let numList = JSON.parse(num)
    let textList = JSON.parse(text)
    let colList = numList.concat(textList)
    $('#kValueSelect').empty();
    $.each(numList, function() {
        $('#kValueSelect').append(new Option(this, this));
    });
    $('#boundSelect').empty();
    $.each(numList, function() {
        $('#boundSelect').append(new Option(this, this));
    });
    $('#studentSelect').empty();
    $.each(colList, function() {
        $('#studentSelect').append(new Option(this, this));
    });
    $('#rubricSelect').empty();
    $.each(colList, function() {
        $('#rubricSelect').append(new Option(this, this));
    });
    $('#dataMapping').modal('show');
}

async function saveMapping() {
    let kValue = $('#kValueSelect').val();
    let bound = $('#boundSelect').val();
    let student = $('#studentSelect').val();
    let rubric = $('#rubricSelect').val();
    let data = [kValue, bound, student, rubric];
    $('#dataMapping').modal('hide');
    passMappingData = pyscript.interpreter.globals.get('buildTable');
    let response = await passMappingData(data);
    if (response.length == 10) {
        let [rubricRW, studentRW, obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood] = response;
        let rubricR = JSON.parse(rubricRW);
        let studentR = JSON.parse(studentRW);
        savedRubric = rubricR;
        savedStudent = studentR;
        $('#rubricResults').empty();
        for (let row of rubricR) {
            let r = document.createElement( "tr" );
            let td = document.createElement("td");
            td.textContent = row['Variable'];
            r.appendChild(td);
            td = document.createElement("td");
            td.textContent = Number.parseFloat(row['Value']).toFixed(3);
            r.appendChild(td);
            td = document.createElement("td");
            td.textContent = Number.parseFloat(row['Average Logistic']).toFixed(3);
            r.appendChild(td);
            td = document.createElement("td");
            td.textContent = Number.parseFloat(row['Average Marginal Logistic']).toFixed(3);
            r.appendChild(td);
            td = document.createElement("td");
            td.textContent = Number.parseFloat(row['Average Discrete Marginal Logistic']).toFixed(3);
            r.appendChild(td);
            $('#rubricResults').append(r);
        }
        $('#modelResults').show();
        $('#modelFitResults').empty();
        let m = document.createElement( "tr" );
        let td = document.createElement("td");
        td.textContent = "Number of Observations";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(obs).toFixed(0);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "Number of Parameters";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(param).toFixed(0);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "AIC";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(AIC).toFixed(3);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "BIC";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(BIC).toFixed(3);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "McFadden's R^2";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(McFadden).toFixed(3);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "LR Statistic";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(LR).toFixed(3);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        m = document.createElement( "tr" );
        td = document.createElement("td");
        td.textContent = "Chi-Squared P-Value";
        m.appendChild(td);
        td = document.createElement("td");
        td.textContent = Number.parseFloat(ChiSquared).toFixed(3);
        m.appendChild(td);
        $('#modelFitResults').append(m);
        rebuildGraphs();
    } else {
        $('#alertBox').text("We were unable to estimate the model. Please try again.");
        $('#alertBox').show();
    }
}

function rebuildGraphs(filterdata = []){
    let graphdata = buildData(variable='Average Logistic', filterList = filterdata);
    buildGraphics(graphdata);
    let ALl1, ALl2
    [ALl1, ALl2] = getListsFromBD(graphdata);
    buildSumTable(ALl1, ALl2, target='#StatData');
    let graphdataAML = buildData(variable='Average Marginal Logistic', filterList = filterdata);
    buildGraphics(graphdataAML, '#studentKDEAML');
    let AMLl1, AMLl2
    [AMLl1, AMLl2] = getListsFromBD(graphdataAML);
    buildSumTable(AMLl1, AMLl2, target='#StatDataAML');
}