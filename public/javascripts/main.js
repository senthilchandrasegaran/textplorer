// VizScribe: A visual analytics tool for protocol analysis
//    Code by: Senthil Chandrasegaran
//             Sriram Karthik Badam

// Global variables
var wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g;
var w = 960,
    h = 600;

var words = [],
    max,
    scale = 1,
    complete = 0,
    keyword = "",
    tags,
    fontSize,
    maxLength = 30,
    numLines = 0;
    // statusText = d3.select("#status");

var transcript = [];
var lowerCaseLines = [];
var tagsToRemove = []; // list of words the user removes from taglist
var displayLines = [];
var tempspan = '';
var spanArray = [];
var captionArray = [];
var protocolArray = [];
var protocolList = [];
var protocolObject = {};
var oldProtocolObject = {};
var selectedText = '';
var spanCollection = [];
var orgSpanCollection = [];
var transGraphData = []; // data structure for transGraph display
var prevClickedTag = "";
var isTagClicked = false;
var videoLenSec;
var clickLog = [];
var sendClickData = {};
var cTime =  new Date();

// this set of variables for path viewer
var timeStamps = [];
var timeStampSec = [];
var operations = [];
var users = [];
var sketchNum = [];
var logData = [];
var commitLog = [];
var selectedIndices = [];

// list of colors used
var oldHighlighting = "rgba(220, 138, 12, 0.4)";
var greenHighlight = "rgba(232, 138, 12, 1)";

var transGraphColor = "rgba(123, 123, 123, 0.2)";
var boldHighlightColor = "rgba(255, 127, 0, 0.8)";
var mildHighlightColor = "rgba(255, 127, 0, 0.8)";
var wordCloudColor = "rgba(10, 100, 70, 0.7)";
var shadowGrey = "rgba(123,123,123,0.7)";

// div values
var bottomLeftHeight = 0;
var sketchesHeight = 0;
var speechLogHeight = 0;
var activityLogHeight = 0;
var protocolGraphHeight = 0;

/* TO ADD NEW DATASET
 * Make a copy of the below line of code,
 * Uncomment it, and change `newDataSeriesHeight' to
 * a more meaningful name consistent with the other files
 * IMPORTANT: See the Wiki for details now how to do this properly!
 */
// var newDataSeriesHeight = 0;

// Options to control visualizations
var highlightIC = true;   // control whether or not to highlight
                          // transcript based on information content.
var speakerDiff = 0;


// colors for each speaker in the data. Add to this list if speakers > 4
var speakerColors = [
        "#a6cee3",
        "#fb9a99",
        "#b2df8a",
        "#bc80bd"
    ];



// Color list to use for code definitions
// Note: the color list below is instantiated in reverse order in the
// interface.
var colorlistFull = [
        'rgba(177,89,40,',
        'rgba(106,61,154,',
        'rgba(202,178,214,',
        'rgba(253,191,111,',
        'rgba(227,26,28,',
        'rgba(251,154,153,',
        'rgba(51,160,44,',
        'rgba(178,223,138,',
        'rgba(31,120,180,',
        'rgba(166,206,227,',
        'rgba(177,89,40,',      // color list duplicates from here on.
        'rgba(106,61,154,',
        'rgba(202,178,214,',
        'rgba(253,191,111,',
        'rgba(227,26,28,',
        'rgba(251,154,153,',
        'rgba(51,160,44,',
        'rgba(178,223,138,',
        'rgba(31,120,180,',
        'rgba(166,206,227,',
        'rgba(177,89,40,',
        'rgba(106,61,154,',
        'rgba(202,178,214,',
        'rgba(253,191,111,',
        'rgba(227,26,28,',
        'rgba(251,154,153,',
        'rgba(51,160,44,',
        'rgba(178,223,138,',
        'rgba(31,120,180,',
        'rgba(166,206,227,'
    ];

var sketchPathColor = "rgba(225, 120, 0, 0.2)";

// When a new protocol is added
var getColor = function () {
    return colorlistFull.pop();
};

// When the protocol is deleted!
var pushColor = function (color) {
    colorlistFull.push(color);
};

// Function to traverse the user-entered protocol (codes) in order to
// create an indented tree with corresponding colors
var depthFirstTraversalProtocolTree = function () {
    var sortedList = [];
    var protocolNames = Object.keys(protocolObject);
    for (var i = 0; i < protocolNames.length; i++) {
        var protocolName = protocolNames[i];
        var level = protocolObject[protocolNames[i]].level;
        var parentName = protocolObject[protocolNames[i]].parentName;
        var deleted = protocolObject[protocolNames[i]].deleted;
        if (level == 1 && !deleted) {
            var childrenList = [];
            protocolObject[protocolName].hasChildren =
              preOrderTraversal(protocolName,
                                childrenList,
                                protocolNames);
            sortedList.push(protocolName);
            if (childrenList.length > 0)
                sortedList = sortedList.concat(childrenList);
        }
    }
    return sortedList;
}

// Function to recursively go through a tree's children until none are
// left
function preOrderTraversal(protocolName, childrenList, protocolNames) {
    var hasChildren = false;
    for (var i = 0; i < protocolNames.length; i++) {
        var tempProtocolName = protocolNames[i];
        var parentName = protocolObject[tempProtocolName].parentName;
        var deleted = protocolObject[tempProtocolName].deleted;

        if (parentName == protocolName && !deleted) {
            childrenList.push(tempProtocolName);
            protocolObject[tempProtocolName].hasChildren =
              preOrderTraversal(tempProtocolName,
                                childrenList,
                                protocolNames);
            hasChildren = true;
        }
    }
    return hasChildren;
}



// The hmsToSec function takes a "hh:mm:ss", or "mm:ss" or just an "ss"
// string and converts it to seconds. Returns a number.
function hmsToSec(hms){
  var timeArray = hms.split(":");
  var tindex = timeArray.length - 1;
  var seconds = 0;
  for (timeSeg in timeArray) {
    seconds += timeArray[timeSeg] * Math.pow(60, tindex);
    tindex -= 1;
  }
  return seconds;
}

// Code credits for below function (getIndicesOf):
//http://stackoverflow.com/questions/3410464/how-to-find-all-occurrences-of-one-string-in-another-in-javascript
function getIndicesOf(searchStr, str, caseSensitive) {
    var startIndex = 0, searchStrLen = searchStr.length;
    var index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}


// Function to generate a text concordance view in the form of an html
// table
function concordance(word) {
    //take the captionArray and put in one string
    var allCaptions = "";
    var window = 60;
    captionArray.forEach(function (caption) {
        allCaptions += caption[3] + " ";
    });

    //now search of the index (indices) of the word in the allCaptions
    var indices = getIndicesOf(word, allCaptions, false);

    //Array of the concordances
    var concordances = ["<table id='concTable'>"];

    for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        var left = index - window < 0 ? 0 : index - window;
        var right = index + window + word.length >
                    allCaptions.length-1 ?
                    allCaptions.length-1 : index + window + word.length;
        concordances.push("<tr>" +
                          "<td align='right'>" +
                          allCaptions.substring(left, index - 1) +
                          "</td>" +
                          "<td width=10px></td>" +
                          "<td align='center'><b>" +
                          allCaptions.substring(index,
                                                index+word.length-1) +
                          " </b></td>" +
                          "<td width=10px></td>" +
                          "<td align='left'>" +
                          allCaptions.substring(index + word.length,
                                                right) +
                          "</td>" +
                          "</tr>");
    }
    concordances.push("</table>")
    return concordances;
}

