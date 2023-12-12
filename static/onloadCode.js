Dropzone.options.myDropzone = {
    dictDefaultMessage: "Drag a CSV here.  The CSV should contain columns of rubric scores, student and rubric row identifiers, and the max possible score on a rubric row.",
    maxFilesize: 10,
    maxFiles: 1,
    acceptedFiles: ".csv",
    accept: async (file, _) => {
        let reader = new FileReader();
        reader.addEventListener("loadend", async (event) => {
            $('#alertBox').hide();
            let data = event.target.result;
            await passFileData(data);
            fileNameOfResults = event.target.fileName;
            let dz = Dropzone.forElement("#my-dropzone");
            dz.removeAllFiles(true);
        });
        reader.fileName = file.name.replace(/\.[^/.\s\\]+$/, "");
        reader.readAsText(file);        
    }
};

Dropzone.options.myFilter = {
    dictDefaultMessage: "Drag a CSV here to make a separate group of students in the graphs.",
    maxFilesize: 10,
    maxFiles: 5,
    acceptedFiles: ".csv",
    accept: (file, _) => {
        let reader = new FileReader();
        reader.addEventListener("loadend", async (event) => {
            let dz = Dropzone.forElement("#my-filter");
            let data = event.target.result;
            let myStudentList = JSON.parse(await getListData(data));
            if (myStudentList.length > 0 && savedStudent.length > 0) {
                if (typeof savedStudent[0]['Variable'] != typeof myStudentList[0]) {
                    const convertFunc = typeof savedStudent[0]['Variable'] == 'number' ? Number : String;
                    myStudentList = myStudentList.map(convertFunc);
                }
                let elements = savedStudent.filter(x => myStudentList.includes(x['Variable']));
                if (elements.length > 1) {
                    savedFilterFileNames.push(event.target.fileName);
                    savedFilterData.push(myStudentList);
                } else {
                    showAlertBox("The CSV file you selected does not contain at least two student identifiers included in the estimated model.");
                }
            } else {
                showAlertBox("The CSV file you selected does not contain a list of student identifiers.");
            }
            dz.processedFiles += 1;
            if (dz.processedFiles == dz.numFlies) {
                dz.numFlies = 0;
                dz.processedFiles = 0;
                await rebuildGraphs(savedFilterData, savedFilterFileNames);
                dz.removeAllFiles(true);
            }
        });
        reader.fileName = file.name.replace(/\.[^/.\s\\]+$/, "");
        reader.readAsText(file);
    },
    init: function() {
        let dz = Dropzone.forElement("#my-filter");
        dz.numFlies = 0;
        dz.processedFiles = 0;
        this.on("addedfile", function(_) {
            dz.numFlies += 1;
        });
    }
};

const saveSvg = (svgEl, name) => {
    svgEl.find("svg").attr("xmlns", "http://www.w3.org/2000/svg");
    let svgData = svgEl.html();
    let preface = '<?xml version="1.0" standalone="no"?>\r\n';
    let svgBlob = new Blob([preface, svgData], {
        type: "image/svg+xml;charset=utf-8"
    });
    let svgUrl = URL.createObjectURL(svgBlob);
    let downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

let resizeWindowTimer = null;

$(document).ready(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    $("#saveMapping").click(() => {
        saveMapping();
    });
    $("#closeMapping").click(() => {
        $('#dataMapping').modal('hide');
    });
    $("#closeMappingButton").click(() => {
        $('#dataMapping').modal('hide');
    });
    $("#downloadRubric").click(() => {
        $("#rubricTable").table2csv({
            filename: 'rubricInformation.csv',
        });
    });
    $("#downloadFit").click(() => {
        $("#fitTable").table2csv({
            filename: 'fitInformation.csv',
        });
    });
    $("#downloadStudentML").click(() => {
        $("#studentStatTable").table2csv({
            filename: 'studentAverageLogistic.csv',
        });
    });
    $("#downloadStudentAML").click(() => {
        $("#studentStatTableAML").table2csv({
            filename: 'studentAverageMarginalLogistic.csv',
        });
    });
    $("#downloadStudentDAML").click(() => {
        $("#studentStatTableDAML").table2csv({
            filename: 'studentAverageDiscreteMarginalLogistic.csv',
        });
    });
    $('#downloadStudentImage').click(() => {
        saveSvg($("#studentKDE"), "studentAverageLogistic.svg");
    });
    $('#downloadStudentImageAML').click(() => {
        saveSvg($("#studentKDEAML"), "studentAverageMarginalLogistic.svg");
    });
    $('#downloadStudentImageDAML').click(() => {
        saveSvg($("#studentKDEDAML"), "studentAverageDiscreteMarginalLogistic.svg");
    });
    $('#startBootstrap').click(() => {
        startBootstrap();
    });
    $('#clearGroups').click(() => {
        rebuildGraphs();
    });
    $('.saveStudentCSV').click(() => {
        saveStudentCSV('StudentEstimates.csv');
    });
    $('#cancelBootstrap').click(() => {
        cancelBootstrap();
    });
    $('#printSheet').click(() => {
        window.print();
    });
    $('#closeAlert').click(() => {
        $('#alertBox').modal('hide');
    });

    $(window).on("resize", () => {
        clearTimeout(resizeWindowTimer);
        resizeWindowTimer = setTimeout(rebuildGraphsAfterResize, 1000);
    });

    $(window).on("beforeprint", () => {
        chartWidths.widthMin = chartWidths.printWidthMin;
        chartWidths.widthMax = chartWidths.printWidthMax;
        rebuildGraphsAfterResize();
    });

    $(window).on("afterprint", () => {
        chartWidths.widthMin = chartWidths.defaultWidthMin;
        chartWidths.widthMax = chartWidths.defaultWidthMax;
        rebuildGraphsAfterResize();
    });
    
    if (navigator.userAgent.toLowerCase().includes('firefox')){
        $('#firefoxDiv').show();
    }
});

window.addEventListener("py:all-done", async (event) => {
    $('#loadingDiv').hide();
    $('#myDropZoneWrapper').show();
    showErrorMessage();
    let r = await checkCommSystem();
    if (!r) {
        showErrorMessage();
    }
});