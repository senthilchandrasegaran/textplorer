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
  // var startSpan = rangeObject.attr("startContainer").parentNode;
  // var endSpan = rangeObject.attr("endContainer").parentNode;
  var startSpan = rangeObject.attr("startContainer");
  var endSpan = rangeObject.attr("endContainer");
  var startLine = startSpan.parentNode.parentNode; // table row
  var endLine = endSpan.parentNode.parentNode;
  // collect all parent items in an array
  var linesList = [];
  var currentSpan = startSpan;
  console.log(rangeObject);
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
                  .range([300, 400, 500, 900]);

  // update text weights based on information content.
  var collectIC = {300 : [], 400 : [], 500 : [], 900 :[]};
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
      collectIC[textWeight].push(spanText);
      textStyle = "regular";
      textColor = "#084594";
    }
    $(this).css({'color': textColor,
                 'font-style': textStyle,
                 'font-family': 'Roboto, sans-serif',
                 'font-weight': textWeight});
  });
  console.log(collectIC);
}

function getTagCounts(lookupTags, tagKey, sentenceTags){
    /* lookupTags: a list of tags that indicate a certain part of speech
     *             or named entity
     * tagKey: can take 2 values; "POS" or "NER"
     * sentenceTags: a sentence-wise organized list of {word : metadata}
     *               objects.
     * Given a list of POS (not NER!) tags and a list of sentences
     * tagged with similar tags, it counts the total occurrences of the
     * given list of tags and returns it 
     */
    var tagCount = 0;
    for (var sentInd=0; sentInd<sentenceTags.length; sentInd++){
        sentArray = sentenceTags[sentInd];
        for (var tagInd=0; tagInd<sentArray.length; tagInd++){
            tagObj = sentArray[tagInd];
            word = Object.keys(tagObj)[0];
            NERTag = tagObj[word][tagKey];
            if (lookupTags.indexOf(NERTag) !== -1){
                tagCount++;
            }
        }
    }
    return tagCount;
}

function tagWordCloud(wordCloudObj, textMetadataObj, tagName, highlightClass){

    var tagListType, nameTagList, currentWord, listOfTags, nameTag;
    if (["PERSON", "LOCATION"].indexOf(tagName) !== -1){
        tagListType = "NERList";
        nameTagList = [tagName];
    } else {
        tagListType = "POSList";
        if (tagName === "noun"){
            nameTagList = ["NN", // common noun, singular or mass 
                           "NNS"];  // common noun, plural
        
        } else if (tagName === "name") {
            nameTagList = ["NNP"]; // proper noun, singular
        } else if (tagName === "verb") {
            nameTagList = ["VB", // verb in base form
                           "VBD", // verb, past tense
                           "VBG", // verb, present participle or gerund
                           "VBN", // verb, past participle
                           "VBP", // verb, prs.tense, not 3rd p.singular
                           "VPZ"]; // verb, present tense, 3rd p.singular
        } else if (tagName === "adjective") {
            nameTagList = ["JJ", // adjective or numeral, ordinal
                           "JJR", // comparative adjective
                           "JJS"]; // superlative adjective
        } else if (tagName === "adverb"){
            nameTagList = ["RB", //adverb
                           "RBR", // comparative adverb
                           "RBS"]; // superlative adverb
        } else {
            console.log("Supplied tagName is not recognizable.");
        }
    }

    var wordCloudList = $(wordCloudObj).find("text");
    for (var i=0; i<wordCloudList.length;i++){
        currentWord = wordCloudList[i].innerHTML.trim().toLowerCase();
        listOfTags = textMetadataObj[currentWord][tagListType];
        for (j=0;j<nameTagList.length;j++){
            nameTag = nameTagList[j];
            if (listOfTags.indexOf(nameTag) !== -1){
                $(wordCloudList[i]).addClass(highlightClass);
                break; // no need to continue with the j loop anymore
            }
        }
    }
    
}

