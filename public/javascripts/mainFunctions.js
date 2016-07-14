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


// Function that takes all the lines in the transcript, removes stop
// words, and returns a list of words and their frequencies.
// "wordsToRemove" is an optional argument. It represents a list of
// words removed from the tagList. When this is passed to the
// function, it removes these words from the list of unique words.
// NOTE: Use the wordsToRemove to populate a div for the user.
function makeWordList(lowerCaseLines, wordsToRemove, sortMethod) {

// list of stopwords from www.jasondavies.com
// stop word removal code from the same source, but modified to suit
// current application

  var stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall)$/;
  var punctuation = /[!&()*+,--\.\/:;<=>?\[\\\]^`\{|\}~]+/g;
  var discard = /^(@|https?:)/;
  var htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
  var wordList = [];
  var tagList = [];
  wordList = wordList.concat.apply(wordList, lowerCaseLines);
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
  var wordObj = {};
  if (sortMethod == 'ic'){
    //the method needs to be sorted based on information content
    var sendList = {};
    sendList.data = conceptList;
    $.post("/infoContent", sendList, function (data, error) {
      console.log(data.data);
      for (var i in data.data) {
            wordObj[data[i][0]] = data[i][1];
      }
    });
  } else {
  // if no method is specified, sort it based on frequency.
    for (var i = 0, j = conceptList.length; i < j; i++) {
      if (wordObj[conceptList[i]]) {
          wordObj[conceptList[i]]++;
      }
      else {
          wordObj[conceptList[i]] = 1;
      }
    }
  }
  
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
  var fontScale = d3.scale.linear()
                    .domain([maxfreq, 1])
                    .range([25, 10]);

  // Generate html of the word list, each word scaled according to its
  // frequency. Return this value.
  for (var tagNum in tagList) {
      tagspans += '<text id="tag ' +
             tagNum + '" style = "font-size:' +
             Math.round(fontScale(tagList[tagNum][1])) + 'pt;' +
             ' color:' + wordCloudColor + ');">' +
             tagList[tagNum][0] +
             ' </text>';
      tagFreq.push(tagList[tagNum][1]);
  }
  return tagspans;
}

// Return a list of lines and spans from selected lines in transcript
function returnSpans(selText){
  var spanArray = [];
  var spanLineArray = [];
  var rangeObject = $(selText.getRangeAt(0)); 
  var startSpan = rangeObject.attr("startContainer");
  var endSpan = rangeObject.attr("endContainer");
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
                $("#"+divTitleName)
                  .text(divTitleText+
                        " [click to contract view]");
              }).removeClass('minimize');
      } else {
          $("#"+divName).animate({ width: 1 }, 200, "swing",
              function(){
                $("#"+divTitleName)
                  .text(divTitleText + " [click to expand view]");
              }).addClass('minimize');
      }
  });
}

