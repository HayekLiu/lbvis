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
      this.drawLineChart(data['balances'])
    }
  },

  methods: {
    drawLineChart(data) {
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
/*  // dot on lines
      lineG.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 4)
        .attr("cx", function (d, i) {
          return i * lineWidth / (data.length - 1);
        })
        .attr("cy", function (d, i) {
          return y_line(d.y);
        })
        .attr("fill", "black")
        .on("mouseover", function (d, i) {
          // TODO
        })
        .on("mouseout", function (d) {
          // TODO
        });
*/
    } 
  }
}
</script>
