let savedRubric = [];
let savedStudent = [];

async function updateBootstrap(i, n) {
    let percent = Math.round((i / n) * 100);
    $('#bootstrapProgress').text(percent + "%");
    $('#bootstrapProgress').css("width", percent + "%");    
}

async function startBootstrap(){
    if (savedRubric.length == 0) {
        $('#alertBox').text("Cannot bootstrap without the model being fit. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
            $("#alertBox").slideUp(1000);
        });
        return;
    }
    $("#startBootstrap").prop("disabled", true);
    bootstrap.Tooltip.getInstance('#startBootstrap').hide();
    $("#progressFooter").show();
    $('body').css('paddingBottom', $('#progressFooter').height() + 20 + 'px');
    $('#bootstrapProgress').text("0%");
    $('#bootstrapProgress').css("width", "0%");
    $('#newFileDiv').hide();
    bootstrapFunction = pyscript.interpreter.globals.get('startBootstrap');
    let response = await bootstrapFunction();
    $("#progressFooter").hide();
    $('body').css('paddingBottom', '0px');
    $('#newFileDiv').show();
    if (!response) {
        $('#alertBox').text("Bootstrap failed. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
            $("#alertBox").slideUp(1000);
        });
    }
}

function paintAfterBootstrap(rubricRW, errors) {
    let rubricR = JSON.parse(rubricRW);
    paintRubricTable(rubricR, true);
    if (errors && errors > 0) {
        $('#alertBox').text(errors + " errors were encountered during bootstrap.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
            $("#alertBox").slideUp(1000);
        });
    }
}

function populateColForm(num, text) {
    let numList = JSON.parse(num);
    let textList = JSON.parse(text);
    let colList = numList.concat(textList);

    if (colList.length < 4 || numList.length < 2) {
        $('#alertBox').text("The data provided does not have enough columns to estimate a model. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
            $("#alertBox").slideUp(1000);
        });
        return;
    }
    
    $('#kValueSelect').empty();
    $.each(numList, function() {
        let kSelect = this == 'k' ? true : false;
        $('#kValueSelect').append(new Option(this, this, kSelect, kSelect));
    });
    $('#boundSelect').empty();
    $.each(numList, function() {
        let boundSelect = this == 'bound' ? true : false;
        $('#boundSelect').append(new Option(this, this, boundSelect, boundSelect));
    });
    $('#studentSelect').empty();
    $.each(colList, function() {
        let studentSelect = this == 'student' ? true : false;
        $('#studentSelect').append(new Option(this, this, studentSelect, studentSelect));
    });
    $('#rubricSelect').empty();
    $.each(colList, function() {
        let rubricSelect = this == 'rubric' ? true : false;
        $('#rubricSelect').append(new Option(this, this, rubricSelect, rubricSelect));
    });
    $('#dataMapping').modal('show');
}

async function paintRubricTable (rubricR, bootstrap = false) {
    let headerData = bootstrap ? ['Variable', 'Value', 'Average Logistic', 'Average Marginal Logistic', 'Average Discrete Marginal Logistic', 'Confidence Interval', 'P-Value'] : ['Variable', 'Value', 'Average Logistic', 'Average Marginal Logistic', 'Average Discrete Marginal Logistic'];
    $('#rubricHeader').empty();
    for (let header of headerData) {
        let h = document.createElement( "th" );
        h.setAttribute("scope", "col");
        h.textContent = header;
        $('#rubricHeader').append(h);
    }
    $('#rubricResults').empty();
    for (let row of rubricR) {
        let r = document.createElement( "tr" );
        for (let head of headerData) {
            let td = document.createElement("td");
            let content = row[head];
            if (Array.isArray(content) && content.length == 2) {
                td.textContent = "(" + Number.parseFloat(content[0]).toFixed(3) + ", " + Number.parseFloat(content[1]).toFixed(3) + ")";
            } else if (head == 'Variable') {
                td.textContent = content;
            } else {
                td.textContent = Number.parseFloat(content).toFixed(3);
            }
            r.appendChild(td);
        }
        $('#rubricResults').append(r);
    }
    $('#modelResults').show();
    
}

function paintAfterEst(rubricRW, studentRW, obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood){
    $("#startBootstrap").prop("disabled", false);
    let rubricR = JSON.parse(rubricRW);
    let studentR = JSON.parse(studentRW);
    savedRubric = rubricR;
    savedStudent = studentR;
    paintRubricTable(rubricR);
    $('#modelFitResults').empty();
    let paramList = [["Number of Observations", obs],["Number of Parameters", param],["AIC", AIC],["BIC", BIC],["McFadden's R^2", McFadden],["LR Statistic", LR],["Chi-Squared P-Value", ChiSquared],["Log Likelihood", LogLikelihood]];
    for (let par of paramList) {
        let m = document.createElement( "tr" );
        let td = document.createElement("td");
        td.textContent = par[0];
        m.appendChild(td);
        td = document.createElement("td");
        if (par[0] == "Number of Observations" || par[0] == "Number of Parameters") {
            td.textContent = Number.parseFloat(par[1]).toFixed(0);
        } else {
            td.textContent = Number.parseFloat(par[1]).toFixed(3);
        }
        m.appendChild(td);
        $('#modelFitResults').append(m);
    }
    rebuildGraphs();
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
    if (!response) {
        $('#alertBox').text("We were unable to estimate the model. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
            $("#alertBox").slideUp(1000);
        });
    }
}

async function rebuildGraphs(filterdata = []){
    if (filterdata.length == 0) {
        $('#clearGroupDiv').hide();
    } else {
        $('#clearGroupDiv').show();
    }
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