function tagLines(textObj, taggedSentenceList, tagName, highlightClass){
    // get all lines from displayed text
    var lines = [];
    var tagType = "";
    var taggedSentence, line, lineSpans, spanIndex, wordObj, word, tag,
        spanText, nameTagList;

    if (["PERSON", "LOCATION"].indexOf(tagName) !== -1){
        tagType = "NER";
        nameTagList = [tagName];
        console.log("Supplied tagName is a named entity.");
    } else {
        tagType = "POS";
        if (tagName === "noun"){
            console.log("Supplied tagName is a noun.");
            nameTagList = ["NN", // common noun, singular or mass 
                           "NNS"];  // common noun, plural
        
        } else if (tagName === "name") {
            console.log("Supplied tagName is a proper noun.");
            nameTagList = ["NNP"]; // proper noun, singular
        } else if (tagName === "verb") {
            console.log("Supplied tagName is a verb.");
            nameTagList = ["VB", // verb in base form
                           "VBD", // verb, past tense
                           "VBG", // verb, present participle or gerund
                           "VBN", // verb, past participle
                           "VBP", // verb, prs.tense, not 3rd p.singular
                           "VPZ"]; // verb, present tense, 3rd p.singular
        } else if (tagName === "adjective") {
            console.log("Supplied tagName is an adjective.");
            nameTagList = ["JJ", // adjective or numeral, ordinal
                           "JJR", // comparative adjective
                           "JJS"]; // superlative adjective
        } else if (tagName === "adverb"){
            console.log("Supplied tagName is an adverb.");
            nameTagList = ["RB", //adverb
                           "RBR", // comparative adverb
                           "RBS"]; // superlative adverb
        } else {
            console.log("Supplied tagName is not recognizable.");
        }
    }

    for (i=0; i<taggedSentenceList.length; i++){
        taggedSentence = taggedSentenceList[i];
        line = textObj.find("#line"+i);
        lineSpans = line.find("span");
        if (lineSpans.length === taggedSentence.length){
            for (j=0; j<taggedSentence.length;j++){
                wordObj = taggedSentence[j];
                word = Object.keys(wordObj)[0];
                tag = wordObj[word][tagType];
                if (nameTagList.indexOf(tag) !== -1){
                    $(lineSpans[j]).addClass(highlightClass);
                }
            }
        } else {
            console.log(lineSpans);
            console.log(taggedSentence);
        }
    }
}

function returnWNTags(tagName){
    if (["PERSON", "LOCATION"].indexOf(tagName) !== -1){
        tagType = "NER";
        nameTagList = [tagName];
        console.log("Supplied tagName is a named entity.");
    } else {
        tagType = "POS";
        if (tagName === "noun"){
            console.log("Supplied tagName is a noun.");
            nameTagList = ["NN", // common noun, singular or mass 
                           "NNS"];  // common noun, plural
        
        } else if (tagName === "name") {
            console.log("Supplied tagName is a proper noun.");
            nameTagList = ["NNP"]; // proper noun, singular
        } else if (tagName === "verb") {
            console.log("Supplied tagName is a verb.");
            nameTagList = ["VB", // verb in base form
                           "VBD", // verb, past tense
                           "VBG", // verb, present participle or gerund
                           "VBN", // verb, past participle
                           "VBP", // verb, prs.tense, not 3rd p.singular
                           "VPZ"]; // verb, present tense, 3rd p.singular
        } else if (tagName === "adjective") {
            console.log("Supplied tagName is an adjective.");
            nameTagList = ["JJ", // adjective or numeral, ordinal
                           "JJR", // comparative adjective
                           "JJS"]; // superlative adjective
        } else if (tagName === "adverb"){
            console.log("Supplied tagName is an adverb.");
            nameTagList = ["RB", //adverb
                           "RBR", // comparative adverb
                           "RBS"]; // superlative adverb
        } else {
            console.log("Supplied tagName is not recognizable.");
        }
    }
    return(nameTagList);
}


