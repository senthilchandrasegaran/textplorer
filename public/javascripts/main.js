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
var icGraphData = []; // data structure for information content graph
var prevClickedTag = "";
var isTagClicked = false;
var clickLog = [];
var sendClickData = {};
var cTime =  new Date();
var docLength = 0;

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
// var wordCloudColor = "rgba(10, 100, 70, 0.7)";
var wordCloudColor = "#084594";
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

// object to store information content, word frequency, named entities
// etc.
var textMetadata = {};
var sentenceTags = [];
// Options to control visualizations
var highlightIC = true;   // control whether or not to highlight
                          // transcript based on information content.
var speakerList = ["F1", "F2", "F3", "F4"]
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
    searchStr = searchStr.trim();
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
    transGraphWidth = $("#transGraph").width();
    icGraphWidth = $("#icGraph").width();
    tagGraphWidth = $("#tagGraph").width();

    // load the annotator library, and link it to the transcript div
    jQuery(function ($) {
      $('#transContent').annotator();
    });

    /**************************************
     * TO ADD NEW DATASET
     * Make a copy of the below line of code,
     * Uncomment it, and change `newDataSeries' and `newDataSeriesHeight'
     * to a more meaningful name consistent with the other files
     * IMPORTANT: See the Wiki for details now how to do this properly!
     **************************************
    */
    // newDataSeriesHeight = $("#newDataSeries").height();

    var transcriptFile;
    var fileTemp = $.ajax({
      type: "GET", // can remove this to avoid confusion
      url: "/receive_transcript_file", // change to send_trn_fil
      // note: "send" from POV of client
      dataType: "text"
    }).done(function (data) {
      var options={"separator" : ";"}
      captionArray = $.csv.toArrays(data, options);
      // remove the first line, since it's the data header.
      // captionArray.splice(0,1);
      var longestLineLength = 0; // num words in the longest line
      for (var i in captionArray) {
        if ((captionArray[i].length > 1) &&
            (captionArray[i][0].toLowerCase() !== "start time")) {
          var tempLine = captionArray[i][3].trim();
          var splCharacters = ['!', '@', '#', '$', '%', '^', '&', '*',
                               '(', ')', '[', ']', '{', '}', ';', ':',
                               ',', '.', '/', '<', '>', '?', '|',
                               '`', '~', '=', '_', '+', '-'];

          var tempChars = tempLine.split("");
          var tmpln = "";
          var charToAdd;
          for (var cind = 0; cind < tempChars.length; cind++) { 
              if (splCharacters.indexOf(tempChars[cind]) !== -1){
                charToAdd = " " + tempChars[cind] + " ";
              } else {
                charToAdd = tempChars[cind];
              }
              tmpln = tmpln + charToAdd;
          }
          tmpln = tmpln.trim();
          //var words = tempLine.split(wordSeparators);
          var words = tmpln.split(wordSeparators);
          if (words.length > longestLineLength) {
            longestLineLength = words.length;
          }
          // var lowerCaseWords =
          // tmpln.toLowerCase().split(wordSeparators);
          var lowerCaseWords = tmpln.toLowerCase().split(" ");
          lowerCaseLines.push(lowerCaseWords);
          for (var k in words) {
            tempspan += '<span id="line' + i + 'word' + k + '"' +
                'style="padding: 0px; border-radius: 4px;">' +
                        words[k] + '</span> ';
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
             '<td id="line' + i + '" ' +
             'style="word-break: break-word; hyphens: auto;">' +
              tempspan + '</td></tr>')
          tempspan = "";
        }
      }

      for (var j in displayLines) {
        $("#transTable").append(displayLines[j]);
      }
      numLines = displayLines.length;

      // representation of lines in transcript overall window
      transGraphData = generateTransGraph(
                          "#transGraphContent", // transcript graph
                          captionArray, // array from text uploaded
                          speakerList,  // list of speakers
                          speakerDiff,  // 1=yes, 0=no
                          lowerCaseLines, // all lines in lowercase
                          textMetadata, // object with all ICs
                          false);  // whether or not to show IC
      // end representation of lines
      var tagListHTML = makeWordList(lowerCaseLines, textMetadata,
                                     tagsToRemove, true);
      updateTagList($("#tagList"), tagListHTML);

      // Remove tag on right click
      var tagListDOM = $('#tagList');
      tagListDOM.oncontextmenu = function () { return false; };
      tagListDOM.on('mousedown', 'text', function (e) {
        if (e.button == 2) {
          var isRemoveTag = confirm("Remove tag: " +
                              $(this).text() +
                              " from list?");
          if (isRemoveTag == true) {
            var tagToRemove = $(this).text();
            tagsToRemove.push(tagToRemove);
            var tagListHTML = makeWordList(lowerCaseLines, textMetadata,
                                           tagsToRemove, true);
            updateTagList($("#tagList"), tagListHTML);
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
        // Highlight corresponding items in transGraph
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
            // change color of text rep bars
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
          // var startTime = hmsToSec(captionArray[numInd][0]);
          var startTime = numInd;
          //var duration = hmsToSec(captionArray[numInd][1]) - startTime;
          var duration = 1;
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
              /*
              allConcordances.forEach(function (eachConcordance) {
                  $('#concordance-view-content')
                    .append(eachConcordance + "<br/>");
              });
              */
              $('#concordance-view-content').append(allConcordances);
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
                  /*
                  var startTime = hmsToSec(captionArray[numInd][0]);
                  var duration = hmsToSec(captionArray[numInd][1]) -
                           startTime;
                           */
                  var startTime = numInd;
                  var duration = 1;
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


      //---------------------------------------------------------------
      // highlighting on mouseover for transcript
      //---------------------------------------------------------------

      // Add highlighting on mouseenter
      $('#transTable').on('mouseenter', 'tr', function () {
          $(this).children().last().addClass('transHighlight');
          var transItemIds = []
          var idIndex = this.rowIndex;
          transItemIds.push(idIndex);
          // change color of text rep bars
          var hiRects = $("#transGraphContent svg").children('rect');
          d3.select(hiRects[idIndex])
            .classed("transRectHighLight", true);
          d3.select("#icGraphContent").selectAll('rect')
            .each(function(d){
              if (d.rowIndex === idIndex){
                d3.select(this).classed("transRectHighLight", true);
              }
            });
          d3.select("#tagGraphContent").selectAll('rect')
            .each(function(d){
              if (d.lineInd === idIndex){
                d3.select(this).classed("transRectHighLight", true);
              }
            });
          var timeSegArray = [];
          //load corresponding times of highlighted li items in a list
          var ind = 0;
          for (ind in transItemIds) {
              var numInd = transItemIds[ind];
              /*
              var startTime = hmsToSec(captionArray[numInd][0]);
              var duration = hmsToSec(captionArray[numInd][1]) -
                           startTime;
                           */
              var startTime = numInd;
              var duration = 1;
              timeSegArray.push([startTime, duration]);
          }
      });

      // remove highlighting on mouse leave
      $('#transTable').on('mouseleave', 'tr', function () {
          $(this).children().removeClass('transHighlight');
          d3.select("#transGraphContent svg").selectAll("rect")
            .classed("transRectHighLight", false);
          d3.select("#icGraphContent svg").selectAll("rect")
            .classed("transRectHighLight", false);
          d3.select("#tagGraphContent svg").selectAll("rect")
            .classed("transRectHighLight", false);
      });

      //---------------------------------------------------------------
      // end of highlighting on mouseover for transcript
      //---------------------------------------------------------------

      // toggle the size of the transGraph div
      toggleMinMax("transGraphTitle", "transGraph",
          "Graphical View of Transcript", transGraphWidth);
      toggleMinMax("icGraphTitle", "icGraph",
          "Graphical View of Information Content", icGraphWidth);
      toggleMinMax("tagGraphTitle", "icGraph",
          "Graphical View of Tags", tagGraphWidth);

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


      // Allow tabbed indenting on protocol textArea field
      // Code snippet credit to
      // jqueryrain.com/2012/09/indentation-in-textarea-using-jquery/
      $('textArea').keydown(function (e) {
          if (e.keyCode == 9) {
              e.preventDefault();
              var start = $(this).get(0).selectionStart;
              $(this).val($(this).val().substring(0, start) + "\t" +
                $(this).val().substring($(this).get(0).selectionEnd));
              $(this).get(0).selectionStart = 
                $(this).get(0).selectionEnd = start + 1;
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
              var pArray = document.getElementById('protocolTextArea')
                                   .value
                                   .split("\n");

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

              // check with the old protocolObject and change the
              // protocolObject accordingly
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
                  if (protoTimeArray[pindex][0] ===
                      selectedIndices[ind][3]) {
                      var timeInSecs = hmsToSec(selectedIndices[ind][2]) - hmsToSec(selectedIndices[ind][1]);
                      var timeInSecs = 
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
            // check if the event is a selection event and not a context
            // menu (right-click) event. The taglist is to be updated
            // only in the case of a selection event.
            var tagListHTML = makeWordList(linesList, textMetadata,
                                           tagsToRemove, false);
            updateTagList($("#tagList"), tagListHTML);

            cTime =  new Date();
            var tempTime = cTime.getHours() + ":" +
                          cTime.getMinutes() + ":" +
                          cTime.getSeconds();
            clickLog.push([tempTime, "selectLinesInTranscript\n"]);
            sendClickData.data = clickLog;
            $.post("/clicklog", sendClickData, function (data, error) { });
          }
        } else {
          var tagListHTML = makeWordList(lowerCaseLines, textMetadata,
                                         tagsToRemove, true);
          updateTagList($("#tagList"), tagListHTML);
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
              // d.startTime = hmsToSec(rowData[1]);
              // d.endTime = hmsToSec(rowData[2]);
              d.startTime = ind;
              d.endTime = ind + 1;
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
                    var tagListHTML = makeWordList(lineCollection,
                                                   textMetadata,
                                                   tagsToRemove, false);
                    updateTagList($("#tagList"), tagListHTML);

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
      }); // end of code that decides what happens when an item is
          // clicked on the context menu

      // remove context menu when clicked elsewhere
      $('#transContent').on('click', function () {
          $('.contextmenu')
            .css({ "box-shadow": "none",
                   "border": "none",
                   "background": "none" })
            .empty();
      });
    }); // end of file ajax code

    var fileTemp3 = $.ajax({
        type: "POST",
        url: "/infoContent",
        dataType: "text"
    }).done(function (data) {
        var infoString = JSON.parse(data);
        textNLP = JSON.parse(infoString.data);
        console.log(textNLP);
        textMetadata = textNLP["metadata"];
        sentenceTags = textNLP["sentencetags"];
        $('#showIC').prop('checked', true);
        textICVis($("#transContent"), textMetadata);
        var tagListHTML = makeWordList(lowerCaseLines, textMetadata,
                                       tagsToRemove, true);
        updateTagList($("#tagList"), tagListHTML);

        // Show 'counts' of tag near their checkboxes (inspired from
        // scented widgets)
        var peopleCount = getTagCounts(["PERSON"],"NER",sentenceTags);
        $("#ppCount").text(peopleCount);

        var plcCount = getTagCounts(["LOCATION"],"NER",sentenceTags);
        $("#plcCount").text(plcCount);

        var nameList = ["NNP"];
        var nameCount = getTagCounts(nameList,"POS",sentenceTags);
        $("#nameCount").text(nameCount);

        var nounList = ["NN", "NNP", "NNS"];
        var nounCount = getTagCounts(nounList,"POS",sentenceTags);
        $("#nounCount").text(nounCount);

        var verbList = ["VB","VBD","VBG","VBN","VBP","VPZ"];
        var verbCount = getTagCounts(verbList, "POS", sentenceTags);
        $("#verbCount").text(verbCount);

        var adjList = ["JJ", "JJR", "JJS"];
        var adjCount = getTagCounts(adjList, "POS", sentenceTags);
        $("#adjCount").text(adjCount);

        var advList = ["RB","RBR", "RBS"];
        var advCount = getTagCounts(advList, "POS", sentenceTags);
        $("#advCount").text(advCount);

        icGraphData = generateICGraph("#icGraphContent", 
                                      captionArray,
                                      lowerCaseLines,
                                      sentenceTags,
                                      textMetadata);
    });


    $('#showIC').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).css({'color': '#000',
                           'font-style': 'regular',
                           'font-weight': 400});
          });
      } else {
        textICVis($("#transContent"), textMetadata);
      }
    });

    $('#showPeople').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("people");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("people");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "PERSON", "people");
        tagWordCloud($("#tagList"), textMetadata, "PERSON", "people");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showPlaces').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("places");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("places");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "LOCATION", "places");
        tagWordCloud($("#tagList"), textMetadata, "LOCATION", "places");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showNouns').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("nouns");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("nouns");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "noun", "nouns");
        tagWordCloud($("#tagList"), textMetadata, "noun", "nouns");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showNames').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("names");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("names");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "name", "names");
        tagWordCloud($("#tagList"), textMetadata, "name", "names");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showVerbs').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("verbs");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("verbs");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "verb", "verbs");
        tagWordCloud($("#tagList"), textMetadata, "verb", "verbs");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showAdverbs').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("adverbs");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("adverbs");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "adverb", "adverbs");
        tagWordCloud($("#tagList"), textMetadata, "adverb", "adverbs");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
    });

    $('#showAdjectives').change(function(){
      if (!($(this).is(':checked'))) {
          $("#transContent").find("span").each(function() {
              $(this).removeClass("adjectives");
          });
          $("#tagList").find("text").each(function() {
              $(this).removeClass("adjectives");
          });
      } else {
        tagLines($("#transContent"), sentenceTags, "adjective",
                "adjectives");
        tagWordCloud($("#tagList"), textMetadata, "adjective",
                "adjectives");
      }
      var checkedLabels = returnSelectedLabels();
      d3.select("#tagGraphContent").selectAll("svg").remove();
      generateMultiWordGraphs("#tagGraphContent", 
                              captionArray,
                              lowerCaseLines,
                              sentenceTags,
                              checkedLabels);
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

} // end of window.onload code

// NOTES FOR CODE FOLDING in VIM:
// zc -- close fold
// zo -- open fold
// zM -- close all folds
// zR -- open all folds
// set foldmethod = syntax