// Function to handle tabs on protocol view div
// this is called when document is loaded
$(function(){
  $('ul.tabs li:first').addClass('active');
  $('.block article').hide();
  $('.block article:first').show();
  $('ul.tabs li').on('click',function(){
    $('ul.tabs li').removeClass('active');
    $(this).addClass('active')
    $('.block article').hide();
    var activeTab = $(this).find('a').attr('href');
    $(activeTab).show();
    return false;
  });
})

// This function allows selection of transcript file (a CSV file) and
// displays it on the left bottom pane in the browser. Stop words are
// removed and the resulting tags are scaled by frequency and showed on
// the right pane.
window.onload = function () {
  // determine div heights as specified in the html file
  bottomLeftHeight = $("#bottomleft").height();
  sketchesHeight = $("#sketches").height();
  transGraphWidth = $("#transGraph").width();
  sketchLogHeight = $("#sketchLog").height();
  speechLogHeight = $("#speechLog").height();
  activityLogHeight = $("#activityLog").height();
  protocolGraphHeight = $("#protocolGraph").height();

  /* TO ADD NEW DATASET
   * Make a copy of the below line of code,
   * Uncomment it, and change `newDataSeries' and `newDataSeriesHeight'
   * to a more meaningful name consistent with the other files
   * IMPORTANT: See the Wiki for details now how to do this properly!
   */
  // newDataSeriesHeight = $("#newDataSeries").height();

  // var player = videojs('discussion-video');
  // player.on('loadedmetadata', function () {
    var transcriptFile;
    var fileTemp = $.ajax({
      type: "GET", // can remove this to avoid confusion
      url: "/receive_transcript_file", // change to send_trn_fil
      // note: "send" from POV of client
      dataType: "text"
    }).done(function (data) {
      captionArray = $.csv.toArrays(data);
      // remove the first line, since it's the data header.
      captionArray.splice(0,1);
      var longestLineLength = 0; // num words in the longest line
      for (var i in captionArray) {
        if ((captionArray[i].length > 1) &&
            (captionArray[i][0].toLowerCase() !== "start time")) {
          var tempLine = captionArray[i][3];
          var words = captionArray[i][3].split(wordSeparators);
          if (words.length > longestLineLength) {
            longestLineLength = words.length;
          }
          var lowerCaseWords = captionArray[i][3]
                                 .toLowerCase()
                                 .split(wordSeparators);
          lowerCaseLines.push(lowerCaseWords);
          for (var k in words) {
            tempspan += '<span id="line' + i + 'word' + k + '">' +
                        words[k] + ' </span>';
            spanArray.push([i, k, words[k].toLowerCase()]);
          }
          var labelColor = "";
          if ((captionArray[i][2] !== "F1" &&
               captionArray[i][2] !== "F2" &&
               captionArray[i][2] !== "F3" &&
               captionArray[i][2] !== "F4") ||
              (speakerDiff === 0)){
            labelColor = "#c0c0c0";
          } else {
            labelColor = speakerColors[parseInt(captionArray[i][2]
                                                  .split("F")[1])-1];

          }

          displayLines.push(
             '<tr id="row' +i+ '">' +
             '<td style="border: 1px solid' + labelColor + '; '+
             'border-right: 7px solid' + labelColor + '; '+
             'color: rgba(100, 100, 100, 1); ' +
             'font-family:sans-serif; font-size:7pt;"'+
             'class="unselectable" id="speaker'+i+'">' +
              captionArray[i][2] +
             '</td>' +
             '<td id="line'+ i + '">' +
              tempspan + '</td></tr>')
          tempspan = "";
        }
      }
      for (var j in displayLines) {
        $("#transTable").append(displayLines[j]);
      }
      numLines = displayLines.length;

      // This jQuery code below makes the transcript text
      // annotable using the annotator library.  The setupPlugins
      // sets up annotator in the 'default' mode.
      jQuery(function ($) {
        $('#transContent').height($('#center').height()-70);
        // the above line was added because the annotator-wrapper div
        // seems to be overwriting the transContent height settings.
      });

      // player.ready(function () {
        // representation of lines in transcript overall window
        d3.select("#transGraphContent").selectAll("svg").remove();
        var w = $('#transGraphContent').width()-0;
        //because of the border
        var docLength = hmsToSec(captionArray[captionArray.length-1][0]);
        videoLenSec = docLength;
        var h = $('#transGraphContent').height()-0;
        //because of the border
        var transSvg = d3.select("#transGraphContent").append("svg")
                         .attr("width", w)
                         .attr("height", h);
                         //.style({"border" : "1px solid #d0d0d0"});
        var speakerList_hardcode = ["F1", "F2", "F3", "F4"]
        var transcriptScale = d3.scale.linear()
                            .domain([0, docLength])
                            .range([0, h]);
        var transScaleX = d3.scale.linear()
                            .domain([0, speakerList_hardcode.length])
                            .range([0, w]);
        var transGraphPadding = 0;
        var scaleHeights = 0;
        var constantHeight = 0;
        var maxTranLine = 0

        // to normalize the widths of the lines of text, need to find
        // the maximum length
        for (i=0; i<lowerCaseLines.length;i++){
          if (maxTranLine < lowerCaseLines[i].length){
            maxTranLine = lowerCaseLines[i].length;
          }
        }

        for (i=0; i < captionArray.length; i++){
          var d = {};
          var ySec = hmsToSec(captionArray[i][0]);
          d.timeStamp = ySec;
          var yloc = transcriptScale(ySec);
          d.y = yloc;
          d.speaker = captionArray[i][2];
          if (speakerDiff === 0){
            d.x = 0;
            d.fillColor = transGraphColor;
            d.width = lowerCaseLines[i].length/maxTranLine * w;
            // d.width = w;
          } else {
            var speakerIndex = speakerList_hardcode
                                  .indexOf(captionArray[i][2]);
            if (speakerIndex === -1){
              // uncomment the below to show other speakers as well
              // (apart from the participants)
              /*
              d.y = transScaleY(speakerList_hardcode.length - 5);
              d.fillColor = transGraphColor;
              d.height = transScaleY(0.9);
              */
            } else {
              d.x = transScaleX(speakerList_hardcode.length -
                                speakerIndex - 1);
              d.fillColor = speakerColors[speakerIndex];
              d.width = transScaleX(0.9);
            }
          }
          if (constantHeight !== 0){
            d.height = 5;
          } else {
            var endSec = hmsToSec(captionArray[i][1]);
            d.endTime = endSec;
            var startSec = hmsToSec(captionArray[i][0]);
            var scaledHeight = transcriptScale(endSec - startSec);
            if (scaledHeight < 2){
              d.height = 2;
            } else {
              d.width = scaledHeight;
            };
          }
          d.dialog = captionArray[i][3];
          transGraphData.push(d);
        }

        var tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([0, 10])
                    .direction('e');
        transSvg.call(tip);
        var rects = transSvg.selectAll("rect")
                 .data(transGraphData)
                 .enter()
                 .append("rect")
                 .attr("x", function (d) { return d.x; })
                 .attr("y", function (d) { return d.y; })
                 .attr("width", function (d) {
                   return d.width;
                 })
                 .attr("z", 1)
                 .attr("height", function (d) { return d.height; })
                 .attr("fill", function (d) {
                     return d.fillColor;
                 })
                 .attr("fill-opacity", 0.8)
                 .on("mouseover", function(d){
                   tip.html("<font size=2 color='" + d.fillColor +
                            "'>" + d.speaker + ":  </font>" +
                            d.dialog).show();
                   d3.select(this).attr("height", 5);
                   if (prevClickedTag === ""){
                     d3.select(this).attr('fill', greenHighlight);
                   }
                   d3.select(this).attr('fill-opacity', 1);
                 })
                 .on("mouseout", function(d){
                   tip.hide();
                   d3.select(this).attr("height", d.height);
                   if (prevClickedTag === ""){
                     d3.select(this).attr('fill', d.fillColor);
                   }
                   d3.select(this).attr('fill-opacity', 0.8);
                 });
        // end representation of lines
      // }); // end player.ready()

      $("#tagList").empty()
      $("#tagList").css("background-color", "#ffffff");
      // $("#tagList").append(tagspans);
      $("#tagList").append(makeWordList(lowerCaseLines));

      // Remove tag on right click
      var tagListDOM = $('#tagList');
      tagListDOM.oncontextmenu = function () { return false; }
      tagListDOM.on('mousedown', 'text', function (e) {
        if (e.button == 2) {
          var isRemoveTag = confirm("Remove tag: " +
                              $(this).text() +
                              " from list?");
          if (isRemoveTag == true) {
            var tagToRemove = $(this).text();
            tagsToRemove.push(tagToRemove);
            $("#tagList").empty();
            $("#tagList").css("background-color", "#ffffff");
            $("#tagList").append(makeWordList(lowerCaseLines,
                                              tagsToRemove));
            // Finally remove all highlights from transcript
            $("#transTable").find("td").removeClass('hoverHighlight');
            $("#transTable").find("span").removeClass('boldText');
          }
        }
      }); // end function for remove tag on rightclick

      //----------------------------------------------------------
      // light highlighting on mouse enter
      //----------------------------------------------------------
      var tagHoverText = "";
      tagListDOM.on('mouseenter', 'text', function () {
        $(this).addClass('hoverHighlight');
        tagHoverText = $.trim($(this).text());
        // use regular expression to match the whole word only
        var regex = new RegExp("\\b" + tagHoverText + "\\b");
        var transFilter = $("#transTable").find("span:containsNC('" +
                                tagHoverText + "')");
        var transItems = transFilter.filter(function(){
                return (this.textContent).toLowerCase().match(regex);
              }).parents("td");
        transItems.addClass('hoverHighlight');

        //----------------------------------------------
        // Highlight corresponding items in transGraph
        //----------------------------------------------
        var transItemIds = [];
        var hiRects = $("#transGraphContent svg").children('rect');
        if (isTagClicked){
          // do nothing to the transGraph on mouseenter if a word in the
          // tag cloud is already clicked.
        } else {
          hiRects.attr("fill", transGraphColor);
          transItems.each(function (index, value) {
            var idIndex = value.parentNode.rowIndex;
            transItemIds.push(idIndex);
            // change color of vertical text rep bars
            d3.select(hiRects[idIndex])
              .attr("fill", oldHighlighting);
            var numLines = hiRects.length;
          });
        }
        var timeSegArray = [];
        //load corresponding times of highlighted ul items in a list
        var ind = 0;
        for (ind in transItemIds) {
          var numInd = transItemIds[ind];
          var startTime = hmsToSec(captionArray[numInd][0]);
          var duration = hmsToSec(captionArray[numInd][1]) -
                      startTime;
          timeSegArray.push([startTime, duration]);
        }
      });

      //---------------------------------------------------------------
      // remove light highlighting on mouse leave
      //---------------------------------------------------------------
      tagListDOM.on('mouseleave', 'text', function () {
        $(this).removeClass('hoverHighlight');
        $("#transTable").find("td").removeClass('hoverHighlight');
        if (isTagClicked){
          // do nothing to the transGraph on mouseleave if a word in the
          // tag cloud is already clicked.
        } else {
          $(".boldText").removeClass('boldText');
          d3.select("#transGraphContent").selectAll("svg")
            .selectAll("rect")
            .data(transGraphData)
            .each(function(d){
              d3.select(this).attr("fill", d.fillColor);
            });
        }
      });

      //---------------------------------------------------------------
      // dark highlighting on mouse click
      //---------------------------------------------------------------
      tagListDOM.on('click', 'text', function (e) {
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                         cTime.getMinutes() + ":" +
                         cTime.getSeconds();
          clickLog.push([tempTime, "tagList\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
          // KB edits ----
          if (e.ctrlKey || e.metaKey) {
              document.getElementById('concordance-view')
                      .style.visibility = 'visible';
              //get concordance
              var word = $(this).text();
              var allConcordances = concordance(word);
              $('#concordance-view-content').children().remove();
              //now add it to the interface
              allConcordances.forEach(function (eachConcordance) {
                  $('#concordance-view-content')
                    .append(eachConcordance + "<br/>");
              });
          } else {
            tagHoverText = $.trim($(this).text());
            // check if the tag was already clicked
            if (prevClickedTag !== tagHoverText) {
              $(this).parent().children('text')
                      .removeClass('tagClickHighlight');
              $(this).addClass('tagClickHighlight');
              prevClickedTag = tagHoverText;
              isTagClicked = true;
              $('.textClickHighlight')
                  .removeClass('textClickHighlight');
              $('.boldClickText')
                  .removeClass('boldClickText');
              var transFilter =
                $("#transTable").find("span:containsNC('" +
                                      tagHoverText + "')");
              var regex = new RegExp("\\b" + tagHoverText + "\\b");
              var transItems = transFilter .filter(function(){
                  return (this.textContent).toLowerCase().match(regex);
                }).closest("td");
              transItems.addClass('textClickHighlight');
              transFilter.filter(function(){
                  return (this.textContent).toLowerCase().match(regex);
                }).addClass('boldText');
              //----------------------------------------------
              // add bars of highlighted bits next to seekbar
              //----------------------------------------------
              var transItemIds = []
              transItems.each(function (index, value) {
                  var idIndex = value.parentNode.rowIndex;
                  transItemIds.push(idIndex);
                  // change color of vertical text rep bars
                  var hiRects = $("#transGraphContent svg")
                            .children('rect');
                  d3.select(hiRects[idIndex])
                    .attr("fill", boldHighlightColor);
              })
              var timeSegArray = [];
              //load corresponding times of highlighted li items in a
              //list
              var ind = 0;
              for (ind in transItemIds) {
                  var numInd = transItemIds[ind];
                  var startTime = hmsToSec(captionArray[numInd][0]);
                  var duration = hmsToSec(captionArray[numInd][1]) -
                           startTime;
                  timeSegArray.push([startTime, duration]);
              }
            } else {
              prevClickedTag = "";
              isTagClicked = false;
              // if the same tag is clicked again, remove highlighting.
              $(this).parent().children('text')
                     .removeClass('tagClickHighlight');
              $("#transTable").find("td")
                              .removeClass('textClickHighlight');
              $(".boldClickText").removeClass('boldClickText');
              d3.select("#transGraphContent").selectAll("svg")
                .selectAll("rect")
                .data(transGraphData)
                .each(function(d){
                  d3.select(this).attr("fill", d.fillColor);
                });
            }
          }
      });


      //----------------------------------------------------------
      // Video seeking Code
      //----------------------------------------------------------
      var videoDuration = 0
      // player.ready(function () {
      $('#transTable').on('click', 'tr', function (e) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          var captionIndex = this.rowIndex;
          var captionStartTimeMin = captionArray[captionIndex][0];
          captionStartTimeSec = hmsToSec(captionStartTimeMin);
          // player.currentTime(captionStartTimeSec);
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "transcript",
                        captionStartTimeSec + "\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) {});
        }
      });
      // });
      //----------------------------------------------------------
      // End of Video seeking Code
      //----------------------------------------------------------

      //---------------------------------------------------------------
      // highlighting on mouseover for transcript
      //---------------------------------------------------------------

      // Add highlighting on mouseenter
      $('#transTable').on('mouseenter', 'tr', function () {
          $(this).children().last().addClass('transHighlight');
          //----------------------------------------------
          // add bars of highlighted bits next to seekbar
          //----------------------------------------------
          var transItemIds = []
          var idIndex = this.rowIndex;
          transItemIds.push(idIndex);
          // change color of vertical text rep bars
          var hiRects = $("#transGraphContent svg")
                          .children('rect');
          d3.select(hiRects[idIndex])
            .classed("transRectHighLight", true);
          // .attr("fill", mildHighlightColor);
          var timeSegArray = [];
          //load corresponding times of highlighted li items in a list
          var ind = 0;
          for (ind in transItemIds) {
              var numInd = transItemIds[ind];
              var startTime = hmsToSec(captionArray[numInd][0]);
              var duration = hmsToSec(captionArray[numInd][1]) -
                           startTime;
              timeSegArray.push([startTime, duration]);
          }
      });

      // remove highlighting on mouse leave
      $('#transTable').on('mouseleave', 'tr', function () {
          $(this).children().removeClass('transHighlight');
          d3.select("#transGraphContent").selectAll("svg")
            .classed("transRectHighLight", false);
      });

      //---------------------------------------------------------------
      // end of highlighting on mouseover for transcript
      //---------------------------------------------------------------

      // Allow interaction with seesoft-like visualization
      $('#transGraphContent').find('svg').first()
                      .on('mouseenter', 'rect', function () {
          // implementing fisheye distortion
          var localDistort = 1;
          if (localDistort != 0){
            var fisheyesvg = d3.select("#transGraphContent")
                               .selectAll("svg");
            var frects = fisheyesvg.selectAll("rect");
            var fisheye = d3.fisheye.circular()
                            .radius(50);
            fisheyesvg.on("mousemove", function(){
              fisheye.focus(d3.mouse(this));
              frects.each(function(d){
                        d.fisheye = fisheye(d);
                     })
                     .attr("y", function (d) {
                       return d.fisheye.y;
                     });
            });
          }
          // $(this).attr("fill", greenHighlight);
          $(this).attr("z", 50);
          var transGraphIndex = $('#transGraphContent svg')
                            .children('rect').index(this);

          // light highlighting of transcript
          // videoDuration = player.duration();
          var transItem = $('#transTable tr').eq(transGraphIndex)
                                             .children().last();
          transItem.addClass('hoverHighlight');
          // note: 'eq' returns jquery object at index.
          // For DOM object at index use 'get'
      }); // end of transGraph onmouseenter function.

      $('#transGraphContent').on('mouseleave', 'svg rect', function () {
          // $(this).attr("fill", transGraphColor);
          $(this).attr("z", 1);

          // remove light highlighting on mouse leave
          $("#transTable").find("td").removeClass('hoverHighlight');
      }); // end of transGraph onmouseleave function

      // var player = videojs('discussion-video');
      var videoDuration = 0
      // player.ready(function () {
        d3.select('#transGraphContent')
          .selectAll('svg')
          .selectAll('rect')
          .on('click', function (d) {
          if (d3.event.ctrlKey || d3.event.metaKey){
            cTime =  new Date();
            var tempTime = cTime.getHours() + ":" +
                          cTime.getMinutes() + ":" +
                          cTime.getSeconds();
            clickLog.push([tempTime, "transGraphWordCloud\n"]);
            sendClickData.data = clickLog;
            $.post("/clicklog", sendClickData, function (data, error) { });
            // if a speaker's transcript timeline is ctrl-clicked,
            // show a word cloud based on only that speaker's utterances
            var lineCollection = [];
              // select all coded objects by code ID
              var sameSpeakerObjs = $.grep(transGraphData, function(e){
                return e.speaker == d.speaker;
              });
              var speakerID = sameSpeakerObjs[0].speaker;
              // color all spans in these objects persistently
              for (var ind=0; ind<sameSpeakerObjs.length; ind++){
                var currentObj = sameSpeakerObjs[ind];
                var speakerWords = currentObj
                                    .dialog
                                    .toLowerCase()
                                    .split(wordSeparators);
                lineCollection.push(speakerWords);
                // exempt these rectangles from mouseover,
                // mouseout events.
                currentObj.clickStatus = 1;
              }
              // change the background of the taglist to reflect the
              // speaker color, so that the user gets the context.
              $("#tagList").empty();
              $("#tagList").append(makeWordList(lineCollection,
                                                tagsToRemove));
              $("#tagList").css("background-color",
                    speakerColors[parseInt(speakerID.split("F")[1])-1]);
          } else {
            var transGraphIndex = $('#transGraphContent svg')
                                    .children('rect')
                                    .index(this);
            var captionStartTimeMin = captionArray[transGraphIndex][0]
            captionStartTimeSec = hmsToSec(captionStartTimeMin);
            // player.currentTime(captionStartTimeSec);
            cTime =  new Date();
            var tempTime = cTime.getHours() + ":" +
                          cTime.getMinutes() + ":" +
                          cTime.getSeconds();
            clickLog.push([tempTime, "transGraph",
                          captionStartTimeSec + "\n"]);
            sendClickData.data = clickLog;
            $.post("/clicklog", sendClickData,
                   function (data, error) { });
            var transClickItem = $('#transTable tr').eq(transGraphIndex)
                                                    .children().last();
            transClickItem.addClass('hoverHighlight');
            // this small snippet below to scroll the transcript to show
            // the line corresponding to the item selected in transgraph
            if (transGraphIndex > 10){
              scrollIndex = transGraphIndex-10;
            } else {
              scrollIndex = 0;
            }
            var transScrollItem = $('#transTable tr')
                                      .eq(scrollIndex)
                                      .children().last();
            $('#transContent').scrollTo($(transScrollItem),
                                        {duration: 'slow',
                                        transition: 'ease-in-out'});
          }
        });
      // }); player ready function

      // toggle the size of the transGraph div
      toggleMinMax("transGraphTitle", "transGraph", "Graphical View of Transcript", transGraphWidth);

      // toggle the size of the sketchLog div
      // toggleMinMax("sketchLogTitle", "sketchLog", "Sketch Participation Chart", sketchLogHeight);

      // toggle the size of the speechLog div
      // toggleMinMax("speechLogTitle", "speechLog", "Speech Participation Chart", speechLogHeight);

      // toggle the size of the activityLog div
      // toggleMinMax("activityLogTitle", "activityLog", "Activity Level Chart", activityLogHeight);

      /* TO ADD NEW DATASET
       * Make a copy of the below line of code,
       * Uncomment it, and change `newDataSeries' and
       * `newDataSeriesHeight' to a more meaningful name consistent with
       * the other files
       * IMPORTANT: See the Wiki for details now how to do this
       * properly!
       */
      // toggleMinMax("newDataSeriesTitle", "newDataSeries",
      //              "newDataseries Chart", newDataSeriesHeight);

      // show Video Progress on the sketch and Protocol Divs
      // var vidPlayer = videojs("discussion-video");
      /*
      vidPlayer.ready(function () {
          // this is for the transcript graph div
          var $transGraphScrubberProgress = $("#transGraphScrubber");
          var trOffsetMargin = $("#transGraph").height() +
                           parseFloat(
                             $("#transGraph").css("border-top-width")
                                            .split("px")[0])+
                           parseFloat(
                             $("#transGraph").css("border-bottom-width")
                                          .split("px")[0]);
          $transGraphScrubberProgress.css({"margin-top":
                                          0-trOffsetMargin});
          // this is for the new sketch div
          var $sketchLogScrubberProgress = $("#sketchLogScrubber");
          var skOffsetMargin = $("#sketchLog").height() +
                           parseFloat(
                             $("#sketchLog").css("border-top-width")
                                            .split("px")[0])+
                           parseFloat(
                             $("#sketchLog").css("border-bottom-width")
                                          .split("px")[0]);
          $sketchLogScrubberProgress.css({"margin-top":
                                          0-skOffsetMargin});
          // scrubber for speech div
          var $speechLogScrubberProgress = $("#speechLogScrubber");
          var spOffsetMargin = $("#speechLog").height() +
                           parseFloat(
                             $("#speechLog").css("border-top-width")
                                            .split("px")[0])+
                           parseFloat(
                             $("#speechLog").css("border-bottom-width")
                                          .split("px")[0]);
          $speechLogScrubberProgress.css({"margin-top":
                                          0-spOffsetMargin});
          // scrubber for activity div
          var $activityLogScrubberProgress = $("#activityLogScrubber");
          actOffsetMargin = $("#activityLog").height() +
                           parseFloat(
                             $("#activityLog").css("border-top-width")
                                              .split("px")[0])+
                           parseFloat(
                             $("#activityLog").css("border-bottom-width")
                                              .split("px")[0]);
          $activityLogScrubberProgress.css({"margin-top":
                                            0-actOffsetMargin});

          var $protocolScrubberProgress = $("#protocolGraphScrubber");
          protocolOffsetMargin = $("#protocolGraph").height() +
                           parseFloat( $("#protocolGraph")
                                          .css("border-top-width")
                                          .split("px")[0])+
                           parseFloat( $("#protocolGraph")
                                          .css("border-bottom-width")
                                          .split("px")[0]);
          $protocolScrubberProgress.css({"margin-top":
                                            0-protocolOffsetMargin});

          /* TO ADD NEW DATASET
           * Make a copy of the below block of code,
           * Uncomment it, and change all variable that contain the text
           * `newDataSeries' to a more meaningful name consistent with
           * the other files
           * IMPORTANT: See the Wiki for details now how to do this
           * properly!
           */
          /*
          var $newDataSeriesScrubberProgress = $("#newDataSeriesScrubber");
          newDataSeriesOffsetMargin =
                $("#newDataSeries").height() +
                parseFloat($("#newDataSeries")
                             .css("border-top-width")
                             .split("px")[0]) +
                parseFloat($("#newDataSeries")
                             .css("border-bottom-width")
                             .split("px")[0]);
          $newDataSeriesScrubberProgress.css({"margin-top":
                                              0-actOffsetMargin});


          vidPlayer.on('timeupdate', function (e) {
              var percent = parseFloat(this.currentTime()) /
                            parseFloat(this.duration());
              $transGraphScrubberProgress.width((percent * 100.0)+"%");
              $sketchLogScrubberProgress.width((percent * 100.0)+"%");
              $speechLogScrubberProgress.width((percent * 100.0)+"%");
              $activityLogScrubberProgress.width((percent * 100.0)+"%");
              $protocolScrubberProgress.width((percent * 100.0)+"%");

              /* TO ADD NEW DATASET
               * Make a copy of the below block of code,
               * Uncomment it, and change all variable that contain the
               * text `newDataSeries' to a more meaningful name
               * consistent with the other files
               * IMPORTANT: See the Wiki for details now how to do this
               * properly!
              // $newDataSeriesScrubberProgress.width((percent * 100.0)+"%");
          });
      });
    */

      // Allow tabbed indenting on protocol textArea field
      // Code snippet credit to
      // jqueryrain.com/2012/09/indentation-in-textarea-using-jquery/
      $('textArea').keydown(function (e) {
          if (e.keyCode == 9) {
              e.preventDefault();
              var start = $(this).get(0).selectionStart;
              $(this).val($(this).val().substring(0, start) + "\t" +
                $(this).val().substring($(this).get(0).selectionEnd));
              $(this).get(0).selectionStart = $(this).get(0).selectionEnd =
                start + 1;
              $(this).focus();
              return false;
          }
      }); // end function for tabbed indenting

      // On focus returning back to the "view" tab,
      // update text in that tab with whatever was entered in the
      // protocol edit tab

      $('ul.tabs li:first').on('click', function () {
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "viewCode\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
          if ($(this).hasClass('active')) {
              var pArray = document
            .getElementById('protocolTextArea')
            .value
            .split("\n");

              function removeTabs(pString) {
                  return pString.split("\t")[pString.split("\t").length - 1];
              }

              // deleted code for array splitting
              // add new code that works, the old one didn't.

              // display the tree with some D3 code
              d3.select("#protoView").selectAll("svg").remove();
              var protoViewSvg = d3.select("#protoView")
                                   .append("svg")
                                   .attr("height", 400);
              var w = $('#protoView').width();
              var h = $('#protoView').height();

              var protoViewPadding = 5;
              var colorindex = -1;
              var tmp = -1;

              //protocolList = [];
              protocolColorList = [];


              //KB edits --------

              //working with pArray directly
              //need to find difference to
              //make sure the protocol are not completely rewritten

              //Structure of the protocol object
              // protocol1 : {color, level, parentName}
              // protocol2 : {color, level, parentName}
              // protocol3 : {color, level, parentName}
              // note that this is a linear buffer but the hierarchy is encoded in level variable

              //read the protocols and levels into a list first

              var newProtocolList = [];
              var parentName = "#ISROOT#";
              for (var i = 0; i < pArray.length; i++) {
                  var d = pArray[i];
                  var tabCount = d.split("\t").length;
                  var protocolName = d.split("\t")[tabCount - 1];
                  protocolName = protocolName.trim()

                  newProtocolList.push({
                      protocolName: protocolName,
                      level: tabCount,
                      parentName: tabCount != 1 ? parentName : "#ISROOT#"
                  });

                  parentName = protocolName;
              }

              // check with the old protocolObject and change the protocolObject accordingly
              var protocolKeyList = Object.keys(protocolObject);
              for (var j = 0; j < protocolKeyList.length; j++) {
                  protocolObject[protocolKeyList[j]].deleted = true;
              }

              for (var i = 0; i < newProtocolList.length; i++) {
                  var protocolName = newProtocolList[i].protocolName;
                  var level = newProtocolList[i].level;
                  var parentName = newProtocolList[i].parentName;

                  var presenceCounter = 0;

                  //check the position of this protocol in the oldList
                  for (var j = 0; j < protocolKeyList.length; j++) {
                      var tempProtocolName = protocolKeyList[j];
                      var templevel = protocolObject[protocolKeyList[j]].level;
                      var tempParentName = protocolObject[protocolKeyList[j]].parentName;

                      //set the delete flag

                      if (tempProtocolName == protocolName) {
                          if (templevel == level) {
                              if (tempParentName == parentName) {

                                  //found the protocol .. now unsetting the delete flag
                                  protocolObject[tempProtocolName].deleted = false;
                                  break;
                              } else {

                                  //renaming the parent name will just work
                                  protocolObject[tempProtocolName].parentName = parentName;
                                  protocolObject[tempProtocolName].deleted = false;
                                  break;
                              }
                          } else {

                              //changing the level
                              protocolObject[tempProtocolName].level = level;
                              protocolObject[tempProtocolName].deleted = false;

                              if (tempParentName != parentName) {
                                  //renaming the parent name will just work
                                  protocolObject[tempProtocolName].parentName = parentName;
                              }

                              break;
                          }
                      } else {
                          if (presenceCounter == protocolKeyList.length - 1) {

                              //means the protocol is NEW!
                              var color = getColor();

                              //if (level != 1) {
                              //    color = "";
                              //}

                              protocolObject[protocolName] = {
                                  color: color,
                                  level: level,
                                  parentName: parentName,
                                  deleted: false,
                                  hasChildren: false
                              };
                          }
                          presenceCounter++;
                      }
                  }

                  //What if the protocolObject is empty -- ie., there is
                  //no previous protocolList!
                  if (protocolKeyList.length == 0) {
                      //add each protocol in the protocol list to the
                      //protocolObject means the protocol is NEW!
                      var color = getColor();

                      //if (level != 1) {
                      //    color = "";
                      //}
                      protocolObject[protocolName] = {
                          color: color,
                          level: level,
                          parentName: parentName,
                          deleted: false,
                          hasChildren: false
                      };
                  }
              }

              //Now handle the deleted nodes? - not worrying about it now

              //D3 code for the tree!
              protocolList = depthFirstTraversalProtocolTree();
              protoViewSvg.selectAll("g").remove();

              var protoRect = protoViewSvg.selectAll("g")
                        .data(protocolList)
                        .enter().append("g")
                        .attr("height", "15")
                        .attr("transform", function (d, i) {
                            var indents = protocolObject[d].level;
                            var yline = i * 16 +
                                      10 +
                                      protoViewPadding;

                            return "translate(" +
                                  indents * 10 + "," +
                                  yline + ")";

                        });

              protoRect.append("rect")
             .attr("width", 15)
             .attr("height", 15)
             .attr("stroke-width", 1)
             .attr("fill", function (d, i) {
                 var indents = protocolObject[d].level;
                 var color = protocolObject[d].color;
                 color = color + (0.5).toString() + ")";
                 // protocolColorList.push(color);
                 return color;
             })
             .attr("stroke", "#ffffff");

              protoRect.append("text")
             .attr("x", function (d, i) {
                 protocolObject[d].level;
             })
             .attr("y", function (d, i) {
                 return 10;
             })
             .attr("dx", "2em")
             .text(function (d) {
                 return d;
             })
             .style("background-color", function(d,i){
                 var indents = protocolObject[d].level;
                 var color = protocolObject[d].color;
                 color = color + (0.5).toString() + ")";
                 protocolColorList.push(color);
                 return color;
             });
          }
          protocolList.push("unassign");
          protocolColorList.push("rgba(255,255,255,0.1)");
      }); // end function for updating protocols from entered text

      // Add total protocol distributions
      $('ul.tabs li:eq(2)').on('click', function () {
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "editCode\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
          // get the final list of assigned protocols
          var protoTimeArray = [];
          for (var i in protocolList) {
              if (protocolList[i] != "unassign") {
                  protoTimeArray.push([protocolList[i],
                           protocolColorList[i],
                           0]);
              }
          }
          for (var pindex in protoTimeArray) {
              for (var ind in selectedIndices) {
                  if (protoTimeArray[pindex][0] == selectedIndices[ind][3]) {
                      var timeInSecs = hmsToSec(selectedIndices[ind][2]) -
                         hmsToSec(selectedIndices[ind][1])
                      protoTimeArray[pindex][2] += timeInSecs;
                  }
              }
          }

          var maxTime = 0;
          for (var j in protoTimeArray) {
              if (protoTimeArray[j][2] > maxTime) {
                  maxTime = protoTimeArray[j][2];
              }
          }
          var chartWidth = $("#totalProtocols").width() - 20;
          var chartHeight = $("#totalProtocols").height();

          d3.select("#totalProtocols").selectAll("svg").remove();

          var tSVG = d3.select("#totalProtocols")
               .append("svg")
               .attr("width", chartWidth)
               .attr("height", chartHeight)
               .append("g");

          var protos = d3.scale.ordinal()
                 .domain(protocolList)
                 .rangePoints([10, chartWidth - 10], 0);

          var xAxis = d3.svg.axis()
                .scale(protos)
                .orient("bottom");

          tSVG.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," +
                                  (chartHeight + 5) + ")")
              .call(xAxis)
              .append("text")
              .attr("class", "label")
              .attr("x", chartWidth)
              .attr("y", -6)
              .style("text-anchor", "end")
              .text("protocols");

          tSVG.selectAll("rect")
              .data(protoTimeArray)
              .enter()
              .append("rect")
              .attr("x", function (d, i) {
                  return i / protoTimeArray.length * chartWidth;
              })
              .attr("y", function (d, i) {
                  return chartHeight - (d[2] / maxTime * chartHeight - 5);
              })
              .attr("width", chartWidth / protoTimeArray.length - 2)
              .attr("height", function (d, i) {
                  return (d[2] / maxTime * chartHeight) - 15;
              })
              .attr("fill", function (d, i) {
                  return d[1];
              });
      });

      // code to update word cloud based on user selection:
      $('#transTable').on('mouseup', function (e){
        var t = '';
        if (window.getSelection) {
            t = window.getSelection();
        } else if (document.getSelection) {
            t = document.getSelection();
        } else if (document.selection) {
            t = document.selection.createRange().text;
        }
        selectedText = String(t);
        if (selectedText.length > 0){
          var rangeObject = $(t.getRangeAt(0));
          var startSpan = rangeObject.attr("startContainer");
          var endSpan = rangeObject.attr("endContainer");
          var startLineID = startSpan.parentNode.parentNode.id;
          var endLineID = endSpan.parentNode.parentNode.id;
          var sliceStart = startLineID.split("line")[1];
          var sliceEnd = parseInt(endLineID.split("line")[1])+1;
          var linesList = lowerCaseLines.slice(sliceStart, sliceEnd);
          if (e.button !== 2) {
            cTime =  new Date();
            var tempTime = cTime.getHours() + ":" +
                          cTime.getMinutes() + ":" +
                          cTime.getSeconds();
            clickLog.push([tempTime, "selectLinesInTranscript\n"]);
            sendClickData.data = clickLog;
            $.post("/clicklog", sendClickData, function (data, error) { });
            // check if the event is a selection event and not a context
            // menu (right-click) event. The taglist is to be updated
            // only in the case of a selection event.
            $("#tagList").empty();
            $("#tagList").css("background-color", "#ffffff");
            $("#tagList").append(makeWordList(linesList, tagsToRemove));
          }
        } else {
          $("#tagList").empty();
          $("#tagList").css("background-color", "#ffffff");
          $("#tagList").append(makeWordList(lowerCaseLines,
                                            tagsToRemove));
        }
      });
      // code to assign protocol codes with selected text
      $('#transContent').on('contextmenu', function (e) {
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "contextmenu\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
          e.preventDefault();
          var t = '';
          if (window.getSelection) {
              t = window.getSelection();
          } else if (document.getSelection) {
              t = document.getSelection();
          } else if (document.selection) {
              t = document.selection.createRange().text;
          }
          var processedSelection = returnSpans(t);
          spanCollection = processedSelection[0];
          linesList = processedSelection[1];
          orgSpanCollection = processedSelection[2];
          selectedText = String(t);
          var menuItems = '<p> assign to code:</p>';
          for (ind in protocolList) {
              menuItems += '<ul id="' + protocolList[ind] + '">' +
                protocolList[ind] + '</ul>';
          }

          // The code below makes sure the context menu is fully
          // visible and doesn't overflow the displayed extents of
          // the page
          var menuXpos, menuYpos;
          var bottomRightTopOffset = $('#center')
                                       .offset().top;
          var bottomRightLeftOffset = $('#center')
                                        .offset().left;
          var bottomRightWidth = $('#center').width();
          var bottomRightHeight = $('#center').height();
          var contextMenuWidth = $('.contextmenu')
                                    .html(menuItems)
                                    .width();
          var contextMenuHeight = $('.contextmenu')
                                    .html(menuItems)
                                    .height();
          if (pageXOffset + e.clientX <=
              bottomRightLeftOffset + bottomRightWidth / 2) {
              if (pageYOffset + e.clientY <=
                  bottomRightTopOffset + bottomRightHeight / 2) {
                  menuXpos = pageXOffset +
                 e.clientX;
                  menuYpos = pageYOffset +
                 e.clientY;
              } else {
                  menuXpos = pageXOffset +
                 e.clientX;
                  menuYpos = pageYOffset +
                 e.clientY -
                 contextMenuHeight;
              }
          } else {
              if (pageYOffset + e.clientY <= bottomRightTopOffset +
                                             bottomRightHeight / 2) {
                menuXpos = pageXOffset + e.clientX - contextMenuWidth;
                menuYpos = pageYOffset + e.clientY;
              } else {
                menuXpos = pageXOffset + e.clientX - contextMenuWidth;
                menuYpos = pageYOffset + e.clientY - contextMenuHeight;
              }
          }
          $(".contextmenu").html(menuItems)
             .css({
                 "visibility": "visible",
                 "left": menuXpos + "px",
                 "top": menuYpos + "px",
                 "background": "white",
                 "border": "solid 1px #c9c9c9",
                 "z-index": 100,
                 "box-shadow": "3px 3px 5px 0px " + shadowGrey
             });
      });
      // end of code for pop-up coding menu in transContent

      selectedIndices = [];
      // assign selected text to array under the clicked code
      $(".contextmenu").on("click", "ul", function (evt) {
        evt.stopPropagation(); // stops click from propagating to
        // underlying div element.

        if ($.contains(this, '#newCodeBtn')) {
          // this condition no longer needed, get rid of it
          $('#newCodeBtn').on('click', function () {
            // If the textbox has text in it, add it to the existing
            // codes.
            var addedCode = $('#newCode').val();
            if (addedCode != "") {
              protocolList.push(addedCode);
              addedCode = "";
            }
          });
        } else {
          // Based on selection, capture from original csv first
          // var selectedArray = selectedText.split("\n");
          for (var i in orgSpanCollection) {
            var spansList = orgSpanCollection[i];
            var lineIndex = Number(linesList[i].id.split("row")[1]);
            if ($(this).text() === "unassign"){
              for (var ksel in selectedIndices) {
                var lineIDCurrentSel = $(spansList[0])
                                        .attr("id")
                                        .split("word")[0];
                var lineIDCoded = selectedIndices[ksel][4][0]
                                    .split("word")[0];
                if (lineIDCurrentSel === lineIDCoded){
                  selectedIndices.splice(ksel, 1);
                  for (var si=0; si< spansList.length; si++){
                    $(spansList[si]).css({"background-color":
                                          "rgba(255, 255, 255, 0.1"});
                  }
                }
              }
            } else {
              var spanString = "";
              var spanIds = [];
              for (var j in spansList){
                var tempSpan = $(spansList[j]);
                spanString += tempSpan.text();
                spanIds.push(tempSpan.attr("id"));
                tempSpan
                  .css({"background-color":
                            protocolColorList[
                            protocolList.indexOf($(this).text())]})
                  .delay(1000)
                  .animate({"background-color":
                            "rgba(0,0,0,0)"}, 'slow');
              }
              var codeTime = new Date();
              var tStamp = codeTime.getHours()+":"+
                           codeTime.getMinutes()+":"+
                           codeTime.getSeconds();
              selectedIndices.push([lineIndex,
                captionArray[lineIndex][0], // start time
                captionArray[lineIndex][1], // start time
                $(this).text(),
                spanIds,
                spanString, tStamp + "\n" ]);
            }
            var sendData = {};
            sendData.data = selectedIndices;
          }
          $.post("/userlog", sendData, function (data, error) { });
          // Note: the post request seems to take only JSON as data, but
          // read documentation to see if this is always the case. --
          // senthil

          d3.select("#protocolGraphContent")
            .selectAll("svg")
            .remove();
          var protoGraphWidth = $('#protocolGraphContent').width()-0;
          var protoGraphHeight = $('#protocolGraphContent').height()-0;
          var protocolSVG = d3.select("#protocolGraphContent")
                              .append("svg")
                              .attr("width", protoGraphWidth)
                              .attr("height", protoGraphHeight);
                              //.style({"border" : "1px solid #c9c9c9"});

            var margin = { top: 5, right: 0, bottom: 5, left: 0 };

            var protoY = d3.scale.linear()
                           .domain([0, docLength])
                           // convert to scale that adapts
                           .range([0, protoGraphHeight-
                                      margin.top-margin.bottom]);
            var protoX = d3.scale.ordinal()
                           .domain(protocolList) // convert ditto
                           .rangePoints([margin.left,
                                         protoGraphWidth-margin.right],
                                         0);
            var proSpace = 10;
            // clickStatus below determines the d3 rectangles' behavior
            // with respect to the mouseover.
            var clickStatus = 0;

            var codedData = [];
            for (var ind=0; ind<selectedIndices.length; ind++){
              var rowData = selectedIndices[ind];
              var d = {};
              d.startTime = hmsToSec(rowData[1]);
              d.endTime = hmsToSec(rowData[2]);
              d.y = protoY(d.startTime);
              d.code = rowData[3];
              d.codeIndex = protocolList.indexOf(d.code);
              d.x = (d.codeIndex *
                     (protoGraphWidth-proSpace)/
                     (protocolList.length - 1)
                    ) + proSpace / 2;
              d.id = d.code + "line" + rowData[0];
              d.lineID = "line" + rowData[0];
              d.height = 2;
              d.width  = (protoGraphWidth-proSpace)/
                         (protocolList.length - 1);
              d.fill = protocolColorList[d.codeIndex];
              d.spanIds = rowData[4];
              d.transcriptLine = rowData[5];
              d.clickStatus = 0;
              codedData.push(d);
            }
            var codeTip = d3.tip()
                            .attr('class', 'd3-tip')
                            .offset([0, 20])
                            .direction('e');
            protocolSVG.call(codeTip);

            var rects = protocolSVG.selectAll("rect")
              .data(codedData)
              .enter()
              .append("rect")
              .attr("x", function (d) {return d.x;})
              .attr("y", function (d) {return d.y;})
              .attr("id", function (d) {return d.id;})
              .attr("width", function (d) {return d.width;})
              .attr("height", function (d) {return d.height;})
              .attr("stroke-width", 1)
              .attr("stroke", "rgba(255,255,255,0)")
              .attr("fill", function (d) {return d.fill;})
              .attr("fill-opacity", 0.7)
              .attr("z-index", -1)
              .on("mouseover", function(d){
                codeTip.html("<b>CODE: </b>" + d.code).show();
                if (d.clickStatus === 0){
                  for (var si in d.spanIds){
                    $("#"+d.spanIds[si])
                      .css({"background-color":d.fill});
                  }
                  d3.select(this).attr('height', 3);
                  d3.select(this).attr('fill', boldHighlightColor);
                  d3.select(this).attr('fill-opacity', 1);
                }
              })
              .on("mouseout", function(d){
                codeTip.hide();
                if (d.clickStatus === 0){
                  for (var si in d.spanIds){
                    $("#"+d.spanIds[si])
                      .css({"background-color":"rgba(0,0,0,0)"});
                  }
                  d3.select(this).attr('height', d.height);
                  d3.select(this).attr('fill', d.fill);
                  d3.select(this).attr('fill-opacity', 0.7);
                }
              })
              .on("click", function(d){
                if (d3.event.ctrlKey || d3.event.metaKey){
                  //
                  cTime =  new Date();
                  var tempTime = cTime.getHours() + ":" +
                                cTime.getMinutes() + ":" +
                                cTime.getSeconds();
                  clickLog.push([tempTime, "genCodeWordCloud",
                                d.code + "\n"]);
                  sendClickData.data = clickLog;
                  $.post("/clicklog", sendClickData, function (data, error) { });
                  //
                  var lineCollection = [];
                  if (clickStatus===0){
                    // select all coded objects by code ID
                    var sameCodeObjs = $.grep(codedData, function(e){
                      return e.code == d.code;
                    });
                    // color all spans in these objects persistently
                    for (var ind=0; ind<sameCodeObjs.length; ind++){
                      var currentObj = sameCodeObjs[ind];
                      for (var si in currentObj.spanIds){
                        $("#"+currentObj.spanIds[si])
                          .css({"background-color":d.fill});
                      }
                      var codedWords = currentObj
                                          .transcriptLine
                                          .toLowerCase()
                                          .split(wordSeparators);
                      lineCollection.push(codedWords);
                      // exempt these rectangles from mouseover,
                      // mouseout events.
                      currentObj.clickStatus = 1;
                    }
                    $("#tagList").empty();
                    $("#tagList").css("background-color", "#ffffff");
                    $("#tagList").append(makeWordList(lineCollection,
                                                      tagsToRemove));
                    // set general click status as 1, so that this has
                    // to be disabled before another group of spans can
                    // be permanently highlighted.
                    clickStatus = 1;
                  } else {
                    $("#transTable")
                      .find("span")
                      .css({"background-color":"rgba(0,0,0,0)"});
                    for (var ind=0; ind<codedData.length; ind++){
                      codedData[ind].clickStatus = 0;
                    }
                    clickStatus = 0;
                  }
                } else {
                  // just skip to that time.
                  // player.currentTime(d.startTime);
                  var transClickItem = $('#transTable')
                          .find("#"+d.lineID);
                  //
                  cTime =  new Date();
                  var tempTime = cTime.getHours() + ":" +
                                cTime.getMinutes() + ":" +
                                cTime.getSeconds();
                  clickLog.push([tempTime, "codeSkipToTime",
                                d.startTime, d.code + "\n"]);
                  sendClickData.data = clickLog;
                  $.post("/clicklog", sendClickData,
                         function (data, error) { });
                  //
                  // this small snippet below to scroll the transcript
                  // to show the line corresponding to the item selected
                  // in transgraph
                  var topPos = $(transClickItem).offset().top;
                  $('#transContent')
                      .scrollTo($(transClickItem),
                                {duration: 'slow',
                                 transition: 'ease-in-out'});
                }
              });

          // get rid of the context menu
          $('.contextmenu')
            .css({ "box-shadow": "none",
                   "border": "none",
                   "background": "none" })
            .empty();
        } // end of code that determines what happens when the
          // contextmenu is clicked on.
      }); // end of code that decides what happens when an item is clicked on the context menu

      // remove context menu when clicked elsewhere
      $('#transContent').on('click', function () {
          $('.contextmenu')
            .css({ "box-shadow": "none",
                   "border": "none",
                   "background": "none" })
            .empty();
      });
    }); // end of file ajax code

    // Function to read in the log file
    var logFile;
    var fileTemp1 = $.ajax({
        type: "GET",
        url: "/receive_log_file",
        dataType: "text"
    }).done(function (data) {
      if (typeof data === 'string' &&
          data !== ""){
        console.log("sketch log file received!");
        sketchViz(data, transGraphData);
        // check file sketchViz.js for how this function works
        $("#sketchLogContent").on("click", function(){
          // var playerTime = player.currentTime();
        //
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "sketchLogContent", "\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
        //
        });
      } else {
        $('#sketchLogTitle').hide();
        $('#sketchLog').hide();
        console.log("sketch divs are now hidden");
      }
    }); // End code to generate paths
    // End Stuff to execute when log file loaded

    // Function to read in the speech log file
    var speechLogFile;
    var fileTemp2 = $.ajax({
        type: "GET",
        url: "/receive_speechLog_file",
        dataType: "text"
    }).done(function (speechdata){
      if (typeof speechdata === "string" &&
          speechdata !== ""){
        speechdata = JSON.parse(speechdata);
        console.log("speech log file received!");
        speechViz(speechdata, player, transGraphData);
        // check file speechViz.js for how this function works
        $("#speechLogContent").on("click", function(){
          var playerTime = player.currentTime();
        //
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "speechLogContent",
                        playerTime + "\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
        //
        });
      } else {
        // hide everything!
        $('#speechLogTitle').hide();
        $('#speechLog').hide();
        console.log("speech divs are now hidden");
      }
    }); // end of stuff to do with speechLog

    // Function to read in the activity log file
    var activityLogFile;
    var fileTemp2 = $.ajax({
        type: "GET",
        url: "/receive_activityLog_file",
        dataType: "text"
    }).done(function (activitydata) {
      if (typeof activitydata === "string" &&
          activitydata !== ""){
        activitydata = JSON.parse(activitydata);
        console.log("activity log file received!");
        // generate beautiful visuals
        activityViz(activitydata, player, transGraphData);
        // check file activityViz.js for how this function works
        $("#activityLogContent").on("click", function(){
          var playerTime = player.currentTime();
          //
          cTime =  new Date();
          var tempTime = cTime.getHours() + ":" +
                        cTime.getMinutes() + ":" +
                        cTime.getSeconds();
          clickLog.push([tempTime, "activityLogContent",
                        playerTime+"\n"]);
          sendClickData.data = clickLog;
          $.post("/clicklog", sendClickData, function (data, error) { });
          //
        });
      } else {
        // hide everything!
        $('#activityLogTitle').hide();
        $('#activityLog').hide();
        console.log("activity divs are now hidden");
      }
    }); // end of stuff to do with activityLog

    var fileTemp3 = $.ajax({
        type: "POST",
        url: "/infoContent",
        dataType: "text"
    }).done(function (data) {
        infoContentString = JSON.parse(data);
        infoContentObj = JSON.parse(infoContentString.data);
        console.log(infoContentObj);
        var highestInfoContent = 0;
        for (word in infoContentObj) {
          if (infoContentObj[word] > highestInfoContent) {
            highestInfoContent = infoContentObj[word];
          }
        }
        allSpans = $("#transContent").find("span");
        allSpans.each(function() {
          textColor = "#000";
          spanText = $(this).text().trim().toLowerCase();
          if (spanText in infoContentObj) {
            spanAlpha = infoContentObj[spanText]/
                        highestInfoContent;
            spanHighLightColor = "rgba(8,69,148," + spanAlpha +")";
            if (spanAlpha > 0.35) { textColor = "#fff"; }
            borderRadius = "3px";
          } else {
            spanHighLightColor = "rgba(255, 255, 255, 0)";
            borderRadius = "0px";
          }
          $(this).css({'background-color': spanHighLightColor,
                       'border-radius': borderRadius,
                       'color': textColor,
                       'padding-left': '3px'});
        });
    });


    /* TO ADD NEW DATASET
     * Make a copy of the below block of code, Uncomment it, and change
     * all variable that contain the text `newDataSeries' and `NewData'
     * to a more meaningful name consistent with the other files.
     * IMPORTANT: See the Wiki for details now how to do this properly!
     */
    /*
    var newDataSeriesFile;
    var fileTempN = $.ajax({
        type: "GET",
        url: "/receive_newDataSeries_file",
        dataType: "text"
    }).done(function (newData) {
      if (typeof newData === "string" &&
          newData !== ""){
        newData = JSON.parse(newData);
        console.log("new Data Series file received!");
        // generate beautiful visuals
        newDataSeriesViz(newData, player, transGraphData);
        // check file newDataViz.js for how this function works
      } else {
        // hide everything!
        $('#newDataSeriesTitle').hide();
        $('#newDataSeries').hide();
        console.log("new Data Series divs are now hidden");
      }
    }); // end of stuff to do with newDataSeries
    */

  //}); //player.ready attempt for the whole code chunk
} // end of window.onload code

// NOTES FOR CODE FOLDING in VIM:
// zc -- close fold
// zo -- open fold
// zM -- close all folds
// zR -- open all folds
// set foldmethod = syntax
