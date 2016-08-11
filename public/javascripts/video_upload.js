window.onload = function() {

    //Check File API support
    if (window.File && window.FileList && window.FileReader) {
        var filesInput2 = document.getElementById(inputtrans.id);
        /* TO ADD NEW DATA SERIES,
         * Copy-paste the line below this comment block,
         * then uncomment it to add more data series.
         * WARNING: Read the instructions on the Wiki first!
         * Replace 'N' in variable name with next number*/
        // var filesInputN = document.getElementById(newDataSeries.id);

        // Read transcript and print result on the same page
        filesInput2.addEventListener("change", function (event) {
            var files = event.target.files; //FileList object
            var output = document.getElementById(outputtrans.id);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var picReader = new FileReader();
                picReader.addEventListener("load", function (event) {
                    var textFile = event.target;
                    console.log(textFile.result.toString());

                    $.ajax({
                        type: "POST",
                        url: "/transcript_file",
                        data: { transcript: textFile.result.toString() }
                    }).done(function (msg) {
                        console.log("Transcript Saved: " + msg);
                    });
                });

                //Read the text file
                picReader.readAsText(file);
                console.log("transcript read!");
            }
        });

        /* TO ADD NEW DATA SERIES
         * Uncomment below code block to add event listener for new data
           series (make a copy of it first).
           Then rename all occurrences of 'newDataSeries' to match the
           variable name from the app.js/vizScribe.js file.
           WARNING! Read Wiki before attempting this!
         */

        /*
        filesInputN.addEventListener("change", function (event) {
            var files = event.target.files; //FileList object
            var output = document.getElementById(newDataSeries.id);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var dataReader = new FileReader();
                dataReader.addEventListener("load", function (event) {
                    var textFile = event.target;
                    console.log("newDataSeries file: " +
                                textFile.result.toString());

                    $.ajax({
                        type: "POST",
                        url: "/newDataSeries_file",
                        data: { newDataSeriesFile:
                                JSON.stringify(textFile.result) }
                    }).done(function (msg) {
                        console.log("newDataSeriesfile Saved: " + msg);
                    });
                });

                dataReader.readAsText(file);
                console.log("newDataSeriesfile read!");
            }
        });
        */
    } else {
        console.log("Your browser does not support File API");
    }
}
