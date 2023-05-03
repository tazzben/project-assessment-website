Dropzone.options.myDropzone = {
    dictDefaultMessage: "Drag a CSV here.  The CSV should contain columns of rubric scores, student and rubric row identifiers, and the max possible score on a rubric row.",
    maxFilesize: 10,
    acceptedFiles: ".csv",
    accept: function (file, done) {
        var reader = new FileReader();
        reader.addEventListener("loadend", async function (event) {
            $('#alertBox').hide();
            let data = event.target.result;
            passFileData = pyscript.interpreter.globals.get('passFileData')
            passFileData(data);
            let dz = Dropzone.forElement("#my-dropzone");
            dz.removeAllFiles(true);            
        });
        reader.readAsText(file);
    }
};

Dropzone.options.myFilter = {
    dictDefaultMessage: "Drag a CSV here to make a separate group of students in the graphs.",
    maxFilesize: 10,
    acceptedFiles: ".csv",
    accept: function (file, done) {
        var reader = new FileReader();
        reader.addEventListener("loadend", async function (event) {
            let data = event.target.result;
            listdata = pyscript.interpreter.globals.get('getListData')
            let myStudentList = JSON.parse(listdata(data));
            if (myStudentList.length > 0) {
                rebuildGraphs(myStudentList);  
            } else {
                $('#alertBox').show();
                $('#alertBox').text("The CSV file you uploaded does not contain a list of student identifiers.");
                $('#alertBox')[0].scrollIntoView();
                $("#alertBox").fadeTo(2000, 1000).slideUp(1000, function(){
                    $("#alertBox").slideUp(1000);
                });
            }
            let dz = Dropzone.forElement("#my-filter");
            dz.removeAllFiles(true);            
        });
        reader.readAsText(file);
    }
};

function saveSvg(svgEl, name) {
    svgEl.find("svg").attr("xmlns", "http://www.w3.org/2000/svg");
    let svgData = svgEl.html();
    let preface = '<?xml version="1.0" standalone="no"?>\r\n';
    let svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
    let svgUrl = URL.createObjectURL(svgBlob);
    let downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}



$( document ).ready(function() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    $("#saveMapping").click(function () {
        saveMapping();
    });
    $("#closeMapping").click(function () {
        $('#dataMapping').modal('hide');
    });
    $("#closeMappingButton").click(function () {
        $('#dataMapping').modal('hide');
    });
    $("#downloadRubric").click(function () {
        $("#rubricTable").table2csv({filename: 'rubricInformation.csv',});
    });
    $("#downloadFit").click(function () {
        $("#fitTable").table2csv({filename: 'fitInformation.csv',});
    });
    $("#downloadStudentML").click(function () {
        $("#studentStatTable").table2csv({filename: 'studentAverageLogistic.csv',});
    });
    $("#downloadStudentAML").click(function () {
        $("#studentStatTableAML").table2csv({filename: 'studentAverageMarginalLogistic.csv',});    
    });
    $('#downloadStudentImage').click(function () {
        saveSvg($("#studentKDE"), "studentAverageLogistic.svg");
    });
    $('#downloadStudentImageAML').click(function () {
        saveSvg($("#studentKDEAML"), "studentAverageMarginalLogistic.svg");
    });
    $('#startBootstrap').click(function () {
        startBootstrap();
    });
    $('#clearGroups').click(function () {
        rebuildGraphs();
    });
    $('.saveStudentCSV').click(function () {
        saveStudentCSV('StudentEstimates.csv');
    });

    $("#zoomAppointment").click(function () {
        Calendly.initPopupWidget({
          url: 'https://calendly.com/bosmith/software-help?hide_event_type_details=1',
          prefill: {
            customAnswers: {
              a1: 5,
            },
          },
        });
        return false;
    });

});
var calendlyWindow = {};
calendlyWindow.setChangeHash = function () {
  if (window.location.hash.replace("#", "") == "zoom") {
    Calendly.initPopupWidget({
      url: 'https://calendly.com/bosmith/software-help?hide_event_type_details=1',
      prefill: {
        customAnswers: {
          a1: 5,
        },
      },
    });
    if (history.pushState) {
      history.pushState(null, null, '#');
    } else {
      location.hash = '#';
    }
  }
};
if ("onhashchange" in window) {
  window.onhashchange = calendlyWindow.setChangeHash;
}
calendlyWindow.setChangeHash();
