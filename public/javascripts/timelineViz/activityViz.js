function activityViz(activitydata, player, transGraphData){
  var activityArray = activitydata.split("\n");
  var numSpeakers = activityArray[0].split(",").length - 1;
  var speakerList = activityArray[0]
                      .split(",")
                      .slice(1, activityArray[0].length-1);
  // generate beautiful visuals
  var maxAct = 0;
  var minAct = 1;
  for (var i=1;i<activityArray.length; i++){
    var row = activityArray[i].split(",");
    rowNums = row.slice(1, row.length-1);
    var rowMax = Math.max.apply(Math, rowNums);
    var rowMin = Math.min.apply(Math, rowNums);
    if (maxAct < rowMax){
      maxAct = rowMax;
    }
    if (minAct > rowMin){
      minAct = rowMin;
    }
  }
  d3.select("#activityLogContent").selectAll("svg").remove();
  var activityW = $("#activityLogContent").width()-2;
  var activityH = $("#activityLog").height()-2;

  var activitySVG = d3.select("#activityLogContent").append("svg")
                    .attr("width", activityW)
                    .attr("height", activityH)
                    .style({"border" : "1px solid #d0d0d0"});
  var activityScaleX = d3.scale.linear()
                      .domain([0, videoLenSec])
                      .range([0, activityW]);
  var activityScaleY = d3.scale.linear()
                      .domain([0, numSpeakers])
                      .range([0, activityH]);
  var activityScaleSp = d3.scale.linear()
                        .domain([0,1])
                        .range([0, activityH/numSpeakers]);
  var actScale = d3.scale.pow().exponent(1.2)
                          .domain([minAct,maxAct])
                          .range([0,1]);
  var activityPlotData = [];

  for (speakerIndex=0; speakerIndex<numSpeakers; speakerIndex++){
    var prevTime = 0;
    for (var i=1; i<activityArray.length; i++){
      var spRow = activityArray[i].split(",");
      if (spRow.length > 1){
        var d = {};
        var timeStampSec = hmsToSec(spRow[0]);
        d.x = activityScaleX(timeStampSec);
        d.width = 2;
        // d.width = activityScaleX(timeStampSec - prevTime);
        //d.height = activityScaleY(spRow[speakerIndex+1]/maxAct);
        //d.height = activityScaleY(actScale(heightValue));
        d.height = activityScaleY(1);
        d.y = activityScaleY(numSpeakers-speakerIndex) - d.height;
        d.y0 = activityScaleY(numSpeakers-speakerIndex-1);
        d.timeStamp = timeStampSec;
        d.speaker = speakerList[speakerIndex];
        d.actValue = parseFloat(spRow[speakerIndex+1]); 
        d.fillColor = speakerColors[speakerIndex];
        d.fillOpacity = actScale(spRow[speakerIndex+1]);
        //d.fillOpacity = 1;
        activityPlotData.push(d);
        prevTime = timeStampSec;
      }
    }
  }
  var activityTip = d3.tip()
                    .attr('class', 'd3-tip')
                    .direction('s');
  activitySVG.call(activityTip);
  var activityRects = activitySVG.selectAll("rect")
        .data(activityPlotData)
        .enter()
        .append("rect")
        .attr("x", function(d){return d.x;})
        .attr("y", function(d){return d.y;})
        .attr("width", function(d){return d.width;})
        .attr("height", function(d){return d.height;})
        .attr("height", function(d){return d.height;})
        .attr("fill", function(d){return d.fillColor;})
        .attr("fill-opacity", function(d){return d.fillOpacity;})
        .attr("z-index", "10")
        .on('mouseover', function(d){
          d3.select(this).attr('height', activityScaleY(1));
          d3.select(this).attr('width', 2);
          d3.select(this).attr('y', d.y0);
          d3.select(this).attr('fill', greenHighlight);
          d3.select(this).attr('fill-opacity', 1);
          activityTip.html(d.speaker + ": " + d.actValue).show();
        })
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
          activityTip.hide();
        })
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
