<template>
  <div>
 
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
    ...mapActions(['setSelectRoundIndex']),
    drawLineChart(data) {
      var self = this;
      // self.setSelectRoundIndex(new Array(0, data.length-1))
      var containerWidth = +$('#overview-container').width()
      var containerHeight = +$('#overview-container').height()
      var margin = {top: 15, right: 15, bottom: 15, left: 15}
      var svg = d3.select("#overview-container")
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight) // *3
      var width = +containerWidth - margin.left - margin.right
      var height = +containerHeight - margin.top - margin.bottom

      var sg = svg.append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      var lineWidth = width,
          lineHeight = height

      var x_line = d3.scale.linear().range([0, lineWidth]),
          y_line = d3.scale.log().range([lineHeight, 0]);

      var lineG = sg.append("g")
        .attr('transform', 'translate(0,0)')
        .attr('class', 'line-g');

      var mx_line = d3.max(data, function (d) { return d.x });
      var my_line = d3.max(data, function (d) { return d.y });

      console.log(mx_line, my_line);
      x_line.domain([0, mx_line])  // Math.ceil(mx_line)
      y_line.domain([1, my_line]) // Math.ceil(my_line)

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

      lineG.append("line")
        .attr('x1', 0)
        .attr('y1', lineHeight)
        .attr('x2', 0)
        .attr('y2', 0)
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1)
        .attr("marker-end", "url(#end)");

      lineG.append("line")
        .attr('x1', 0)
        .attr('y1', lineHeight)
        .attr('x2', lineWidth)
        .attr('y2', lineHeight)
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
          if(data[i].x >= left){
            index_left = i;
            break;
          }
          i+=1;
        }
        i = data.length;
        while (i -= 1){
          if(data[i].x <= right){
            index_right = i;
            break;
          }
        }
        return new Array(index_left, index_right);
      }

      var brush = d3.svg.brush()
          .x(x_line)
          .on("brushend", function() {
              var index = get_index(brush.extent()[0], brush.extent()[1])
              console.log("brushed index:", index)
              self.setSelectRoundIndex(index)

              // show sth in the range
              lineG.selectAll(".brushedtexts").remove();
              lineG.selectAll(".texts").data(data).enter().append('text')
                .text(function (d,i) {
                  if (i >= index[0] && i <= index[1]) return d.x.toFixed(1)+"s"; 
                })
                .attr("class", "brushedtexts")
                .attr('x', function (d,i) {
                  return x_line(d.x);
                })
                .attr('y', function (d,i) {
                  return lineHeight - 4 // y_line(d.y) + 10;
                })
                .attr('text-anchor', 'middle')
                .style('font-size', 10);

              lineG.selectAll(".lbtexts").remove();
              lineG.selectAll(".texts").data(data).enter().append('text')
                .text(function (d,i) {
                  if (i >= index[0] && i <= index[1]) return d.y.toFixed(3);  
                })
                .attr("class", "lbtexts")
                .attr('x', function (d,i) {
                  return x_line(d.x);
                })
                .attr('y', function (d,i) {
                  return y_line(d.y) - 10;
                })
                .attr('text-anchor', 'middle')
                .style('font-size', 10);

              lineG.selectAll(".roundtexts")
                .style("font-weight", function (d, i) {
                  if (i >= index[0] && i <= index[1]) return "bold";
                })
                .style('font-size', function (d, i) {
                  if (i >= index[0] && i <= index[1]) return 12;
                  else return 10
                })
          });

      var line = d3.svg.line()
        .x(function (d, i) {
          return x_line(d.x) //i * lineWidth / (data.length - 1);
        })
        .y(function (d, i) {
          return y_line(d.y);
        })

      lineG.append("path")
        .datum(data)
        .attr('class', 'load-balance-line')
        .attr('fill', 'none')
        .attr("stroke", "#000")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", function (d) {
          return 1;
        })
        .attr("d", line);

      lineG.append("g")
        .attr("class", "brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height + 7);

  // dot on lines
      lineG.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", function(d, i) {
          if (i < 45 && i != 0) return 2.5
          else return 0
        })
        .attr("cx", function (d, i) {
          return x_line(d.x); // i * lineWidth / (data.length - 1);
        })
        .attr("cy", function (d, i) {
          return y_line(d.y);
        })
        .attr("fill", "white")
        .attr("stroke", "black")
        .on("mouseover", function (d, i) {
          // TODO
        })
        .on("mouseout", function (d) {
          // TODO
        });

      lineG.selectAll(".texts").data(data).enter().append('text')
        .text(function (d,i) {
          if (i < 45 && i != 0) return i; 
        })
        .attr("class", "roundtexts")
        .attr('x', function (d,i) {
          return x_line(d.x);
        })
        .attr('y', function (d,i) {
          return lineHeight + 12 // y_line(d.y) + 10;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', 10);

    } 
  }
}
</script>
