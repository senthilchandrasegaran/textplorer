function sketchViz(data, player, transGraphData){
  var sketchArray = $.csv.toArrays(data);
  var speakerList = [];
  // find the total number of people who committed sketches.
  for (var ind=1; ind<sketchArray.length; ind++){
    var speakerID = sketchArray[ind][2];
    if (speakerList.indexOf(speakerID) == -1){
      speakerList.push(speakerID);
    }
  }
  speakerList.sort();
  var numSpeakers = speakerList.length;
  // generate beautiful visuals
  d3.select("#sketchLogContent").selectAll("svg").remove();
  var sketchW = $("#sketchLogContent").width()-2;
  var sketchH = $("#sketchLog").height()-2;

  var sketchSVG = d3.select("#sketchLogContent").append("svg")
                    .attr("width", sketchW) //for border
                    .attr("height", sketchH) //for border
                    .style({"border" : "1px solid #d0d0d0"});
  var sketchScaleX = d3.scale.linear()
                      .domain([0, videoLenSec])
                      .range([0, sketchW]);
  var sketchScaleY = d3.scale.linear()
                      .domain([0, numSpeakers])
                      .range([0, sketchH]);
  var sketchPlotData = [];
  // begin loop to plot sketches on timeline
  for (speakerIndex=0; speakerIndex<numSpeakers; speakerIndex++){
    for (var i=1; i<sketchArray.length; i++){
      var spRow = sketchArray[i];
      var spID = spRow[2];
      var action = spRow[1];
      if (spRow.length > 1 && 
          speakerList[speakerIndex]==spID &&
          action == "commit"){
        var d = {}; // data for sketches
        var timeStampSec = hmsToSec(spRow[0]);
        d.x = sketchScaleX(timeStampSec);
        d.width = 7;
        d.height = sketchScaleY(0.8);
        d.y = sketchScaleY(numSpeakers-speakerIndex) - d.height;
        d.y0 = sketchScaleY(numSpeakers-speakerIndex-1);
        d.timeStamp = timeStampSec;
        d.speaker = spID;
        d.sketchID = spRow[3]; 
        var imagePath = '<img src="/images/sketches/'+
                        ("0"+ spRow[3]).slice(-2) + 
                        '.png" height="100">';
        d.info = spID + ": sketch " + spRow[3] + 
                  '<br>' + imagePath;
        d.fillColor = speakerColors[speakerIndex];
        sketchPlotData.push(d);
        prevTime = timeStampSec;
      } 
    }
  } 
  // end loop to plot sketches on timeline
  //begin loop to plot paths on timeline
  var pathData = [];
  for (var i=1; i<sketchArray.length; i++){
    var commitRow = sketchArray[i];
    // if the commit has happened at a time AFTER the video length,
    // stop everything, we've run out of what can be displayed on the
    // screen.
    if (hmsToSec(commitRow[0]) > videoLenSec){
      break;
    }
    var p = {}; // data for paths
    if (commitRow[1] === "commit"){
      // this means there was a commit.
      // save the sketch number, speaker ID, and timestamp
      var committedSketch = commitRow[3];
      var spID = commitRow[2];
      var commitTimeSec = hmsToSec(commitRow[0]);
      // then check the subsequent sketches to see if there is a
      // commit or checkout of the same sketch 
      var commitPathBroken = false; // assume the commit path is
                                // not broken yet, this will be
                                // explained later.
      for (var j=i+1; j<sketchArray.length; j++){
        var currentRow = sketchArray[j];
        if (currentRow[2] === spID && !commitPathBroken){
          // if the same person commits again, make a path
          if (currentRow[1] == "commit"){
            if (hmsToSec(currentRow[0]) < videoLenSec){
              p.x1 = sketchScaleX(commitTimeSec) + 2.5;
              // the + 2.5 is to center the line start point on
              // the width of the rectangle (width=5)
              p.y1index = numSpeakers-speakerList.indexOf(commitRow[2]); 
              p.y1 = sketchScaleY(numSpeakers - 
                      speakerList.indexOf(commitRow[2])-0.4);
              p.x2 = sketchScaleX(hmsToSec(currentRow[0]))+2.5;
              // the + 2.5 is to center the line end point on
              // the width of the rectangle (width=5)
              p.y2index = numSpeakers-
                          speakerList.indexOf(currentRow[2]); 
              p.y2 = sketchScaleY(numSpeakers - 
                        speakerList.indexOf(currentRow[2])-0.4);
              p.from = commitRow;
              p.to = currentRow;
              pathData.push(p);
            }
          } else {
            // if it is the same person, but no commit, don't
            // check for this user again, the commit path for
            // this sketch is broken, unless there is a checkout
            // if the same person, after committing a check, checks it
            // out again, then the commit path should not be considered
            // broken. This is a weird thing to happen, but it does.
            if (!(currentRow[1] === "checkout" &&
                  currentRow[2] === spID && 
                  currentRow[3] === committedSketch)){
              commitPathBroken = true; 
            }
          }
        } else {
          // This section means that we are looking at other
          // users, if they have "checked out" a sketch.
          if (currentRow[3] === committedSketch){
            var checkerOuter = currentRow[2];
            // now for that user, check future actions to see if
            // there are immediate commits by the same person.
            // If not, abort.
            for (var k=j+1; k<sketchArray.length; k++){
              var nextRow = sketchArray[k];
              if (nextRow[2] === checkerOuter){
                if (nextRow[1] === "commit"){
                  // this means there is a path.
                  p = {};
                  if (hmsToSec(nextRow[0]) < videoLenSec){
                    p.x1 = sketchScaleX(commitTimeSec) + 2.5;
                    p.y1 = sketchScaleY(numSpeakers - 
                            speakerList.indexOf(spID)-0.5);
                    p.x2 = sketchScaleX(hmsToSec(nextRow[0]))+2.5;
                    p.y2 = sketchScaleY(numSpeakers - 
                            speakerList.indexOf(nextRow[2])-0.5);
                    p.from = commitRow;
                    p.to = nextRow;
                    pathData.push(p);
                    // no more checks for this checkerOuter
                    break;
                  }
                } else {
                  // If there is no commit,
                  // this means the checkout path is broken
                  break;
                }
              }
              // if the next row is not the same person, keep
              // looking for the next action by the same person
            }
          }
          // if the current row's sketch is not the same as the
          // committed sketch, keep looking.
        }
      }
    }
  }
  // end loop to plot paths on timeline
  var sketchPaths = sketchSVG.selectAll(".pathTrace")
            .data(pathData)
            .enter()
            .append("svg:line")
            .attr("class", "pathTrace")
            .attr("stroke-width", 2)
            .attr("x1", function (d){return d.x1})
            .attr("y1", function (d) {return d.y1})
            .attr("x2", function (d) {return d.x2})
            .attr("y2", function (d) {return d.y2});

  var sketchTip = d3.tip()
                    .attr('class', 'd3-tip')
                    .direction('s');
  sketchSVG.call(sketchTip);
  var sketchRects = sketchSVG.selectAll("rect")
        .data(sketchPlotData)
        .enter()
        .append("rect")
        .attr("x", function(d){return d.x;})
        .attr("y", function(d){return d.y;})
        .attr("width", function(d){return d.width;})
        .attr("height", function(d){return d.height;})
        .attr("fill", function(d){return d.fillColor;})
        .attr("stroke", "#ffffff")
        .attr("z-index", "10")
        .on('mouseover', function(d){
          d3.select(this).attr('y', d.y0);
          d3.select(this).attr('fill', greenHighlight);
          sketchTip.html(d.info).show();
        })
        .on('mouseout', function(d){
          d3.select(this).attr('height', d.height);
          d3.select(this).attr('width', d.width);
          d3.select(this).attr('y', d.y);
          d3.select(this)
            .attr("fill", function(d){return d.fillColor;});
          sketchTip.hide();
        })
        .on('click', function(d){
          if (d3.event.ctrlKey || d3.event.metaKey){
            $('#imgPath-content').children().remove();
            d3.select(this).transition()
                            .attr("r", 12);
            var imagePath = '<img src="/images/sketches/'+
                            ("0"+ d.sketchID).slice(-2) + 
                            '.png" height="600">';
            $("#imgPath-content").append(imagePath);
            document.getElementById('imgPath')
                    .style.visibility = 'visible';
            
          } else {
            player.currentTime(d.timeStamp);
            for (var i=0; i<transGraphData.length-1; i++){
              var tObj = transGraphData[i];
              var tObjNext = transGraphData[i+1];
              if (d.timeStamp >= tObj.timeStamp &&
                  d.timeStamp <= tObjNext.timeStamp){
                transGraphIndex = i+1;
                var scrollIndex = 0;
                if (i > 10 ||
                    i < transGraphData.length-10){
                  scrollIndex = i-10;
                } else {
                  scrollIndex = 0;
                }
                var transScrollItem = $('#transTable tr')
                                          .eq(scrollIndex)
                                          .children().last();
                var transClickItem = $('#transTable tr')
                                          .eq(transGraphIndex)
                                          .children().last();
                transClickItem.addClass('hoverHighlight')
                              .delay(2000)
                              .removeClass('hoverHighlight', 
                                           {duration:500});
                // this small snippet below to scroll the transcript to
                // show the line corresponding to the item selected in
                // transgraph
                $('#transContent').scrollTo($(transScrollItem),
                                            {duration: 'slow',
                                             transition: 'ease-in-out'});
              }
            }
          }
        });
  var pText = sketchSVG.selectAll("text")
                       .data(speakerList)
                       .enter()
                       .append("text")
                       .attr("x", 2)
                       .attr("y", function(d, i){
                          return sketchScaleY(numSpeakers - 
                                  speakerList.indexOf(d) - 0.3);
                       })
                       .text(function (d) {
                         return d;
                       })
                       .attr("font-family", "sans-serif")
                       .attr("font-size", "10px")
                       .attr("fill", "#c0c0c0");
}