// Function that takes all the lines in the transcript, removes stop
// words, and returns a list of words and their frequencies.
// "wordsToRemove" is an optional argument. It represents a list of
// words removed from the tagList. When this is passed to the
// function, it removes these words from the list of unique words.
// NOTE: Use the wordsToRemove to populate a div for the user.
function makeWordList(listOfLowerCaseLines,textMetadataObj,wordsToRemove,isCompleteText) {
  var tagList = [];
  var wordObj = {};
  var wordList = [];
  wordList = wordList.concat.apply(wordList, listOfLowerCaseLines);

  if ($.isEmptyObject(textMetadataObj)) { 
    // i.e, if NO textMetadataObj is provided
    // list of stopwords from www.jasondavies.com
    // stop word removal code from the same source, but modified to suit
    // current application
    var stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall)$/;
    var punctuation = /[!&()*+,--\.\/:;<=>?\[\\\]^`\{|\}~]+/g;
    var discard = /^(@|https?:)/;
    var htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
    var conceptList = [];
    
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
    if (!isCompleteText) {
      // if the provided text is the complete text and not a selection,
      // then the textMetadata is not applicable anymore.
      for (var i = 0; i < wordList.length; i++) {
        if (wordList[i] in textMetadataObj){
          // word is NOT a stopword
          if (wordObj[wordList[i]]) {
              wordObj[wordList[i]]++;
          }
          else {
              wordObj[wordList[i]] = 1;
          }
        } // end stopword condition
      }
    
    } else {
      // the textMetadata is applicable, since the complete list is
      // provided.
      for (word in textMetadataObj) {
        wordObj[word] = textMetadataObj[word]["frequency"]
      }
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
                    .range([40, 14]);
  var fontFamily = "Roboto, sans-serif";
  var fontWeightScale = d3.scale.quantize()
                          .domain([0,1])
                          .range([300, 400, 500, 900]);


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
                                 'padding: 2px; border-radius: 4px;' +
                                 '">' +
                     tagList[tagNum][0] + '</text>' + '  ' ;
      tagFreq.push(tagList[tagNum][1]);
  }
  return '<p>'+tagspans+'</p>';
}


function updateTagList(tagDivObj, inputHTML){
    $(tagDivObj).empty();
    $(tagDivObj).css("background-color", "#ffffff");
    $(tagDivObj).append(inputHTML);
    if ($('#showPeople').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "PERSON", "people");
    }
    if ($('#showPlaces').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "LOCATION", "places");
    }
    if ($('#showNames').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "name", "names");
    }
    if ($('#showNouns').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "noun", "nouns");
    }
    if ($('#showVerbs').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "verb", "verbs");
    }
    if ($('#showAdjectives').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "adjective",
                   "adjectives");
    }
    if ($('#showAdverbs').is(':checked')){
      tagWordCloud($(tagDivObj), textMetadata, "adverb", "adverbs");
    }
}

// Function to generate a text concordance view in the form of an html
// table
function concordance(word) {
    //take the captionArray and put in one string
    var allCaptions = "";
    var textWindow = 60;
    captionArray.forEach(function (caption) {
        allCaptions += caption[3] + " ";
    });

    //now search of the index (indices) of the word in the allCaptions
    var indices = getIndicesOf(word, allCaptions, false);

    //Array of the concordances
    var concordances = "<table id='concTable' align='center'>";

    for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        var left = index - textWindow < 0 ? 0 : index - textWindow;
        var right = index+textWindow+word.length >allCaptions.length-1?
                    allCaptions.length-1 : index + textWindow + 
                    word.length;
        var row = "<tr>" +
                    "<td align='right'>" +
                    allCaptions.substring(left, index - 1) +
                    "</td>" +
                    "<td width=10px></td>" +
                    "<td align='center'><b>" +
                    allCaptions.substring(index,
                                          index+word.length) +
                    " </b></td>" +
                    "<td width=10px></td>" +
                    "<td align='left'>" +
                    allCaptions.substring(index + word.length,
                                          right) +
                    "</td>" +
                  "</tr>"
          concordances = concordances.concat(row);
    }
    concordances = concordances.concat("</table>");
    return concordances;
}


function removeEmptyLines(textArray){
    var lastRow = textArray[textArray.length-1];
    if (textArray[textArray.length-1][0] != "") {
        return textArray;
    } else {
        removeEmptyLines(textArray.slice(1, textArray.length));
    }
}

function generateTransGraph(transGraphContainer, rawCaptionArray, speakerList, speakerDiff, listOfLowerCaseLines, textMetadataObj, showIC) {
    
    captionArray = removeEmptyLines(rawCaptionArray);
    d3.select(transGraphContainer).selectAll("svg").remove();
    var w = $(transGraphContainer).width();
    // docLength = hmsToSec(captionArray[captionArray.length-1][0]);
    docLength = captionArray.length;
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
    for (i=0; i<listOfLowerCaseLines.length;i++){
      if (maxTranLine < listOfLowerCaseLines[i].length){
        maxTranLine = listOfLowerCaseLines[i].length;
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
      var icScale = d3.scale.pow(2)
                            .domain([0, highestInfoContent])
                            .range([0, 0.3]);
      for (var sInd=0;sInd<listOfLowerCaseLines.length;sInd++){
        var wordsInLine = listOfLowerCaseLines[sInd];
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
      // var ySec = hmsToSec(captionArray[i][0]);
      var ySec = i;
      d.timeStamp = ySec;
      var yloc = transcriptScale(ySec);
      d.y = yloc;
      d.speaker = captionArray[i][2];
      if (speakerDiff === 0){
        d.x = 0;
        d.fillColor = transGraphColor;
        d.width = listOfLowerCaseLines[i].length/maxTranLine * w;
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
        // var endSec = hmsToSec(captionArray[i][1]);
        var endSec = i+1;
        d.endTime = endSec;
        // var startSec = hmsToSec(captionArray[i][0]);
        var startSec = i;
        var scaledHeight = transcriptScale(endSec - startSec);
        if (scaledHeight < 1){
          d.height = 1;
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

    var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([0, 0])
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
               tip.html("<font size=2 color='#fff'>"+
                   d.speaker+":  </font>"+d.dialog).show();
               // d3.select(this).attr("height", 5);
               if ((prevClickedTag === "") && !(isRowClicked)){
                 d3.select(this).attr('fill', hoverHighlight);
               }
               d3.select(this).attr('z', 50);
               $("#transTable tr").eq(i).children().last()
                                  .addClass("hoverHighlight");
             })
             .on("mouseout", function(d){
               tip.hide();
               // d3.select(this).attr("height", d.height);
               if ((prevClickedTag === "") && !(isRowClicked)){
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
               return d.height * d.fisheye.z; 
             });
    });
    transSvg.on('mouseleave', function(){
        rects.each(function(d){d.fisheye = fisheye(d);})
             .attr("y", function(d){return d.y;})
             .attr("width", function(d){return d.width;})
             .attr("height", function(d){return d.height;});
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
        if (graphIndex > 3){
          scrollIndex = graphIndex-1;
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

function generateICGraph(transGraphContainer, rawCaptionArray, listOfLowerCaseLines, taggedSentences, textMetadataObj) {

    // Identify max information content
    var highestInfoContent = 0;
    for (word in textMetadataObj) {
      wordic = textMetadataObj[word]["infoContent"];
      if (wordic > highestInfoContent) {
        highestInfoContent = wordic;
      }
    }

    var wtScale = d3.scale.quantize()
                    .domain([0,1])
                    //.range([0.05, 0.1, 0.2, 0.9]);
                    .range(["#f7fbff", "#deebf7", "#9ecae1", "#2171b5"]);

    var zScale = d3.scale.quantize()
                   .domain([0,1])
                   .range([10, 20, 30, 50]);

    captionArray = removeEmptyLines(rawCaptionArray);
    // d3.select(transGraphContainer).selectAll("svg").remove();
    var w = $(transGraphContainer).width();
    // Uncomment the below line if timestamps are unique for each line
    // docLength = hmsToSec(captionArray[captionArray.length-1][0]);

    // Uncomment the below line if the order of lines is what you want
    // to use, not the timestamps (usually applicable for transcripts
    // where the timestamps have a pooor resolution, e.g. 1 minute)
    docLength = captionArray.length;
    var h = $(transGraphContainer).height();
    var transSvg = d3.select(transGraphContainer).append("svg")
                     .attr("width", w)
                     .attr("height", h);
    var transcriptScale = d3.scale.linear()
                            .domain([0, docLength])
                            .range([0, h]);
    var transGraphPadding = 0;
    var scaleHeights = 0;
    var constantHeight = 0;
    var maxTranLine = 0

    // to normalize the widths of the lines of text, need to find
    // the maximum length
    /*
    for (i=0; i<listOfLowerCaseLines.length;i++){
      if (maxTranLine < listOfLowerCaseLines[i].length){
        maxTranLine = listOfLowerCaseLines[i].length;
      }
    }
    */

    for (i=0; i<taggedSentences.length;i++){
      if (maxTranLine < taggedSentences[i].length){
        maxTranLine = taggedSentences[i].length;
      }
    }

    // create and store data object for visualization
    var graphData = [];
    var graphColor, graphOpacity, zIndex;
    for (var i=0; i < captionArray.length; i++){
      // var ySec = hmsToSec(captionArray[i][0]);
      var ySec = i;
      var yloc = transcriptScale(ySec);
      for (var j=0; j<taggedSentences[i].length;j++){
        var d = {};
        // var wPos = j/taggedSentences[i].length * w;
        var wPos = j/maxTranLine * w;
        d.timeStamp = ySec;
        d.y = yloc;
        d.lineInd = i;
        // d.speaker = captionArray[i][2];
        // d.x = wPos;
        // d.x = 0;
        d.x = wPos;
        var dWord = Object.keys(taggedSentences[i][j])[0];

        // color each word according to information content (grey if no
        // IC is found)
        graphColor = "#777";
        graphOpacity = 0.1;
        dWord = dWord.trim().toLowerCase();
        dWordFiltered = dWord.replace(/[^a-zA-Z0-9\-]/g, "");
        if (dWordFiltered in textMetadataObj) {
          // normalize information content value of text for optimal
          // weight scaling
          var normIC = textMetadataObj[dWordFiltered]["infoContent"]/
                       highestInfoContent;
          // graphOpacity = wtScale(normIC);
          // graphColor = "#084594";
          graphColor = wtScale(normIC);
          zIndex = zScale(normIC);
        }

        d.text = dWord;
        d.rowIndex = i;
        d.fillColor = graphColor;
        d.zindex = zIndex;
        // d.fillOpacity = graphOpacity;
        d.fillOpacity = 1;
        // d.height = 2;
        d.height = transcriptScale(1);
        d.width = w/maxTranLine * zIndex/5;
        // d.width = w/taggedSentences[i].length;
        if (d.fillColor !== "#777"){
          graphData.push(d);
        }
      }
    }

    // to ensure that the higher infocontent word representations stay
    // on top and are easily visible, we sort the array in ascending
    // order of z-index
    var sortedGraphData = graphData.sort(function(a,b) {
      return a.zindex-b.zindex;
    });

    console.log(sortedGraphData);

    var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([0, 0])
                .direction('e');
    transSvg.call(tip);
    var rects = transSvg.selectAll("rect")
             .data(sortedGraphData).enter()
             .append("rect")
             .attr("x", function (d) { return d.x; })
             .attr("y", function (d) { return d.y; })
             .attr("width", function (d) { return d.width; })
             .attr("z", function (d) { return d.zIndex; })
             .attr("rowIndex", function(d){return d.rowIndex;})
             .attr("height", function (d) { return d.height; })
             .attr("fill", function (d) {return d.fillColor;})
             .attr("fill-opacity", function (d) {return d.fillOpacity;})
             .on("mouseover", function(d){
               tip.html(d.text).show();
               // d3.select(this).attr("height", 5);
               if ((prevClickedTag === "") || !(isRowClicked)){
                 d3.select(this).attr('fill', hoverHighlight);
               }
               $("#transTable tr").eq(d.lineInd).children().last()
                                  .addClass("hoverHighlight");
             })
             .on("mouseout", function(d){
               tip.hide();
               // d3.select(this).attr("height", d.height);
               if ((prevClickedTag === "") || !(isRowClicked)){
                 d3.select(this).attr('fill', d.fillColor);
               }
               $("#transTable").find("td").removeClass("hoverHighlight");
             })
             .on("click", function(d){
               if (d.lineInd > 10){
                 scrollIndex = d.lineInd-1;
               } else {
                 scrollIndex = 0;
               }
               var transScrollItem = $('#transTable tr')
                                         .eq(scrollIndex)
                                         .children().last();
               $('#transContent').scrollTo($(transScrollItem),
                                           {duration: 'slow',
                                           transition: 'ease-in-out'});
              
             });

    var fisheye = d3.fisheye.circular().radius(100);
    transSvg.on('mousemove', function(){
        // implementing fisheye distortion
        fisheye.focus(d3.mouse(this));
        rects.each(function(d) { d.fisheye = fisheye(d); })
             .attr("x", function(d) { return d.fisheye.x; })
             .attr("y", function(d) { return d.fisheye.y; })
             .attr("width", function(d) {
                return d.width * d.fisheye.z;
             })
             .attr("height", function(d) { 
               return d.height * d.fisheye.z; 
             });
    });
    transSvg.on('mouseleave', function(){
        rects.each(function(d){d.fisheye = fisheye(d);})
             .attr("x", function(d){return d.x;})
             .attr("y", function(d){return d.y;})
             .attr("width", function(d){return d.width;})
             .attr("height", function(d){return d.height;});
    });

    return graphData;
}


function generateMultiWordGraphs(transGraphContainer, rawCaptionArray, listOfLowerCaseLines, taggedSentences, tagLabelList) {
    
    var tagLabel, tagIndicatorScale, 
        listOfNameTagLists = [], 
        tagTypeList = []
        rectClassList = []
        classColorList = []
        tagIndicatorScales = [];

    for (var ti=0; ti<tagLabelList.length;ti++){
      tagLabel = tagLabelList[ti];
      
      if (["PERSON", "LOCATION"].indexOf(tagLabel) !== -1){
          tagType = "NER";
          nameTagList = [tagLabel];
          if (tagLabel === "PERSON"){
              classColor = $("#showPeople").siblings()
                                           .css("background-color");
              rectClass = "peopleRect";
              tagIndicatorScale = 10;
          } else if (tagLabel === "LOCATION"){
              classColor = $("#showPlaces").siblings()
                                           .css("background-color");
              rectClass = "placeRect";
              tagIndicatorScale = 10;
          }
      } else {
          tagType = "POS";
          if (tagLabel === "noun"){
              nameTagList = ["NN", // common noun, singular or mass 
                             "NNS"];  // common noun, plural
              classColor = $("#showNouns").siblings()
                                           .css("background-color");
              rectClass = "nounRect";
              tagIndicatorScale = 3;
          
          } else if (tagLabel === "name") {
              nameTagList = ["NNP"]; // proper noun, singular
              classColor = $("#showNames").siblings()
                                          .css("background-color");
              tagIndicatorScale = 10;
          } else if (tagLabel === "verb") {
              nameTagList = ["VB", // verb in base form
                             "VBD", // verb, past tense
                             "VBG", // verb, present participle/gerund
                             "VBN", // verb, past participle
                             "VBP", // verb, prs.tense, 3rd p.plural?
                             "VPZ"]; // verb, prs tense, 3rd p.singular
              classColor = $("#showVerbs").siblings()
                                          .css("background-color");
              rectClass = "verbRect";
              tagIndicatorScale = 3;
          } else if (tagLabel === "adjective") {
              nameTagList = ["JJ", // adjective or numeral, ordinal
                             "JJR", // comparative adjective
                             "JJS"]; // superlative adjective
              classColor = $("#showAdjectives").siblings()
                                               .css("background-color");
              rectClass = "adjectiveRect";
              tagIndicatorScale = 3;
          } else if (tagLabel === "adverb"){
              nameTagList = ["RB", //adverb
                             "RBR", // comparative adverb
                             "RBS"]; // superlative adverb
              classColor = $("#showAdverbs").siblings()
                                            .css("background-color");
              rectClass = "adverbRect";
              tagIndicatorScale = 3;
          } else {
              console.log("Supplied tagLabel is not recognizable.");
          }
      }

      listOfNameTagLists.push(nameTagList);
      tagTypeList.push(tagType);
      rectClassList.push(rectClass);
      classColorList.push(classColor);
      tagIndicatorScales.push(tagIndicatorScale);
    }  

    captionArray = removeEmptyLines(rawCaptionArray);
    // d3.select(transGraphContainer).selectAll("svg").remove();
    var w = $(transGraphContainer).width();
    // docLength = hmsToSec(captionArray[captionArray.length-1][0]);
    docLength = captionArray.length;
    var h = $(transGraphContainer).height();
    var tagSvg = d3.select(transGraphContainer)
                     .append("svg")
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
    for (i=0; i<listOfLowerCaseLines.length;i++){
      if (maxTranLine < listOfLowerCaseLines[i].length){
        maxTranLine = listOfLowerCaseLines[i].length;
      }
    }

    // create and store data object for visualization
    var graphData = [];

    function updateGraphData(tLbl, rctCls, tTyp, nmTgLst, clsClr,tgScl){
      for (var i=0; i < captionArray.length; i++){
        // var ySec = hmsToSec(captionArray[i][0]);
        var ySec = i;
        var yloc = transcriptScale(ySec);
        for (var j=0; j<taggedSentences[i].length;j++){
          var d = {};
          // var wPos = j/taggedSentences[i].length * w;
          var wPos = j/maxTranLine * w;
          d.timeStamp = ySec;
          d.tagLabel = tLbl; 
          d.y = yloc;
          d.rectClass = rctCls;
          d.lineInd = i;
          d.x = wPos;
          var dWord = Object.keys(taggedSentences[i][j])[0];
          d.text = dWord;
          var label = taggedSentences[i][j][dWord][tTyp];
          if (nmTgLst.indexOf(label) === -1){
            d.fillColor = "rgba(255, 255, 255)";
            d.fillOpacity = 0;
            // d.height = 5;
          } else {
            d.fillColor = clsClr;
            d.fillOpacity = 1;
            d.height = transcriptScale(1);
          }
          // d.width = 1/taggedSentences[i].length * w;
          d.width = w/maxTranLine * tgScl;
          if (d.fillColor === clsClr){
            graphData.push(d);
          }
        }
      }
    }

    for (var ti=0;ti<tagLabelList.length;ti++){
      updateGraphData(tagLabelList[ti],
                      rectClassList[ti],
                      tagTypeList[ti],
                      listOfNameTagLists[ti],
                      classColorList[ti],
                      tagIndicatorScales[ti]);
    }

    var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([0, 10])
                .direction('e');
    tagSvg.call(tip);
    var rects = tagSvg.selectAll("rect")
             .data(graphData).enter()
             .append("rect")
             .attr("x", function (d) { return d.x; })
             .attr("y", function (d) { return d.y; })
             .attr("width", function (d) { return d.width; })
             .attr("z", 1)
             .attr("height", function (d) { return d.height; })
             .attr("tagLabel", function (d) { return d.tagLabel; })
             .attr("fill", function (d) {return d.fillColor;})
             .attr("fill-opacity", function (d) {return d.fillOpacity;})
             .attr("class", function(d) {return d.rectClass;})
             .on("mouseover", function(d){
               tip.html(d.text).show();
               if ((prevClickedTag === "") || !(isRowClicked)){
                 d3.select(this).attr('fill', hoverHighlight);
               }
               d3.select(this).attr('z', 50);
               $("#transTable tr").eq(d.lineInd).children().last()
                                  .addClass("hoverHighlight");
             })
             .on("mouseout", function(d){
               tip.hide();
               if ((prevClickedTag === "") || !(isRowClicked)){
                 d3.select(this).attr('fill', d.fillColor);
               }
               d3.select(this).attr('z', 1);
               $("#transTable").find("td").removeClass("hoverHighlight");
             })
             .on("click", function(d){
               if (d.lineInd > 10){
                 scrollIndex = d.lineInd-1;
               } else {
                 scrollIndex = 0;
               }
               var transScrollItem = $('#transTable tr')
                                         .eq(scrollIndex)
                                         .children().last();
               $('#transContent').scrollTo($(transScrollItem),
                                           {duration: 'slow',
                                           transition: 'ease-in-out'});
              
             });

    var fisheye = d3.fisheye.circular().radius(100);
    tagSvg.on('mousemove', function(){
        // implementing fisheye distortion
        fisheye.focus(d3.mouse(this));
        rects.each(function(d) { d.fisheye = fisheye(d); })
             .attr("x", function(d) { return d.fisheye.x; })
             .attr("y", function(d) { return d.fisheye.y; })
             .attr("width", function(d) {
                return d.width * d.fisheye.z;
             })
             .attr("height", function(d) { 
               return d.height * d.fisheye.z; 
             });
    });
    tagSvg.on('mouseleave', function(){
        rects.each(function(d){d.fisheye = fisheye(d);})
             .attr("x", function(d){return d.x;})
             .attr("y", function(d){return d.y;})
             .attr("width", function(d){return d.width;})
             .attr("height", function(d){return d.height;});
    });
    
    return graphData;
}

function returnSelectedLabels(){
  var outLabelList = [];
  var labelLookupList = ["PERSON", "LOCATION", "name", "noun",
                         "verb", "adjective", "adverb"];
  var labelIDList = ["#showPeople", "#showPlaces", "#showNames",
                     "#showNouns", "#showVerbs", "#showAdjectives",
                     "#showAdverbs"];
  for (var i=0;i<labelIDList.length;i++){
    if ($(labelIDList[i]).is(':checked')){
      outLabelList.push(labelLookupList[i]);
    }
  }
  return outLabelList;
}
