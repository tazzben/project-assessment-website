Dropzone.options.myDropzone = {
    dictDefaultMessage: "Drag a CSV here.  The CSV should contain columns of rubric scores, student and rubric row identifiers, and the max possible score on a rubric row.",
    maxFilesize: 10,
    maxFiles: 1,
    acceptedFiles: ".csv",
    accept: async (file, done) => {
        let reader = new FileReader();
        reader.addEventListener("loadend", async (event) => {
            $('#alertBox').hide();
            let data = event.target.result;
            await passFileData(data);
            let dz = Dropzone.forElement("#my-dropzone");
            dz.removeAllFiles(true);
        });
        let filename = file.name.replace(/\.[^/.]+$/, "");
        $('#printTitleFile').text(` - ${filename}`);
        reader.readAsText(file);
    }
};

Dropzone.options.myFilter = {
    dictDefaultMessage: "Drag a CSV here to make a separate group of students in the graphs.",
    maxFilesize: 10,
    maxFiles: 1,
    acceptedFiles: ".csv",
    accept: (file, done) => {
        let reader = new FileReader();
        reader.addEventListener("loadend", async (event) => {
            let data = event.target.result;
            let myStudentList = JSON.parse(await getListData(data));
            if (myStudentList.length > 0) {
                rebuildGraphs(myStudentList);
            } else {
                $('#alertBox').show();
                $('#alertBox').text("The CSV file you uploaded does not contain a list of student identifiers.");
                $('#alertBox')[0].scrollIntoView();
                $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
                    $("#alertBox").slideUp(1000);
                });
            }
            let dz = Dropzone.forElement("#my-filter");
            dz.removeAllFiles(true);
        });
        reader.readAsText(file);
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

    $(window).on("resize", () => {
        clearTimeout(resizeWindowTimer);
        resizeWindowTimer = setTimeout(rebuildGraphsAfterResize, 1000);
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