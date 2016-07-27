// VizScribe: A visual analytics tool for protocol analysis
//    Code by: Senthil Chandrasegaran
//             Sriram Karthik Badam
///////////////////////////////////////////////////////////////

// Extend the jquery "contains" selector to be case-insensitive. 
// to call this, use ":containsNC" instead of ":contains"
$.extend($.expr[":"], {
  "containsNC": function(elem, i, match, array) {
    return (elem.textContent || elem.innerText || "")
      .toLowerCase()
      .indexOf((match[3] || "").toLowerCase()) >= 0;
  }
});



// Return a list of lines and spans from selected lines in transcript
function returnSpans(selText){
  var spanArray = [];
  var spanLineArray = [];
  var rangeObject = $(selText.getRangeAt(0)); 
  var startSpan = rangeObject.attr("startContainer").parentNode;
  var endSpan = rangeObject.attr("endContainer").parentNode;
  var startLine = startSpan.parentNode.parentNode; // table row
  var endLine = endSpan.parentNode.parentNode;
  // collect all parent items in an array
  var linesList = [];
  var currentSpan = startSpan;
  var currentLine = startLine;
  if (currentSpan != null){
    do {
      // go through all the lines in the collection until the end
      // of the selection is reached.
      linesList.push(currentLine);
      var lineEndSpan = currentLine.lastChild.lastChild;
      var tempSpanLine = [];
      do {
        // In each line, go over all the spans until the end of
        // the selection is reached.
        spanArray.push(currentSpan);
        tempSpanLine.push(currentSpan);
        if (currentSpan == endSpan) {
          break;
        }
        var prevSib = currentSpan;
        currentSpan = currentSpan.nextSibling;
        // Even if the last span of the current line is reached,
        // the above process must be performed. So check for the
        // "previous sibling" of the current span. If that is
        // equal to the last span in the line, then break the
        // loop.
      } while (prevSib != lineEndSpan);
      // create an organized array of spans, linewise
      spanLineArray.push(tempSpanLine);
      var prevLine = currentLine;
      if (currentLine != endLine){
        currentLine = currentLine.nextSibling;
      }
      var lineStartSpan = currentLine.lastChild.firstChild;
      currentSpan = lineStartSpan;
      // the same logic as above (with the previous sibling at the
      // span-level) applies to the lines.
    } while (prevLine != endLine);
  }
  return [spanArray, linesList, spanLineArray];
}

// Toggle the state of being minimized or maximized of a given
// timeline div
function toggleMinMax(divTitleName, divName, divTitleText, divOrigW){
  $("#"+divTitleName).click(function () {
      if ($("#"+divName).hasClass('minimize')) {
          $("#"+divName).animate({ width: divOrigW }, 200,
              function(){
                //$("#"+divTitleName).text(divTitleText);
              }).removeClass('minimize');
      } else {
          $("#"+divName).animate({ width: 1 }, 200, "swing",
              function(){
                //$("#"+divTitleName).text(divTitleText);
              }).addClass('minimize');
      }
  });
}

// Re-display text with weights and color updated to reflect information
// content
function textICVis(displayTextObj, textMetadataObj){
  // determine the highest information content value in the given data
  var highestInfoContent = 0;
  for (word in textMetadataObj) {
    wordic = textMetadataObj[word]["infoContent"];
    if (wordic > highestInfoContent) {
      highestInfoContent = wordic;
    }
  }
  // identify all the span elements in the displayed text;
  var allSpans = displayTextObj.find("span");
  // create a scale of text weights (use a font that actually has these
  // weights, e.g. Roboto
  var wtScale = d3.scale.quantize()
                  .domain([0,1])
                  .range([300, 500, 700, 900]);

  // update text weights based on information content.
  allSpans.each(function() {
    var textWeight, textColor, textStyle, spanText, spanTextLow;
    textWeight = 300
    textStyle = "regular";
    textColor = "#777";
    spanTextLow = $(this).text().trim().toLowerCase();
    spanText = spanTextLow.replace(/[^a-zA-Z0-9\-]/g, "");
    if (spanText in textMetadataObj) {
      // normalize information content value of text for optimal weight
      // scaling
      var normIC = textMetadataObj[spanText]["infoContent"]/
                   highestInfoContent;
      textWeight = wtScale(normIC);
      textStyle = "regular";
      textColor = "#084594";
    } 
    $(this).css({'color': textColor,
                 'font-style': textStyle,
                 'font-family': 'Roboto, sans-serif',
                 'font-weight': textWeight});
  });
}

