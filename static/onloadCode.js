Dropzone.options.myDropzone = {
    dictDefaultMessage: "Drag a CSV here to get started.  The CSV should contain columns of rubric scores, student and rubric row identifiers, and the max possible score on a rubric row.",
    maxFilesize: 10,
    acceptedFiles: ".csv",
    accept: function (file, done) {
        var reader = new FileReader();
        reader.addEventListener("loadend", function (event) {
            $('#alertBox').hide();
            let data = event.target.result;
            passFileData = pyscript.interpreter.globals.get('passFileData')
            passFileData(data);
            let dz = Dropzone.forElement("#my-dropzone");
            dz.options.dictDefaultMessage = "Drag a different CSV file to reset the analysis.  The CSV should contain columns of rubric scores, student and rubric row identifiers, and the max possible score on a rubric row.";
            dz.removeAllFiles(true);            
        });
        reader.readAsText(file);
    }
};

Dropzone.options.myFilter = {
    dictDefaultMessage: "Drag a CSV here to make a separate group of students in the graph.",
    maxFilesize: 10,
    acceptedFiles: ".csv",
    accept: function (file, done) {
        var reader = new FileReader();
        reader.addEventListener("loadend", function (event) {
            let data = event.target.result;
            listdata = pyscript.interpreter.globals.get('getListData')
            let myStudentList = JSON.parse(listdata(data));
            if (myStudentList.length > 0) {
                rebuildGraphs(myStudentList);  
            } else {
                $('#alertBox').show();
                $('#alertBox').text("The CSV file you uploaded does not contain a list of student identifiers.");
            }
            let dz = Dropzone.forElement("#my-filter");
            dz.removeAllFiles(true);            
        });
        reader.readAsText(file);
    }
};

$("#saveMapping").click(function () {
    saveMapping();
});
$("#closeMapping").click(function () {
    $('#dataMapping').modal('hide');
});
$("#closeMappingButton").click(function () {
    $('#dataMapping').modal('hide');
});
