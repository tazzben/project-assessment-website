let savedRubric = [];
let savedStudent = [];
let savedFilterData = [];
let savedFilterFileName = "";
let stopBootstrap = false;
let showError = false;

function showErrorMessage(){
    showError = true;
    setTimeout(() => {
        if (showError){
            $('#errorDiv').show();
        }
    }, 1000);
}

function clearErrorMessage(){
    showError = false;
    $('#errorDiv').hide();
}

function updateBootstrap(i, n) {
    if (stopBootstrap) {
        stopBootstrap = false;
        return true;
    }
    let percent = Math.round((i / n) * 100);
    $('#bootstrapProgress').text(percent + "%");
    $('#bootstrapProgress').css("width", percent + "%");
    $(document).prop('title', "Bootstrap " + percent + "% Complete | Project Based Assessment");
    return false;
}

const cancelBootstrap = () => {
    stopBootstrap = true;
    $("#cancelBootstrap").prop("disabled", true);
};

const startBootstrap = async () => {
    if (savedRubric.length == 0) {
        $('#alertBox').text("Cannot bootstrap without the model being fit. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
        return;
    }
    $("#startBootstrap").prop("disabled", true);
    bootstrap.Tooltip.getInstance('#startBootstrap').hide();
    $("#cancelBootstrap").prop("disabled", false);
    $("#progressFooter").show();
    $('body').css('paddingBottom', $('#progressFooter').height() + 20 + 'px');
    $('#bootstrapProgress').text("0%");
    $('#bootstrapProgress').css("width", "0%");
    $('#newFileDiv').hide();
    stopBootstrap = false;
    await requestWakeLock();
    await updateBootstrap(0, 100);
    let response = await startBootstrapWrapper();
    await releaseWakeLock();
    $(document).prop('title', 'Project Based Assessment');
    $("#progressFooter").hide();
    $('body').css('paddingBottom', '0px');
    $('#newFileDiv').show();
    if (!response) {
        $('#alertBox').text("Bootstrap failed. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
        $("#startBootstrap").prop("disabled", false);
        $("#cancelBootstrap").prop("disabled", true);
    }
};

function paintAfterBootstrap(rubricRW, errors) {
    let rubricR = JSON.parse(rubricRW);
    paintRubricTable(rubricR, true);
    if (errors && errors > 0) {
        $('#alertBox').text(errors + " errors were encountered during bootstrap.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
    }
}

function populateColForm(num, text){
    let numList = JSON.parse(num);
    let textList = JSON.parse(text);
    let colList = numList.concat(textList);

    if (colList.length < 4 || numList.length < 2) {
        $('#alertBox').text("The data provided does not have enough columns to estimate a model. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
        return;
    }

    $('#kValueSelect').empty();
    $.each(numList, function () {
        let kSelect = this == 'k' ? true : false;
        $('#kValueSelect').append(new Option(this, this, kSelect, kSelect));
    });
    $('#boundSelect').empty();
    $.each(numList, function () {
        let boundSelect = this == 'bound' ? true : false;
        $('#boundSelect').append(new Option(this, this, boundSelect, boundSelect));
    });
    $('#studentSelect').empty();
    $.each(colList, function () {
        let studentSelect = this == 'student' ? true : false;
        $('#studentSelect').append(new Option(this, this, studentSelect, studentSelect));
    });
    $('#rubricSelect').empty();
    $.each(colList, function () {
        let rubricSelect = this == 'rubric' ? true : false;
        $('#rubricSelect').append(new Option(this, this, rubricSelect, rubricSelect));
    });
    if ($("#modelResults").is(':visible')) {
        let acShown = false;
        $(".accordion-body").each(function (index) {
            acShown = $(this).is(":visible") ? true : acShown;
        });
        if (!acShown) {
            $("#headingOne").find("button").click();
        }
    }
    $('#dataMapping').modal('show');
}

const paintRubricTable = (rubricR, bootstrap = false) => {
    let headerData = bootstrap ? ['Variable', 'Value', 'Average Logistic', 'Average Marginal Logistic', 'Average Discrete Marginal Logistic', 'Confidence Interval', 'P-Value'] : ['Variable', 'Value', 'Average Logistic', 'Average Marginal Logistic', 'Average Discrete Marginal Logistic'];
    $('#rubricHeader').empty();
    for (let header of headerData) {
        let h = document.createElement("th");
        h.setAttribute("scope", "col");
        header == 'P-Value' ? h.textContent = 'p-value' : h.textContent = header;
        $('#rubricHeader').append(h);
    }
    $('#rubricResults').empty();
    for (let row of rubricR) {
        let r = document.createElement("tr");
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
};

function paintAfterEst(rubricRW, studentRW, obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood) {
    $("#startBootstrap").prop("disabled", false);
    let rubricR = JSON.parse(rubricRW);
    let studentR = JSON.parse(studentRW);
    savedRubric = rubricR;
    savedStudent = studentR;
    paintRubricTable(rubricR);
    $('#modelFitResults').empty();
    let paramList = [
        ["Number of Observations", obs],
        ["Number of Parameters", param],
        ["AIC", AIC],
        ["BIC", BIC],
        ["McFadden's R²", McFadden],
        ["LR Statistic", LR],
        ["𝜒² p-value", ChiSquared],
        ["Log Likelihood", LogLikelihood]
    ];
    for (let par of paramList) {
        let m = document.createElement("tr");
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


const saveMapping = async () => {
    let kValue = $('#kValueSelect').val();
    let bound = $('#boundSelect').val();
    let student = $('#studentSelect').val();
    let rubric = $('#rubricSelect').val();
    let data = [kValue, bound, student, rubric];
    $('#dataMapping').modal('hide');
    await requestWakeLock();
    $('#myDropZoneWrapper').hide();
    $('#loadingDiv').show();
    let response = await buildTableWrapper(JSON.stringify(data));
    $('#loadingDiv').hide();
    $('#myDropZoneWrapper').show();
    await releaseWakeLock();
    if (!response) {
        $('#alertBox').text("We were unable to estimate the model. Please try again.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
    }
};

const rebuildGraphs = async (filterdata = [], filterFileName = "group") => {
    if (filterdata.length == 0) {
        $('#clearGroupDiv').hide();
    } else {
        $('#clearGroupDiv').show();
    }
    filterFileName.length > 40 ? filterFileName = filterFileName.substring(0, 37) + "..." : filterFileName = filterFileName;
    savedFilterData = filterdata;
    savedFilterFileName = filterFileName;
    
    let graphdata = buildData(variable = 'Average Logistic', filterList = filterdata, filterFileName = filterFileName);
    buildGraphics(graphdata);
    let ALl1, ALl2;
    [ALl1, ALl2] = getListsFromBD(graphdata);
    buildSumTable(ALl1, ALl2, target = '#StatData', filterFileName = filterFileName);
    
    let graphdataAML = buildData(variable = 'Average Marginal Logistic', filterList = filterdata, filterFileName = filterFileName);
    buildGraphics(graphdataAML, '#studentKDEAML');
    let AMLl1, AMLl2;
    [AMLl1, AMLl2] = getListsFromBD(graphdataAML);
    buildSumTable(AMLl1, AMLl2, target = '#StatDataAML', filterFileName = filterFileName);

    let graphdataDAML = buildData(variable = 'Average Discrete Marginal Logistic', filterList = filterdata, filterFileName = filterFileName);
    buildGraphics(graphdataDAML, '#studentKDEDAML');
    let DAMLl1, DAMLl2;
    [DAMLl1, DAMLl2] = getListsFromBD(graphdataDAML);
    buildSumTable(DAMLl1, DAMLl2, target = '#StatDataDAML', filterFileName = filterFileName);
};

const buildCSVQuote = (text) => {
    return "\"" + text.replace(/"/g, "\"\"") + "\"";
};

const buildCSVStudentData = () => {
    if (savedStudent.length == 0) {
        $('#alertBox').text("Cannot export data. Please estimate the model first.");
        $('#alertBox').show();
        $('#alertBox')[0].scrollIntoView();
        $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
            $("#alertBox").slideUp(1000);
        });
        return;
    }
    let headerData = ['Variable', 'Value', 'Average Logistic', 'Average Marginal Logistic', 'Average Discrete Marginal Logistic'];
    let stream = "";

    for (let head of headerData) {
        stream += buildCSVQuote(head) + ",";
    }
    stream += "\n";
    for (let row of savedStudent) {
        for (let head of headerData) {
            let content = row[head];
            if (Array.isArray(content) && content.length == 2) {
                content = "(" + Number.parseFloat(content[0]).toFixed(3) + ", " + Number.parseFloat(content[1]).toFixed(3) + ")";
            } else if (head == 'Variable') {
                content = content;
            } else {
                content = Number.parseFloat(content).toFixed(3);
            }
            stream += buildCSVQuote(String(content).trim()) + ",";
        }
        stream += "\n";
    }
    return stream;
};

const saveStudentCSV = (filename) => {
    let element = document.createElement("a");
    let text = buildCSVStudentData();
    element.setAttribute("href", "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(text));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

let wakeLock = null;
const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        document.addEventListener("visibilitychange", async () => {
            if (wakeLock !== null && document.visibilityState === "visible" && wakeLock.released) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                } catch (errl) {
                    console.log(`${errl.name}, ${errl.message}`);
                }
            }
        });
    } catch (err) {
        console.log(`${err.name}, ${err.message}`);
    }
};

const releaseWakeLock = async () => {
    if (!wakeLock) {
        return;
    }
    try {
        await wakeLock.release();
        wakeLock = null;
    } catch (err) {
        console.log(`${err.name}, ${err.message}`);
    }
};

const rebuildGraphsAfterResize = () => {
    if (savedStudent.length == 0) {
        return;
    }
    rebuildGraphs(savedFilterData, savedFilterFileName);
};