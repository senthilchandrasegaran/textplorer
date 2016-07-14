function newDataViz(newData, player, transGraphData){
  var newDataArray = newData.split("\n");
  var numSpeakers = newDataArray[0].split(",").length - 1;
  var speakerList = newDataArray[0]
                      .split(",")
                      .slice(1, newDataArray[0].length-1);
  // generate visuals
  d3.select("#newDataSeriesContent").selectAll("svg").remove();
  var newDataW = $("#newDataSeriesContent").width()-2;
  var newDataH = $("#newDataSeries").height()-2;

  var newDataSVG = d3.select("#newDataSeriesContent").append("svg")
                     .attr("width", newDataW)
                     .attr("height", newDataH)
                     .style({"border" : "1px solid #d0d0d0"});
  var newDataScaleX = d3.scale.linear()
                        .domain([0, videoLenSec])
                        .range([0, newDataW]);
  var newDataScaleY = d3.scale.linear()
                        .domain([0, numSpeakers])
                        .range([0, newDataH]);
  var newDatascalesp = d3.scale.linear()
                         .domain([0,1])
                         .range([0, newDataH/numSpeakers]);
  var newPlotData = [];

  for (speakerIndex=0; speakerIndex<numSpeakers; speakerIndex++){
    var prevTime = 0;
    for (var i=1; i<newDataArray.length; i++){
      var spRow = newDataArray[i].split(",");
      if (spRow.length > 1){
        var d = {};
        var timeStampSec = hmsToSec(spRow[0]);
        d.x = newDataScaleX(timeStampSec);
        d.width = 2;
        d.height = newDataScaleY(spRow[speakerIndex+1]);
        d.y = newDataScaleY(numSpeakers-speakerIndex) - d.height;
        d.y0 = newDataScaleY(numSpeakers-speakerIndex-1);
        d.timeStamp = timeStampSec;
        d.speaker = speakerList[speakerIndex];
        d.dataValue = parseFloat(spRow[speakerIndex+1]);
        d.fillColor = speakerColors[speakerIndex];
        newPlotData.push(d);
        prevTime = timeStampSec;
      }
    }
  }
  var newDataTip = d3.tip()
                    .attr('class', 'd3-tip')
                    .direction('s');
  newDataSVG.call(newDataTip);
  var newDataRects = newDataSVG.selectAll("rect")
        .data(newPlotData)
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
          d3.select(this).attr('height', newDataScaleY(1));
          d3.select(this).attr('width', 2);
          d3.select(this).attr('y', d.y0);
          d3.select(this).attr('fill', greenHighlight);
          d3.select(this).attr('fill-opacity', 1);
          newDataTip.html(d.speaker + ": " + d.dataValue).show();
        })
        /* hide tooltip on mouseout */
        .on('mouseout', function(d){
          d3.select(this).attr('height', d.height);
          d3.select(this).attr('width', d.width);
          d3.select(this).attr('y', d.y);
          d3.select(this)
            .attr("fill", function(d){
              return d.fillColor;
            })
            .attr("fill-opacity", function(d){
              return d.fillOpacity;
            })
          newDataTip.hide();
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
              // this small snippet below to scroll the transcript to
              // show the line corresponding to the item selected in
              // transgraph
              $('#transContent').scrollTo($(transScrollItem),
                                          {duration: 'slow',
                                           transition: 'ease-in-out'});
            }
          }
        });
}
