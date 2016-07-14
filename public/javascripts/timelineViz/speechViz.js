function speechViz(speechdata, player, transGraphData){
  // parse speech data
  var speechArray = speechdata.split("\n");
  var numSpeakers = speechArray[0].split(",").length - 1;
  var speakerList = speechArray[0]
                      .split(",")
                      .slice(1, speechArray[0].length-1);
  // generate beautiful visuals
  d3.select("#speechLogContent").selectAll("svg").remove();
  var speechW = $("#speechLogContent").width()-2;
  var speechH = $("#speechLog").height()-2;

  var speechSVG = d3.select("#speechLogContent").append("svg")
                    .attr("width", speechW) //for border
                    .attr("height", speechH) //for border
                    .style({"border" : "1px solid #d0d0d0"});
  var speechScaleX = d3.scale.linear()
                      .domain([0, videoLenSec])
                      .range([0, speechW]);
  var speechScaleY = d3.scale.linear()
                      .domain([0, numSpeakers])
                      .range([0, speechH]);
  var speechScaleSp = d3.scale.linear()
                        .domain([0,1])
                        .range([0, speechH/numSpeakers]);
  // create carefully structured data array
  var speechPlotData = [];
  for (speakerIndex=0; speakerIndex<numSpeakers; speakerIndex++){
    var prevTime = 0;
    for (var i=1; i<speechArray.length; i++){
      var spRow = speechArray[i].split(",");
      if (spRow.length > 1){
        var d = {};
        var timeStampSec = hmsToSec(spRow[0]);
        d.x = speechScaleX(timeStampSec);
        d.width = speechScaleX(timeStampSec - prevTime);
        d.height = speechScaleY(spRow[speakerIndex+1]);
        d.y = speechScaleY(numSpeakers-speakerIndex) - d.height;
        d.y0 = speechScaleY(numSpeakers-speakerIndex-1);
        d.timeStamp = timeStampSec;
        d.speaker = speakerList[speakerIndex];
        d.participationValue = parseFloat(spRow[speakerIndex+1]); 
        d.fillColor = speakerColors[speakerIndex];
        speechPlotData.push(d);
        prevTime = timeStampSec;
      }
    }
  }

  /* Create tooltip for displaying content on mouseover */
  var speechTip = d3.tip()
                    .attr('class', 'd3-tip')
                    .direction('s');
  speechSVG.call(speechTip);
  // use data array to generate d3 representations
  var speechRects = speechSVG.selectAll("rect")
        .data(speechPlotData)
        .enter()
        .append("rect")
        .attr("x", function(d){return d.x;})
        .attr("y", function(d){return d.y;})
        .attr("width", function(d){return d.width;})
        .attr("height", function(d){return d.height;})
        .attr("fill", function(d){return d.fillColor;})
        .attr("z-index", "10")
        /* INTERACTIONS WITH THE VISUALIZATION */
        /* Show tooltip on mouseover */
        .on('mouseover', function(d){
          d3.select(this).attr('height', speechScaleY(1));
          d3.select(this).attr('width', 2);
          d3.select(this).attr('y', d.y0);
          d3.select(this).attr('fill', greenHighlight);
          speechTip.html(d.speaker).show();
        })
        /* hide tooltip on mouseout */
        .on('mouseout', function(d){
          d3.select(this).attr('height', d.height);
          d3.select(this).attr('width', d.width);
          d3.select(this).attr('y', d.y);
          d3.select(this)
            .attr("fill", function(d){return d.fillColor;});
          speechTip.hide();
        })
        /* On mouse click, skip video to corresponding time and
         * scroll transcript to corresponding speech event */
        .on('click', function(d){
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
              // this small snippet below to scroll the transcript to show
              // the line corresponding to the item selected in transgraph
              $('#transContent').scrollTo($(transScrollItem),
                                          {duration: 'slow',
                                           transition: 'ease-in-out'});
            }
          }
        });
}