// Function that takes all the lines in the transcript, removes stop
// words, and returns a list of words and their frequencies.
// "wordsToRemove" is an optional argument. It represents a list of
// words removed from the tagList. When this is passed to the
// function, it removes these words from the list of unique words.
// NOTE: Use the wordsToRemove to populate a div for the user.
function makeWordList(lowerCaseLines,textMetadataObj,wordsToRemove) {
  var tagList = [];
  var wordObj = {};

  if ($.isEmptyObject(textMetadataObj)) { 
    // i.e, if NO textMetadataObj is provided
    // list of stopwords from www.jasondavies.com
    // stop word removal code from the same source, but modified to suit
    // current application
    var stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall)$/;
    var punctuation = /[!&()*+,--\.\/:;<=>?\[\\\]^`\{|\}~]+/g;
    var discard = /^(@|https?:)/;
    var htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
    var wordList = [];
    var conceptList = [];
    wordList = wordList.concat.apply(wordList, lowerCaseLines);
    
    // remove stop words and create an array of the remaining words called
    // "conceptlist"
    for (var num in wordList) {
      wordList[num] = wordList[num].replace(punctuation, "");
      if (!stopWords.test(wordList[num]) && (wordList[num] != "")) {
          conceptList.push(wordList[num]);
      }
    }
    
    // create an object array of type {word: frequency, word:
    // frequency,...}
    //sort it based on frequency.
    for (var i = 0, j = conceptList.length; i < j; i++) {
      if (wordObj[conceptList[i]]) {
          wordObj[conceptList[i]]++;
      }
      else {
          wordObj[conceptList[i]] = 1;
      }
    } // end wordObj creation (without metadata)
  
  } else { // if textMetadataObj is provided
    for (word in textMetadataObj) {
      wordObj[word] = textMetadataObj[word]["frequency"]
    }
  } // end condition where textMetadataObj is provided

  // if a wordToRemove argument is provided, delete that item from the
  // object array
  if (wordsToRemove !== undefined){
    for (i=0; i < wordsToRemove.length; i++){
      var wordToRemove = $.trim(wordsToRemove[i]);
      delete wordObj[wordToRemove];
    }
  }

  // Sort the words by their frequencies
  var sortedList = [];
  for (var uniqueWord in wordObj) {
    sortedList.push([uniqueWord, wordObj[uniqueWord]]);
    sortedList.sort(function (a, b) { return a[1] - b[1] });
  }

  // reverse the sorting so that the most frequent word is first
  tagList = sortedList.reverse();

  // Scale the frequency to acceptable font size ranges
  var tagNum = 0;
  var maxfreq = tagList[0][1];
  var tagspans = "";
  var tagFreq = [];
  var fontScale = d3.scale.log()
                    .domain([maxfreq, 1])
                    .range([40, 12]);
  var fontFamily = "Roboto, sans-serif";
  var fontWeightScale = d3.scale.quantize()
                          .domain([0,1])
                          .range([300, 500, 700, 900]);


  var highestInfoContent = 0;
  for (word in textMetadataObj) {
    wordic = textMetadataObj[word]["infoContent"];
    if (wordic > highestInfoContent) {
      highestInfoContent = wordic;
    }
  }
  // Generate html of the word list, each word scaled according to its
  // frequency. Return this value.
  for (var tagNum in tagList) {
      var fontWeight = 400;
      var tag = tagList[tagNum][0]
      if (!($.isEmptyObject(textMetadataObj))) {
        var tagIC = textMetadata[tag]["infoContent"]/highestInfoContent;
        fontWeight = fontWeightScale(tagIC);
      }
      var fontSizeStr = Math.round(fontScale(tagList[tagNum][1]))+'px';
      tagspans += '<text id="tag ' + tagNum + '"' +
                       ' style = "font-size: ' + fontSizeStr  + '; ' +
                                 'color: ' + wordCloudColor   + '; ' +
                                 'font-family: ' + fontFamily + '; ' +
                                 'font-weight: ' + fontWeight + '; ' +
                                 '">' +
                     tagList[tagNum][0] + ' ' +
                   '</text>';
      tagFreq.push(tagList[tagNum][1]);
  }
  return tagspans;
}

function generateTransGraph(transGraphContainer, captionArray,
    speakerList, speakerDiff, lowerCaseLines, textMetadataObj, showIC) {
    
    d3.select(transGraphContainer).selectAll("svg").remove();
    var w = $(transGraphContainer).width();
    docLength = hmsToSec(captionArray[captionArray.length-1][0]);
    var h = $(transGraphContainer).height();
    var transSvg = d3.select(transGraphContainer).append("svg")
                     .attr("width", w)
                     .attr("height", h);
    var transcriptScale = d3.scale.linear()
                            .domain([0, docLength])
                            .range([0, h]);
    var transScaleX = d3.scale.linear()
                              .domain([0, speakerList.length])
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

    // perform infocontent-based coloring if applicable
    var highestInfoContent = 0;
    var icColorArray = [];
    if ( (!($.isEmptyObject(textMetadataObj))) && 
         (showIC) ) {
      for (word in textMetadataObj) {
        wordic = textMetadataObj[word]["infoContent"];
        if (wordic > highestInfoContent) {
          highestInfoContent = wordic;
        }
      }
      var icScale = d3.scale.linear()
                            .domain([0, highestInfoContent])
                            .range([0, 0.3]);
      for (var sInd=0;sInd<lowerCaseLines.length;sInd++){
        var wordsInLine = lowerCaseLines[sInd];
        var maxIC = 0;
        for (var wordInd=0;wordInd<wordsInLine.length;wordInd++){
          var tempIC = 0;
          lookupWord = wordsInLine[wordInd];
          lookupWord = lookupWord.replace(/[^a-zA-Z0-9\-]/g, "");
          if (lookupWord in textMetadata){
            tempIC = textMetadataObj[lookupWord]["infoContent"];
            if (tempIC > maxIC){
              maxIC = tempIC;
            } 
          } else {
            // nothing, this was for testing
          }
        }
        var icLineColor = "rgba(8,69,148," + icScale(maxIC) + ")";
        icColorArray.push(icLineColor);
      }
    }

    // create and store data object for visualization
    var graphData = [];
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
        var speakerIndex = speakerList.indexOf(captionArray[i][2]);
        if (speakerIndex === -1){
          // uncomment the below to show other speakers as well
          // (apart from the participants)
          /*
          d.y = transScaleY(speakerList.length - 5);
          d.fillColor = transGraphColor;
          d.height = transScaleY(0.9);
          */
        } else {
          d.x = transScaleX(speakerList.length - speakerIndex - 1);
          d.fillColor = speakerColors[speakerIndex];
          d.width = transScaleX(0.9);
        }
      }
      if (constantHeight !== 0){
        d.height = 1;
      } else {
        var endSec = hmsToSec(captionArray[i][1]);
        d.endTime = endSec;
        var startSec = hmsToSec(captionArray[i][0]);
        var scaledHeight = transcriptScale(endSec - startSec);
        if (scaledHeight < 2){
          d.height = 2;
        } else {
          d.height = scaledHeight;
        };
      }
      d.dialog = captionArray[i][3];
      if ( (!($.isEmptyObject(textMetadataObj))) && 
           (showIC) ) {
        d.fillColor = icColorArray[i];
      }
      graphData.push(d);
    }
    console.log(graphData);

    var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([0, 10])
                .direction('e');
    transSvg.call(tip);
    var rects = transSvg.selectAll("rect")
             .data(graphData).enter()
             .append("rect")
             .attr("x", function (d) { return d.x; })
             .attr("y", function (d) { return d.y; })
             .attr("width", function (d) { return d.width; })
             .attr("z", 1)
             .attr("height", function (d) { return d.height; })
             .attr("fill", d.fillColor)
             .on("mouseover", function(d, i){
               tip.html("<font size=2 color='"+d.fillColor+ "'>"+
                   d.speaker+":  </font>"+d.dialog).show();
               // d3.select(this).attr("height", 5);
               if (prevClickedTag === ""){
                 d3.select(this).attr('fill', greenHighlight);
               }
               d3.select(this).attr('z', 50);
               $("#transTable tr").eq(i).children().last()
                                  .addClass("hoverHighlight");
             })
             .on("mouseout", function(d){
               tip.hide();
               // d3.select(this).attr("height", d.height);
               if (prevClickedTag === ""){
                 d3.select(this).attr('fill', d.fillColor);
               }
               d3.select(this).attr('z', 1);
               $("#transTable").find("td").removeClass("hoverHighlight");
             });

    var fisheye = d3.fisheye.circular().radius(100);
    transSvg.on('mousemove', function(){
        // implementing fisheye distortion
        fisheye.focus(d3.mouse(this));
        rects.each(function(d) { d.fisheye = fisheye(d); })
             .attr("y", function(d) { return d.fisheye.y; })
             .attr("width", function(d) {
                return d.width * d.fisheye.z;
             })
             .attr("height", function(d) { 
               return d.fisheye.z; 
             });
    });
    transSvg.on('mouseleave', function(){
        rects.each()
             .attr("y", d.y)
             .attr("height", d.height);
    });

    d3.select(transGraphContainer)
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
      } else {
        var graphIndex = $(transGraphContainer+' svg')
                          .children('rect')
                          .index(this);
        console.log(captionArray.length);
        var captionStartTimeMin = captionArray[graphIndex][0]
        captionStartTimeSec = hmsToSec(captionStartTimeMin);
        
        // send log to server
        cTime =  new Date();
        var tempTime = cTime.getHours() + ":" +
                      cTime.getMinutes() + ":" +
                      cTime.getSeconds();
        clickLog.push([tempTime, "transGraph",
                      captionStartTimeSec + "\n"]);
        sendClickData.data = clickLog;
        $.post("/clicklog", sendClickData, function (data, error) { });

        // add hhighlight to the transcript, and scroll to the
        // corresponding line
        var transClickItem = $('#transTable tr').eq(graphIndex)
                                                .children().last();
        transClickItem.addClass('hoverHighlight');
        // this small snippet below to scroll the transcript to show
        // the line corresponding to the item selected in transgraph
        if (graphIndex > 10){
          scrollIndex = graphIndex-10;
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
    return graphData;
}

