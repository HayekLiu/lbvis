<template>
  <div id='overallContainer' ref="overallContainer">
    <div id="overall-control">
      <div id="overall-control-top">
        <div class="radiobutton" id="radiobutton-left">
          <span id="overviewDiv">
            &nbsp&nbsp&nbsp&nbspY-axis-scale:&nbsp
            <input name="optionsRadios" id="linearScale" type="radio" checked>&nbspLinear&nbsp
            <input name="optionsRadios" id="logScale" type="radio">&nbspLog&nbsp
          </span>

          <span id="overviewBox">
            <input name="box" id="boxCheck" type="checkbox">&nbspBoxplot of Proc. Exec. Time&nbsp&nbsp&nbsp
          </span>
        </div>
      </div>
      <div id="overall-control-bottom">
      </div>
    </div>
    <div id="overall-bar">
    </div>
  </div>
</template>

<script>
import BootstrapVue from 'bootstrap-vue'
import { mapActions, mapGetters } from 'vuex'
import $ from 'jquery'
import d3 from 'd3'
export default {
  components: { },
  data() {
    return {

    }
  },
  mounted() {
    this.init();
  },
  computed: {
      ...mapGetters({
        graphData: 'getGraphData'
      }),
  },
  watch: {
    graphData: function(data) {
      var self = this;
      this.drawLineChart(data['balances'])
    }
  },

  methods: {
    ...mapActions(['setFilterRoundIndex']),

    init() {
      var self = this;

      self.lineWidth = 0
      self.lineHeight = 0

      self.line = null

      self.mx_line = null;
      self.my_line = null;

      self.max_rwl = null
      self.min_rwl = null

      self.brushedIndex = [-1,-1]
      self.isBrushed = false;

      self.scale = 1; // 1 for linear and 0 for log
      self.isAddBox = 0;
      self.x_line = null
      self.y_line = null
      self.y_wl = null

      self.lineG = null;
    },

    drawLineChart(data) {
      //console.log(data)
      var self = this;
      // self.setSelectRoundIndex(new Array(0, data.length-1))
      var containerWidth = +$('#overview-container').width()
      var containerHeight = +$('#overview-container').height()
      var margin = {top: 10, right: 15, bottom: 35, left: 15}
      var svg = d3.select("#overview-container")
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight) // *3
      var width = +containerWidth - margin.left - margin.right
      var height = +containerHeight - margin.top - margin.bottom

      var sg = svg.append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      self.lineWidth = width
      self.lineHeight = height

      self.x_line = d3.scale.linear().range([0, self.lineWidth]);
      self.y_line = d3.scale.linear().range([self.lineHeight, 0]);

      self.y_wl = d3.scale.linear().range([self.lineHeight, 0]);

      self.lineG = sg.append("g")
        .attr('transform', 'translate(0,0)')
        .attr('class', 'line-g');

      self.mx_line = d3.max(data, function (d) { return d.time });
      self.my_line = d3.max(data, function (d) { return d.balance });

      self.max_rwl = d3.max(data, function (d) { return d.maxwl })
      self.min_rwl = d3.min(data, function (d) { return d.minwl })

      console.log(self.mx_line, self.my_line, self.max_rwl, self.min_rwl);
      self.x_line.domain([0, self.mx_line])  // Math.ceil(mx_line)
      self.y_line.domain([1, self.my_line]) // Math.ceil(my_line)

      self.y_wl.domain([0, self.max_rwl]);

      $("#boxCheck").click(function(evt) {
        console.log("boxchecked");
        self.isAddBox = !self.isAddBox;

        self.updateBoxplot(self.isAddBox, data);
      });

      $("#linearScale").click(function(evt) {
        console.log('linearSelected')
        
        self.scale = 1;
        self.updateLineChartByLieanrLog(self.scale, data)
      });

      $("#logScale").click(function(evt) {
        console.log('logSelected')

        self.scale = 0;
        self.updateLineChartByLieanrLog(self.scale, data)
      });

      // build the arrow.
      svg.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("stroke", "#000")
        .attr("fill", "none")

      self.lineG.append("line")
        .attr('x1', 0)
        .attr('y1', self.lineHeight)
        .attr('x2', 0)
        .attr('y2', 0)
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1)
        .attr("marker-end", "url(#end)");

      self.lineG.append("line")
        .attr('x1', 0)
        .attr('y1', self.lineHeight)
        .attr('x2', self.lineWidth)
        .attr('y2', self.lineHeight)
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1)
        .attr("marker-end", "url(#end)");
/*      
       lineG.append('text')
       .text('Max/Avg Workload')
       .attr('text-anchor', 'middle')
       .attr('font-size', '8px')
       .attr('transform', function() {
         return 'translate(48, 5)'
       });

       lineG.append('text')
       .text('Execution Time')
       .attr('x', lineWidth - 30)
       .attr('y', lineHeight + 10)
       .attr('text-anchor', 'middle')
       .attr('font-size', '8px');
*/       
      function get_index(left, right){
        var i, index_left=0, index_right=data.length-1;
        i = 0;
        while (i < data.length){
          if(data[i].time >= left){
            index_left = i;
            break;
          }
          i+=1;
        }
        i = data.length;
        while (i -= 1){
          if(data[i].time <= right){
            index_right = i;
            break;
          }
        }
        return new Array(index_left, index_right);
      }

      var brush = d3.svg.brush()
          .x(self.x_line)
          .on("brushend", function() {
              self.brushedIndex = get_index(brush.extent()[0], brush.extent()[1])
              console.log("brushed index:", self.brushedIndex)
              self.setFilterRoundIndex(self.brushedIndex)

              // show sth in the range
              self.lineG.selectAll(".brushedtexts").remove();
              self.lineG.selectAll(".texts").data(data).enter().append('text')
                .text(function (d,i) {
                  if (i >= self.brushedIndex[0] && i <= self.brushedIndex[1]) return d.time.toFixed(1)+"s"; 
                })
                .attr("class", "brushedtexts")
                .attr('x', function (d,i) {
                  return self.x_line(d.time);
                })
                .attr('y', function (d,i) {
                  return self.lineHeight - 4 // y_line(d.y) + 10;
                })
                .attr('text-anchor', 'middle')
                .style('font-size', 10);

              self.lineG.selectAll(".lbtexts").remove();
              self.drawLBTexts(data);

              self.lineG.selectAll(".roundtexts")
                .style("font-weight", function (d, i) {
                  if (i >= self.brushedIndex[0] && i <= self.brushedIndex[1]) return "bold";
                })
                .style('font-size', function (d, i) {
                  if (i >= self.brushedIndex[0] && i <= self.brushedIndex[1]) return 12;
                  else return 10
                })
          });

      self.line = d3.svg.line()
        .x(function (d, i) {
          return self.x_line(d.time) //i * lineWidth / (data.length - 1);
        })
        .y(function (d, i) {
          return self.y_line(d.balance);
        })

      self.drawLine(data);

      self.lineG.append("g")
        .attr("class", "brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height + 7);

      self.drawDotsOnLine(data)

      self.lineG.selectAll(".texts").data(data).enter().append('text')
        .text(function (d,i) {
          if (i < 45 && i != 0) return i; 
        })
        .attr("class", "roundtexts")
        .attr('x', function (d,i) {
          return self.x_line(d.time);
        })
        .attr('y', function (d,i) {
          return self.lineHeight + 12 // y_line(d.y) + 10;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', 10);

    },

    drawLine(data)
    {
      var self = this;
      // line chart
      self.lineG.append("path")
        .datum(data)
        .attr('class', 'load-balance-line')
        .attr('fill', 'none')
        .attr("stroke", "#000")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", function (d) {
          return 1;
        })
        .attr("d", self.line);
    },

    drawDotsOnLine(data) 
    {
      var self = this;

      // dot on lines
      self.lineG.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", function(d, i) {
          if (i < 45 && i != 0) return 2.5
          else return 0
        })
        .attr("cx", function (d, i) {
          return self.x_line(d.time); // i * lineWidth / (data.length - 1);
        })
        .attr("cy", function (d, i) {
          return self.y_line(d.balance);
        })
        .attr("fill", "white")
        .attr("stroke", "black")
        .on("mouseover", function (d, i) {
          self.lineG.append("line")
            .attr("class", "diffline")
            .attr('x1', 0)
            .attr('y1', function () {
              return self.y_line(d.balance);
            })
            .attr('x2', self.lineWidth)
            .attr('y2', function () {
              return self.y_line(d.balance);
            })
            .attr('fill', 'none')
            .attr('stroke', 'light gray')
            .attr('stroke-width', 0.25)
            .style("stroke-dasharray","5,5")
        })
        .on("mouseout", function (d) {
          self.lineG.select(".diffline").remove()
        });
    },

    drawLBTexts(data)
    {
      var self = this;

      self.lineG.selectAll(".texts").data(data).enter().append('text')
        .text(function (d,i) {
          if (i >= self.brushedIndex[0] && i <= self.brushedIndex[1]) return d.balance.toFixed(3);  
        })
        .attr("class", "lbtexts")
        .attr('x', function (d,i) {
          return self.x_line(d.time);
        })
        .attr('y', function (d,i) {
          return self.y_line(d.balance) - 10;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', 10);
    },

    updateBoxplot(isAddBox, data) 
    {
      var self = this

      if (isAddBox) { // draw boxplot
        // box plot
        self.lineG.selectAll(".boxplotminline") // min line
          .data(data).enter()
          .append("line") 
          .attr("class", "boxplotminline")
          .attr('x1', function (d, i) { 
            return self.x_line(d.time) - 10
          })
          .attr('y1', function (d, i) {
            return self.y_wl(d.minwl)
          })
          .attr('x2', function (d, i) { 
            return self.x_line(d.time) + 10
          })
          .attr('y2', function (d, i) {
            return self.y_wl(d.minwl)
          })
          .attr('fill', 'none')
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)

        self.lineG.selectAll(".boxplotmaxline")  // max line
          .data(data).enter()
          .append("line") 
          .attr("class", "boxplotmaxline")
          .attr('x1', function (d, i) { 
            return self.x_line(d.time) - 10
          })
          .attr('y1', function (d, i) {
            return self.y_wl(d.maxwl)
          })
          .attr('x2', function (d, i) { 
            return self.x_line(d.time) + 10
          })
          .attr('y2', function (d, i) {
            return self.y_wl(d.maxwl)
          })
          .attr('fill', 'none')
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)

        self.lineG.selectAll(".boxplotverticalline") // vertical dashline
          .data(data).enter()
          .append("line") 
          .attr("class", "boxplotverticalline")
          .attr('x1', function (d, i) {
            return self.x_line(d.time)
          })
          .attr('y1', function (d, i) {
            return self.y_wl(d.maxwl)
          })
          .attr('x2', function (d, i) {
            return self.x_line(d.time)
          })
          .attr('y2', function (d, i) {
            return self.y_wl(d.minwl)
          })
          .attr('fill', 'none')
          .style("stroke-dasharray","3,3")
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)

        self.lineG.selectAll(".boxplotrects") // box
          .data(data)
          .enter().append("rect")
          .attr("class", "boxplotrects")
          .attr("x", function (d, i) { 
            return self.x_line(d.time) - 10
          })
          .attr("y", function (d, i) { 
            return self.y_wl(d.quartile2)
          })
          .attr("width", 10*2)
          .attr("height", function (d, i) {
            return self.y_wl(d.quartile1) - self.y_wl(d.quartile2)
          })
          .attr("fill", "white")
          .attr("stroke-width", 1)
          .attr("stroke", "black")

        self.lineG.selectAll(".boxplotavgline") // median line on box
          .data(data).enter()
          .append("line") 
          .attr("class", "boxplotavgline")
          .attr('x1', function (d, i) { 
            return self.x_line(d.time) - 10
          })
          .attr('y1', function (d, i) {
            return self.y_wl(d.median)
          })
          .attr('x2', function (d, i) { 
            return self.x_line(d.time) + 10
          })
          .attr('y2', function (d, i) {
            return self.y_wl(d.median)
          })
          .attr('fill', 'none')
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)
      } else { // remove boxplot
        d3.selectAll('.boxplotminline').remove();
        d3.selectAll('.boxplotmaxline').remove();
        d3.selectAll('.boxplotverticalline').remove();
        d3.selectAll('.boxplotrects').remove();
        d3.selectAll('.boxplotavgline').remove();
      }
    },

    updateLineChartByLieanrLog(scale, data)
    {
      var self = this

      if (scale == 1) {
        self.y_line = d3.scale.linear().range([self.lineHeight, 0]);
        self.y_wl = d3.scale.linear().range([self.lineHeight, 0]);
      } else {
        self.y_line = d3.scale.log().range([self.lineHeight, 0]);
        self.y_wl = d3.scale.log().range([self.lineHeight, 0])
      }
      self.y_line.domain([1, self.my_line]) // Math.ceil(my_line)
      self.y_wl.domain([0, self.max_rwl]);

      // line chart
      self.lineG.selectAll('path').remove();
      self.drawLine(data)

      // dot on lines
      self.lineG.selectAll('.dot').remove();
      self.drawDotsOnLine(data) 

      // if (self.IsBrushed) 
      {
        self.lineG.selectAll(".lbtexts").remove();
        self.drawLBTexts(data)
      }
    }
  }
}
</script>
