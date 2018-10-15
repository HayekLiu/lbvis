<template>
  <div id='rankContainer' ref="rankContainer">
    <div id="rank-control">
      <div id="rank-control-top">
        <h4>&nbsp&nbsp&nbsp&nbsp#Proc.:&nbsp
        <select id="numberDiv">
          <option value="0">8</option>
          <option value="1">16</option>
          <option value="2" selected>32</option>
          <option value="3">64</option>
          <option value="4">128</option>
        </select>
          &nbsp&nbsp&nbsp&nbspRanking by:&nbsp
        <select id="rankDiv">
          <option value="0">Proc. Workload</option>
          <option value="1">Block Count</option>
          <option value="2">Avg. Block Workload</option>
          <option value="3">Particle Count</option>
          <option value="4">Avg. Particle Workload</option>
        </select>
        &nbsp&nbsp&nbsp&nbspOptions:&nbsp
        <input name="boxAlign" id="boxAlignCheck" type="checkbox">&nbspAlign Blocks&nbsp&nbsp
        <input name="reOrder" id="reOrderCheck" type="checkbox">&nbspReorder Graph&nbsp&nbsp&nbsp
        <input name="reset" id="resetButton" type="button" value=" Reset Graph ">
        </h4>
      </div>
      <div id="rank-control-bottom">
      </div>
    </div>
    <div id="rank-bar">
    </div>
  </div>
  
</template>
<script>

import { mapActions, mapGetters } from 'vuex'
import $ from 'jquery'
import d3 from 'd3'
export default {
  components: { },
  data() {
    return {
      list: []
    }
  },
  mounted() {
    // console.log('d3: ',d3)
    // console.log("map loading.....")
    this.init();

  },
  computed: {
    ...mapGetters({
      graphData: 'getGraphData',
      selectRound: 'getSelectRound',
      filterRoundIndex: 'getFilterRoundIndex',
      selectRankingBy: 'getSelectRankingBy',
      selectAlignBlocks: 'getSelectAlignBlocks',
      resetGraphView: 'getResetGraphView'
    }),
  },
  watch: {
    graphData: function(data) {
      // console.log('graphData: ', data)
      this.drawGraph(data['nodes'], data['max_nodes'], data['links'], data['dists'], data['transfers'])
      //console.log('d3: ',d3)
    },
    selectRound: function(data) {
      // console.log('selected rounds: ', data)
      //self.rounds = data
      /*this.selected_rounds = data;
      this.reRankGraph(this.graphData['max_nodes'], this.graphData['nodes'], this.graphData['links'], this.graphData['dists'], this.graphData['transfers'])*/
    },
    filterRoundIndex: function(data) {
      // console.log('selected rounds index: ', data)
      if (!(data[0] == this.rounds[0] && data[1] == this.rounds[this.rounds.length-1])) {
        this.num_rounds = 0
        this.rounds = []
        for (var i = data[0]; i <= data[1]; i++) {
          this.rounds.push(i);
          this.num_rounds ++
        }

        console.log("receive selected round index:", this.rounds)

        if (this.rounds.length == 0) {
          this.rounds = this.init_rounds;
          this.num_rounds = this.init_rounds.length;
        }
        //this.reRankGraph(self.rounds, this.graphData['nodes'], this.graphData['links'], this.graphData['dists'], this.graphData['transfers'])
        // TODO only show selected rounds
        this.reDrawGraph_filterRounds(this.graphData['max_nodes'], this.graphData['nodes'], this.graphData['links'], this.graphData['dists'], this.graphData['transfers']);
      }
    },
    selectRankingBy: function(data) {
      this.choice = data;

      this.reRankGraph(this.graphData['max_nodes'], this.graphData['nodes'], this.graphData['links'], this.graphData['dists'], this.graphData['transfers'])
    },

    selectAlignBlocks: function (data) {
      // 同一个proc的加框
      // hover加竖线，提示
      // TODO 同一个round怎么放
      this.is_align_blocks = data;
      this.computeAlignBlockLists();

      //console.log("block_dist_array", this.block_dist_array);
      //console.log("block_align_lists", this.block_align_lists)

      for (var idx in this.block_dist_array) {
        var key = idx.split("|")

        var round = parseInt(key[0]), name = parseInt(key[1]), flag = parseInt(key[2]);

        //console.log("key", round, name, flag)
        if (flag == 1) this.updateInBlockDist(round, name, this.block_dist_array[idx])
        else if (flag == 0) this.updateOutBlockDist(round, name, this.block_dist_array[idx]); // 不是很想用这个
        else alert("Error!!")
      }
    },

    resetGraphView: function(data) {
      console.log("resetGraphView", data)

      this.clearGraphViewInteract();
    }
  },
  methods: {
    ...mapActions(['setRoundProcBlock']),

    init(){
      var self = this;

      self.tg = null

      self.glyphWidth = 0
      self.paddingWidth = 0
      self.paddingHeight = 0
      self.graphWidth = 0
      self.graphHeight = 0
      self.graphG = null;
      self.tooltipId = "gates_tooltip"

      self.textG = null
      self.roundG = null
      self.glyphG = null

      self.compute = null
      self.lineGenaretor = null

      self.init_rounds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] // filtered rounds from overview plot
      self.rounds = self.init_rounds
      self.num_rounds = 15

      self.selected_rounds = [] // selected rounds from summary plot

      // self.max_round = 0 // to be changed TODO
      self.n_nodes = 32
      self.n_limited_nodes = 32
      self.n_display_nodes = 0

      self.n_nodes_ratio = 0.65 // 0.15 for 64 nodes
      self.max_node2_r = 0
      self.min_node2_r = 0
      self.max_node2_stroke_w = 0
      self.node_r = 0
      self.super_node_r = 0
      self.rect_xOffset = 0
      self.rect_yOffset = 0
      self.max_block_rect_w = 0
      self.max_block_rect_h = 0
      self.node_text_size = 0
      self.node_text_xOffset = 0
      self.node_text_yOffset = 0

      //self.selected_block = -1;
      self.selected_blocks = []

      //self.block_round_name = []
      //self.block_id_array = []
      self.block_dist_array = {}
      self.is_align_blocks = false;
      self.block_align_lists = {}
      self.block_lists_len = 0

      self.is_reorder = false // 注意：选reorder时graph上只能有block transfer path
      self.distances = {} 

      self.endx = 0

      // to be changed
      /*self.selected_nodes = []
      self.highlighted_nodes = [];          
      self.nodes_source = []
      self.nodes_target = [];
      self.nodes_transfer = [];
      self.indistpath_nodes = [];

      self.outdistselected_nodes = []
      self.indistselected_nodes = [];
      self.outdistnodes_target = []
      self.indistnodes_source = [];*/
      // ↑

      self.init_nodes = []
      self.init_max_nodes = []
      self.init_links = []
      self.init_dists = []
      self.init_transfers = []

      self.selected_nodes = {}
      self.highlighted_nodes = {}
      self.nodes_source = {}
      self.nodes_target = {}
      self.nodes_transfer = {}
      self.indistpath_nodes = {}

      self.outdistselected_nodes = {}
      self.indistselected_nodes = {}
      self.outdistnodes_target = {}
      self.indistnodes_source = {}
      // ......

      self.choice = 2;

      self.focused_round = -1
      self.focused_name = -1;

      self.raw_rankings = {}

      self.rankings = {};
      self.filtered_nodes = {}
      self.display_nodes_array = []

      self.max_wl = []
      self.min_wl = [];
      //self.max_est_wl = []
      //self.min_est_wl = [];
      //self.max_wl_estWl_diff = []
      //self.min_wl_estWl_diff = [];

      self.min_all_npts = 0
      self.max_all_npts = 0
      self.min_npts = 0
      self.max_npts = 0
      self.min_nblocks = 0
      self.max_nblocks = 0
      self.min_nfdpts = 0
      self.max_nfdpts = 0
      self.min_nufdpts = 0
      self.max_nufdpts = 0
      self.min_value = 0
      self.max_value = 0
      self.min_link_count = 0
      self.max_link_count = 0
 
      self.resolution = 32

      //self.nodes = []
      self.max_nodes = []
      //self.links = []
      self.node_wls = {}
      self.node_json = {}
      self.link_json = {}
      self.transfer_json = {}
      self.dist_json = {}

      self.menu = null;

      self.node = null
      self.proc_link = null
      self.outdist_link = null
      self.indist_link = null
      self.transpath_link = null
      self.max_node = null

      self.prev_proc_no_selection = "2"
    }, // TODO 全部需要重置

    initGraphSettings() 
    {
      var self = this

      // self.max_round = 15 // changed to num_rounds
      if (self.n_nodes > self.n_limited_nodes) self.n_display_nodes = self.n_limited_nodes + 1;
      else self.n_display_nodes = self.n_limited_nodes

      self.max_node2_r = Math.min((self.graphWidth/((self.n_display_nodes-1) + (self.n_display_nodes-1)*self.n_nodes_ratio))/2, (self.graphHeight/self.num_rounds)/2.5) // 9
      self.min_node2_r = self.max_node2_r/3 // 3, 
      self.max_node2_stroke_w = self.max_node2_r/3 // 3
      self.node_r = self.max_node2_r * 1.01 // 10
      self.super_node_r = self.node_r * 1.1
      self.rect_xOffset = self.node_r * 1.3
      self.rect_yOffset = self.node_r * 1.3
      self.max_block_rect_w = Math.min(self.node_r, ((self.graphHeight-self.node_r*2)/(self.num_rounds-1))/6) // 12
      self.max_block_rect_h = self.max_block_rect_w // 12
      self.node_text_size = self.max_node2_r * 0.8
      self.node_text_xOffset = self.max_node2_r*(-1)
      self.node_text_yOffset = self.max_node2_r

      self.clearVars();
    },

    clearGraphComponents()
    {
      var self = this

      self.textG.remove();
      self.textG = self.tg.append("g")
        .attr('transform', "translate(" + (self.paddingWidth+30) + ","+ 0 + ")")
        .attr('class', 'text-g');

      self.roundG.remove();
      self.roundG = self.tg.append("g")
        .attr('transform', "translate(" + 0 + ","+ self.paddingHeight + ")")
        .attr('class', 'round-g');

      self.glyphG.remove()
      self.glyphG = self.tg.append("g")
        .attr('transform', "translate(" + 30 + ","+ self.paddingHeight + ")")
        .attr('class', 'glygh-g');

      self.graphG.remove();
      self.graphG = self.tg.append("g")
        .attr('transform', "translate(" + (self.paddingWidth+30) + ","+ self.paddingHeight + ")")
        .attr('class', 'graph-g');

      self.node = self.graphG.append('g');
      self.proc_link = self.graphG.append('g');
      self.outdist_link = self.graphG.append('g');
      self.indist_link = self.graphG.append('g');
      self.transpath_link = self.graphG.append('g');
    },

    clearVars()
    {
      var self = this

      self.choice = 0;
   
      //self.selected_block = -1;
      self.selected_blocks = []
      self.focused_round = -1
      self.focused_name = -1;

      self.is_align_blocks = false;
      self.block_dist_array = {}
      self.block_align_lists = {}
      self.block_lists_len = 0

      self.selected_rounds = []

      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;
        self.nodes_source[index] = {};
        self.nodes_target[index] = {};
        self.selected_nodes[index] = {};
        self.highlighted_nodes[index] = {}
        self.nodes_transfer[index] = {};
        self.indistpath_nodes[index] = {};

        self.outdistnodes_target[index] = {};
        self.outdistselected_nodes[index] = {};

        self.indistnodes_source[index] = {};
        self.indistselected_nodes[index] = {};

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];

          self.outdistnodes_target[index][dnode] = 0
          self.indistnodes_source[index][dnode] = 0
        }
      }

      self.rankings = self.raw_rankings

      self.is_reorder = false // 选reorder时graph上只能有block transfer path
      self.distances = {}

      self.endx = 0
    },

    clearGraphViewInteract()
    {
      var self = this
    
      $("select#rankDiv").val("0")
      $("#boxAlignCheck").prop("checked", false);
      $("#reOrderCheck").prop("checked", false);

      self.clearGraphComponents();
      self.clearVars();

      self.drawProcLinks();
      self.drawProcNodes();
      self.drawMaxNodes();
      self.drawViolinPlot();
      self.drawRoundIndex()
    },

    drawGraph(nodes, max_nodes, links, dists, transfers) 
    {
      var self = this

      self.init_nodes = nodes
      self.init_max_nodes = max_nodes
      self.init_links = links
      self.init_dists = dists
      self.init_transfers = transfers

      $("select#numberDiv").change(function() {
        if ($(this).val() == "0") {
          if (self.n_nodes >= 8) {
            self.n_limited_nodes = 8; 
            self.prev_proc_no_selection = "0"
            self.reDrawGraph_procNo()
          } else {
            alert("Only " +self.n_nodes+ " processes!")
            $("select#numberDiv").val(self.prev_proc_no_selection)
          }
        }
        else if ($(this).val() == "1") {
          if (self.n_nodes >= 16) {
            self.n_limited_nodes = 16; 
            self.prev_proc_no_selection = "1"
            self.reDrawGraph_procNo()
          } else {
            alert("Only " +self.n_nodes+ " processes!")
            $("select#numberDiv").val(self.prev_proc_no_selection)
          }
        }
        else if ($(this).val() == "2") {
          if (self.n_nodes >= 32) {
            self.n_limited_nodes = 32; 
            self.prev_proc_no_selection = "2"
            self.reDrawGraph_procNo()
          } else {
            alert("Only " +self.n_nodes+ " processes!")
            $("select#numberDiv").val(self.prev_proc_no_selection)
          }
        }
        else if ($(this).val() == "3") {
          if (self.n_nodes >= 64) {
            self.n_limited_nodes = 64;
            self.prev_proc_no_selection = "3" 
            self.reDrawGraph_procNo()
          } else {
            alert("Only " +self.n_nodes+ " processes!")
            $("select#numberDiv").val(self.prev_proc_no_selection)
          }
        }
        else if ($(this).val() == "4") {
          if (self.n_nodes >= 128) {
            self.n_limited_nodes = 128; 
            self.prev_proc_no_selection = "4"
            self.reDrawGraph_procNo()
          } else {
            alert("Only " +self.n_nodes+ " processes!")
            $("select#numberDiv").val(self.prev_proc_no_selection)
          }
        }
        else alert("No other selections!")
      })

      $("select#rankDiv").change(function(){
        // console.log($(this).val());
        if ($(this).val() == "0") self.choice = 0; // Proc. Workload
        else if ($(this).val() == "1") self.choice = 1; // Block Count
        else if ($(this).val() == "2") self.choice = 2; // Avg. Block Workload
        else if ($(this).val() == "3") self.choice = 3; // Particle Count
        else if ($(this).val() == "4") self.choice = 4; // Avg. Particle Workload
        else alert("No other selections!")

        self.reRankGraph(self.init_max_nodes, self.init_nodes, self.init_links, self.init_dists, self.init_transfers)
      });

      $("#boxAlignCheck").click(function(evt) {
        self.is_align_blocks = !self.is_align_blocks;

        self.computeAlignBlockLists();

        //console.log("block_dist_array", this.block_dist_array);
        //console.log("block_align_lists", this.block_align_lists)

        for (var idx in self.block_dist_array) {
          var key = idx.split("|")

          var round = parseInt(key[0]), name = parseInt(key[1]), flag = parseInt(key[2]);

          //console.log("key", round, name, flag)
          if (flag == 1) self.updateInBlockDist(round, name, self.block_dist_array[idx])
          else if (flag == 0) self.updateOutBlockDist(round, name, self.block_dist_array[idx]); // 不是很想用这个
          else alert("Error!!")
        }
      });

      $("#reOrderCheck").click(function(evt) {
        self.is_reorder = !self.is_reorder

        if (self.is_reorder)
          self.reOrderGraph();
        else {
          self.rankings = self.raw_rankings;
          self.updateGraph()
        }
      })

      $("#resetButton").on('click',function (evt) {
        self.clearGraphViewInteract();
      });
      //self.nodes = nodes,
      //self.max_nodes = max_nodes
      //self.links = links,
      //self.transfer_json = transfer_json,
      //self.dist_json = dist_json

      var containerWidth = +$('#load-balance-container').width()
      var containerHeight = +$('#load-balance-container').height()
      var margin = {top: 25, right: 70, bottom: 60, left: 20}
      var svg = d3.select("#load-balance-container")
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight) // *3
      var width = +containerWidth - margin.left - margin.right
      var height = +containerHeight - margin.top - margin.bottom

      self.tg = svg.append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                  .attr('id', 'container-g')

      var tool_width = 200

      $("body").append("<div class='tooltip' id='" + self.tooltipId + "'></div>");
      $("#" + self.tooltipId).css("width", tool_width);
      self.hideTooltip();

      var topWrapperHeight = height; // height*1.5

      self.glyphWidth = 120
      self.paddingWidth = 150;
      self.paddingHeight = 30

      self.graphWidth = width - self.paddingWidth
      self.graphHeight = topWrapperHeight - self.paddingHeight

      self.textG = self.tg.append("g")
        .attr('transform', "translate(" + (self.paddingWidth+30) + ","+ 0 + ")")
        .attr('class', 'text-g');

      self.roundG = self.tg.append("g")
        .attr('transform', "translate(" + 0 + ","+ self.paddingHeight + ")")
        .attr('class', 'round-g');

      self.glyphG = self.tg.append("g")
        .attr('transform', "translate(" + 30 + ","+ self.paddingHeight + ")")
        .attr('class', 'glygh-g');

      self.graphG = self.tg.append("g")
        .attr('transform', "translate(" + (self.paddingWidth+30) + ","+ self.paddingHeight + ")")
        .attr('class', 'graph-g');

      self.node = self.graphG.append('g');
      self.proc_link = self.graphG.append('g');
      self.outdist_link = self.graphG.append('g');
      self.indist_link = self.graphG.append('g');
      self.transpath_link = self.graphG.append('g');

      self.menu = self.contextMenu().items('Incoming Block Dist.', 'Outgoing Block Dist.', 'Incoming Block Dist. All', 'Sources/Targets', 'Focused Sources/Targets');

      // To Be Changed 颜色
      var a = d3.rgb('#3288bd') //'#3288bd' //d3.rgb(0, 255, 0); //绿色               设置渐变颜色的起始
      var b = d3.rgb('#d53e4f') //'#d53e4f' //d3.rgb(255, 0, 0); //红色
      self.compute = d3.interpolate(a, b);
      self.lineGenaretor = d3.svg.line()
        .interpolate("basis")
        .x(function (d) { return d[0] })
        .y(function (d) { return d[1] });

      self.initGraphSettings()

      self.filterData([], max_nodes, nodes, links, dists, transfers);
      self.drawProcLinks();
      self.drawProcNodes();
      self.drawMaxNodes();
      self.drawViolinPlot();
      self.drawRoundIndex();
    },

    computeAlignBlockLists()
    {
      var self = this

      var block_array = {}
      for (var idx in self.block_dist_array) {
        var blockIdLists = self.block_dist_array[idx]

        var key = idx.split("|")
        var flag = parseInt(key[2]);

        for (var i = 0; i < blockIdLists.length; i ++) {
          var blockid
          if (flag == 1) blockid = blockIdLists[i].blockid
          else blockid = blockIdLists[i]
          block_array[blockid] = 1
        }
      }

      var block_lists = []
      for (var idx in block_array)
        block_lists.push(parseInt(idx))

      block_lists.sort(function (a, b) { return a - b }); 

      self.block_align_lists = {}
      self.block_lists_len = block_lists.length
      for (var i = 0; i < block_lists.length; i ++) {
        //self.block_align_lists.push({"blockid": block_lists[i], "index": i})
        var blockid = block_lists[i];
        self.block_align_lists[blockid] = i;
      }
    },

    computeRankingsByProcsWorkload(selected_rounds, data)
    {
      var self = this;

      var procwls = []
      for (var i = 0; i < self.n_nodes; i ++) procwls.push(0);
      data.forEach(function (d) {
        for (var j = 0; j < selected_rounds.length; j ++)
          if (selected_rounds[j] == d.round) 
            procwls[d.name] += d.workload;
      })

      var proc2wls = []
      for (var i = 0; i < self.n_nodes; i ++)
        proc2wls.push({"name": i, "workload": procwls[i]});

      proc2wls.sort(function (a, b) {
        return b["workload"] - a["workload"];
      });

      proc2wls.forEach(function (d, i) { 
        if (i < self.n_limited_nodes) {
          self.rankings[d.name] = i; 
          self.filtered_nodes[d.name] = 1;
          self.display_nodes_array.push(d.name);
        }
      })
    },

    computeRankingsByProcsBlockCount(selected_rounds, data)
    {
      var self = this;

      var procblkcnts = []
      for (var i = 0; i < self.n_nodes; i ++) procblkcnts.push(0);
      data.forEach(function (d) {
        for (var j = 0; j < selected_rounds.length; j ++)
          if (selected_rounds[j] == d.round) 
            procblkcnts[d.name] += d.count;
      })

      var proc2blkcnts = []
      for (var i = 0; i < self.n_nodes; i ++)
        proc2blkcnts.push({"name": i, "count": procblkcnts[i]});

      proc2blkcnts.sort(function (a, b) {
        return b["count"] - a["count"];
      });

      proc2blkcnts.forEach(function (d, i) { 
        if (i < self.n_limited_nodes) {
          self.rankings[d.name] = i; 
          self.filtered_nodes[d.name] = 1;
          self.display_nodes_array.push(d.name);
        }
      })
    },

    computeRankingsByProcsParticleCount(selected_rounds, data) 
    {
      var self = this;

      var procptcnts = []
      for (var i = 0; i < self.n_nodes; i ++) procptcnts.push(0);
      data.forEach(function (d) {
        for (var j = 0; j < selected_rounds.length; j ++)
          if (selected_rounds[j] == d.round) 
            procptcnts[d.name] += d.npts;
      })

      var proc2ptcnts = []
      for (var i = 0; i < self.n_nodes; i ++)
        proc2ptcnts.push({"name": i, "npts": procptcnts[i]});

      proc2ptcnts.sort(function (a, b) {
        return b["npts"] - a["npts"];
      });

      proc2ptcnts.forEach(function (d, i) { 
        if (i < self.n_limited_nodes) {
          self.rankings[d.name] = i; 
          self.filtered_nodes[d.name] = 1;
          self.display_nodes_array.push(d.name);
        }
      })
    },

    computeRankingsByProcsAvgBlockWorkload(selected_rounds, data)
    {
      var self = this;

      var procwls = [], procblkcnts = []
      for (var i = 0; i < self.n_nodes; i ++) {
        procwls.push(0);
        procblkcnts.push(0)
      }

      data.forEach(function (d) {
        for (var j = 0; j < selected_rounds.length; j ++)
          if (selected_rounds[j] == d.round) {
            procwls[d.name] += d.workload;
            procblkcnts[d.name] += d.count;
          }
      })

      var proc2avgblkwl = []
      for (var i = 0; i < self.n_nodes; i ++)
        proc2avgblkwl.push({"name": i, "avgblkwl": procwls[i]/procblkcnts[i]});

      proc2avgblkwl.sort(function (a, b) {
        return b["avgblkwl"] - a["avgblkwl"];
      });

      proc2avgblkwl.forEach(function (d, i) { 
        if (i < self.n_limited_nodes) {
          self.rankings[d.name] = i; 
          self.filtered_nodes[d.name] = 1;
          self.display_nodes_array.push(d.name);
        }
      })
    },

    computeRankingsByProcsAvgParticleWorkload(selected_rounds, data)
    {
      var self = this;

      var procwls = [], procptcnts = []
      for (var i = 0; i < self.n_nodes; i ++) {
        procwls.push(0);
        procptcnts.push(0)
      }

      data.forEach(function (d) {
        for (var j = 0; j < selected_rounds.length; j ++)
          if (selected_rounds[j] == d.round) {
            procwls[d.name] += d.workload;
            procptcnts[d.name] += d.npts;
          }
      })

      var proc2avgptwl = []
      for (var i = 0; i < self.n_nodes; i ++)
        proc2avgptwl.push({"name": i, "avgptwl": procwls[i]/procptcnts[i]});

      proc2avgptwl.sort(function (a, b) {
        return b["avgptwl"] - a["avgptwl"];
      });

      proc2avgptwl.forEach(function (d, i) { 
        if (i < self.n_limited_nodes) {
          self.rankings[d.name] = i; 
          self.filtered_nodes[d.name] = 1;
          self.display_nodes_array.push(d.name);
        }
      })
    },

    computeRankingsByProcs(choice, selected_rounds, data) 
    {
      var self = this;

      self.rankings = {}
      self.filtered_nodes = {}
      self.display_nodes_array = []

      if (selected_rounds.length == 0) {
        for (var i = 0; i < self.n_limited_nodes; i ++) {
          self.rankings[i] = i;
          self.filtered_nodes[i] = 1;
          self.display_nodes_array.push(i);
        }
      } else {
        // var procscnts = []
        // for (var i = 0; i < self.n_nodes; i ++) procscnts.push(0);
        // data.forEach(function (d) {
        //   for (var j = 0; j < selected_rounds.length; j ++)
        //     if (selected_rounds[j] == d.round) 
        //       procscnts[d.name] += d.workload;
        // })

        // var procs2cnts = []
        // for (var i = 0; i < self.n_nodes; i ++)
        //   procs2cnts.push({"name": i, choice: procscnts[i]});
        // procs2cnts.sort(function (a, b) {
        //   return b[choice] - a[choice];
        // });

        // procs2cnts.forEach(function (d, i) { 
        //   if (i < self.n_limited_nodes) {
        //     self.rankings[d.name] = i; 
        //     self.filtered_nodes[d.name] = 1;
        //     self.display_nodes_array.push(d.name);
        //   }
        // })
        if (choice == 0) 
          self.computeRankingsByProcsWorkload(selected_rounds, data)
        else if (choice == 1)
          self.computeRankingsByProcsBlockCount(selected_rounds, data)
        else if (choice == 2)
          self.computeRankingsByProcsAvgBlockWorkload(selected_rounds, data)
        else if (choice == 3)
          self.computeRankingsByProcsParticleCount(selected_rounds, data)
        else if (choice == 4)
          self.computeRankingsByProcsAvgParticleWorkload(selected_rounds, data);
        else alert("No other selections!")
      }

      if (self.n_nodes > self.n_limited_nodes) {
        self.rankings[self.n_nodes] = self.n_limited_nodes
        self.filtered_nodes[self.n_nodes] = 1
        self.display_nodes_array.push(self.n_nodes)
      }

      self.raw_rankings = self.rankings

      console.log("rankings:", self.rankings);
    },

    reDrawGraph_filterRounds(max_nodes, nodes, links, dists, transfers) 
    {
      var self = this

      self.clearGraphComponents();
      self.initGraphSettings()

      self.filterData([], max_nodes, nodes, links, dists, transfers);
      self.drawProcLinks();
      self.drawProcNodes();
      self.drawMaxNodes();
      self.drawViolinPlot();
      self.drawRoundIndex()
    },

    reDrawGraph_procNo()
    {
      var self = this

      self.clearGraphComponents();
      self.initGraphSettings()

      self.filterData(self.selected_rounds, self.init_max_nodes, self.init_nodes, self.init_links, self.init_dists, self.init_transfers);
      self.drawProcLinks();
      self.drawProcNodes();
      self.drawMaxNodes();
      self.drawViolinPlot();
      self.drawRoundIndex()
    },

    reRankGraph(max_nodes, nodes, links, dists, transfers) 
    { // TODO
      var self = this;

      self.filterData(self.selected_rounds, max_nodes, nodes, links, dists, transfers)
      
      if (self.n_nodes == self.n_limited_nodes) self.updateGraph();
      else {
        self.drawProcNodes();
        self.drawProcLinks();

        self.graphG.selectAll(".noderects").remove();
        self.graphG.selectAll(".nodetexts").remove();

        // for (var i = 0; i < self.max_round; i ++) {
        for (var i = 0; i < self.rounds.length; i ++) {
          var index = self.rounds[i]-1;
          for (var j = 0; j <= self.n_nodes; j ++) {
            d3.selectAll('.in_block_dist'+(index+1)+j).remove();
            d3.selectAll('.in_block_dist_vline'+(index+1)+j).remove()
            d3.selectAll('.in_block_dist_rect'+(index+1)+j).remove();
            d3.selectAll('.in_block_dist_texts'+(index+1)+j).remove()

            d3.selectAll('.out_block_dist'+(index+1)+j).remove();
            d3.selectAll('.out_block_dist_rect'+(index+1)+j).remove();
          }
        }

        // for (var i = 0; i < self.max_round; i ++) {
        for (var i = 0; i < self.rounds.length; i ++) {
          var index = self.rounds[i]-1;

          self.outdistnodes_target[index] = {};
          self.indistnodes_source[index] = {};

          for (var j = 0; j < self.display_nodes_array.length; j ++) {
            var dnode = self.display_nodes_array[j];
            self.outdistnodes_target[index][dnode] = 0
            self.indistnodes_source[index][dnode] = 0
          }
        }
    
        // for (var i = 0; i < self.max_round; i ++) {
        for (var i = 0; i < self.rounds.length; i ++) {
          var index = self.rounds[i]-1;
            
          for (var j = 0; j < self.n_nodes; j ++) {
            if (self.selected_nodes[index][j] == 1 && self.filtered_nodes[j] != 1) 
              self.selected_nodes[index][j] = 0

            if (self.outdistselected_nodes[index][j] == 1 && self.filtered_nodes[j] != 1) 
              self.outdistselected_nodes[index][j] = 0

            if (self.indistselected_nodes[index][j] == 1 && self.filtered_nodes[j] != 1) 
              self.indistselected_nodes[index][j] = 0
          }
        }

        if (self.filtered_nodes[self.focused_name] != 1) {
          self.focused_round = -1;
          self.focused_name = -1;
        }

        //if (self.selected_block != -1) 
        if (self.selected_blocks.length != 0)
        {
          self.computeBlockPathBlocks(self.selected_blocks);
          // for (var i = 1; i < self.max_round; i ++) {
          for (var i = 0; i < self.rounds.length-1; i ++) {
            var index = self.rounds[i];

            for (var j = 0; j < self.display_nodes_array.length; j ++) {
              var dnode = self.display_nodes_array[j];

              if (self.indistpath_nodes[index][dnode] == 1) {
                if (self.indistselected_nodes[index][dnode] == 1) 
                  self.updateBlockTransferPathRelated(index+1, dnode, self.selected_blocks);
                else {
                  self.addInBlockDist(index+1, dnode, self.selected_blocks);
                  /*if (self.outdistselected_nodes[index-1][dnode] == 1) { // for connecting outdist blocks and indist blocks (along the block transfer path)
                    self.removeOutBlockDist(index, dnode);
                    self.addOutBlockDist(index, dnode)
                  }*/
                }
              }
            }
          }

          //for (var i = 1; i < self.max_round; i ++) {
          for (var i = 0; i < self.rounds.length-1; i ++) {
            var index = self.rounds[i];

            for (var j = 0; j < self.n_nodes; j ++) {
              if (self.indistselected_nodes[index][j] == 1) {
                if (self.indistpath_nodes[index][j] == 1) 
                  self.removeInBlockDist(index+1, j, self.selected_blocks);
                self.addInBlockDist(index+1, j, []);
              }
            }
          }

          // for (var i = 0; i < self.max_round; i ++) {
          for (var i = 0; i < self.rounds.length; i ++) {
            var index = self.rounds[i]-1;

            for (var j = 0; j < self.n_nodes; j ++) {
              if (self.outdistselected_nodes[index][j] == 1) {
                self.addOutBlockDist(index+1, j);
                for(var target in self.transfer_json[parseInt(index)+1][j]) {
                  for (var bid in self.transfer_json[parseInt(index)+1][j][target]) {
                    if (self.filtered_nodes[parseInt(target)] == 1) {
                      if (self.indistpath_nodes[parseInt(index)+1][parseInt(target)] == 1 && self.indistselected_nodes[parseInt(index)+1][parseInt(target)] != 1) {
                        self.removeInBlockDist(parseInt(index)+2, parseInt(target), self.selected_blocks);
                        self.addInBlockDist(parseInt(index)+2, parseInt(target), self.selected_blocks);
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          // for (var i = 1; i < self.max_round; i ++) {
          for (var i = 0; i < self.rounds.length-1; i ++) {
            var index = self.rounds[i];

            for (var j = 0; j < self.n_nodes; j ++) {
              if (self.indistselected_nodes[index][j] == 1) {
                self.addInBlockDist(index+1, j, [])
              }
            }
          }

          // for (var i = 0; i < self.max_round; i ++) {
          for (var i = 0; i < self.rounds.length; i ++) {
            var index = self.rounds[i]-1;

            for (var j = 0; j < self.n_nodes; j ++) {
              if (self.outdistselected_nodes[index][j] == 1) {
                self.addOutBlockDist(index+1, j)
              }
            }
          }
        }

        self.updateProcLinks(self.focused_round, self.focused_name);
        self.updateProcNodes();
        self.updateProcNodeRects(); 

        if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();
      } 
    },

    reOrderGraph() // TODO
    {
      var self = this

      if (self.selected_blocks.length > 0) {
        var temp_dists = self.distances;
        self.distances = {}
        for (var i = 0; i < self.display_nodes_array.length; i ++) { // 注意check有没有把super node算进去
          var first = self.display_nodes_array[i];
          for (var j = i+1; j < self.display_nodes_array.length; j ++) {
            var second = self.display_nodes_array[j];

            if (temp_dists[second] && temp_dists[second][first]) {
              if (!self.distances[first]) self.distances[first] = {}
              if (!self.distances[first][second]) self.distances[first][second] = 0

              if (temp_dists[first] && temp_dists[first][second]) {
                self.distances[first][second] += (temp_dists[first][second] + temp_dists[second][first])
              } else {
                self.distances[first][second] += temp_dists[second][first]
              }
            } else {
              if (temp_dists[first] && temp_dists[first][second]) {
                if (!self.distances[first]) self.distances[first] = {}
                if (!self.distances[first][second]) self.distances[first][second] = 0

                self.distances[first][second] += temp_dists[first][second]
              }
            }
          }   
        }

console.log("distances", self.distances) // 还没有算边的条数

        // TODO
        var distlists = [];
        for (var i in self.distances) {
          for (var j in self.distances[i]) {
            distlists.push({
              "a": parseInt(i),
              "b": parseInt(j),
              "weight": parseInt(self.distances[i][j])
            })
          }
        }

        distlists.sort(function (a, b) { return b["weight"] - a["weight"]; });

console.log("distlists", distlists)

        var resultlists = []
        var cts = {}
        for (var i = 0; i < distlists.length; i ++) {

          var count = 0
          for (var j = 0; j < resultlists.length; j ++) 
          {
            if ((resultlists[j].a == distlists[i].a || resultlists[j].b == distlists[i].b) || (resultlists[j].a == distlists[i].b || resultlists[j].b == distlists[i].a)) 
            {
              count ++;
            }
          }

          if (count <= 1) {
            resultlists.push({
              "a": distlists[i].a,
              "b": distlists[i].b,
              "weight": distlists[i].weight
            })

            if (!cts[distlists[i].a]) cts[distlists[i].a] = 0
            cts[distlists[i].a] += 1

            if (!cts[distlists[i].b]) cts[distlists[i].b] = 0
            cts[distlists[i].b] += 1 
          }
        }

console.log("resultlists", resultlists)

        var ctones = []
        for (var i in cts) {
          if (cts[i] == 1) ctones.push(i)
        }

console.log("ctones", ctones)

        var newlists = []
        while (ctones.length > 0) {
          
          var target = ctones[0];
          newlists.push(parseInt(target))

          ctones.splice(ctones.indexOf(target), 1)

          var ffflag = true;
          while (resultlists.length > 0 && ffflag) 
          {
            var i = 0 
            var flag = true
            while (i < resultlists.length && flag) 
            {
              if (resultlists[i].a == target) {
                newlists.push(resultlists[i].b)
 
                target = resultlists[i].b
                flag = false

                resultlists.splice(i, 1)
              }
              else if (resultlists[i].b == target) {
                newlists.push(resultlists[i].a)
             
                target = resultlists[i].a
                flag = false

                resultlists.splice(i, 1)
              }

              i++
            }

            if (flag) ffflag = false;
          }

          ctones.splice(ctones.indexOf(target), 1)
        }

console.log("newlists", newlists.length, newlists)

        self.raw_rankings = self.rankings
        self.rankings = {}
        var n = 0
        for (var i = 0; i < newlists.length; i ++) {
          var name = parseInt(newlists[i])
          self.rankings[name] = n

          n ++
        }

        for (var i = 0; i < self.n_limited_nodes; i ++) {
          var name = self.display_nodes_array[i]
          if (self.rankings[name] == undefined) {
            self.rankings[name] = n
            n++
          }
        }

        if (self.n_nodes > self.n_limited_nodes) {
          self.rankings[self.n_nodes] = self.n_limited_nodes
        }

console.log("reorder rankings: ", self.rankings)

        self.updateGraph()
      }
    },


    updateGraph()
    {
      var self = this

      self.drawProcLinks();

      self.graphG.selectAll(".noderects").remove();
      self.graphG.selectAll(".nodetexts").remove();
      // self.updateProcLinks(self.focused_round, self.focused_name);

      //for (var i = 1; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length-1; i ++) {
        var index = self.rounds[i];

        for (var j = 0; j < self.n_nodes; j ++) {
          if (self.indistpath_nodes[index][j] == 1 || self.indistselected_nodes[index][j] == 1) {
            if (self.indistselected_nodes[index][j] == 1) self.removeInBlockDist(index+1, j, [])
            else self.removeInBlockDist(index+1, j, self.selected_blocks)
          }
        }
      }

      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.n_nodes; j ++) {
          if (self.outdistselected_nodes[index][j] == 1) {
            self.removeOutBlockDist(index+1, j)
          }
        }
      }

      // for (var i = 1; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length-1; i ++) {
        var index = self.rounds[i];

        for (var j = 0; j < self.n_nodes; j ++) {
          if (self.indistpath_nodes[index][j] == 1 || self.indistselected_nodes[index][j] == 1) {
            if (self.indistselected_nodes[index][j] == 1) self.addInBlockDist(index+1, j, [])
            else self.addInBlockDist(index+1, j, self.selected_blocks)
          }
        }
      }

      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.n_nodes; j ++) {
          if (self.outdistselected_nodes[index][j] == 1) {
            self.addOutBlockDist(index+1, j)

            if (self.indistpath_nodes[index+1][j] == 1 && self.indistselected_nodes[index+1][j] != 1) {
              self.removeInBlockDist(index+2, j, self.selected_blocks);
              self.addInBlockDist(index+2, j, self.selected_blocks);
            }
          }
        }
      }

      self.updateProcNodes();
      self.updateProcNodeRects(); 

      if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();
      else self.updateProcLinks(self.focused_round, self.focused_name);
    },

    // aggregate data
    filterData(selected_rounds, max_nodes, nodes, links, dists, transfers) 
    {
      var self = this
      self.computeRankingsByProcs(self.choice, selected_rounds, nodes);

      // max_nodes
      self.max_nodes = [];
      max_nodes.forEach(function(d, i) {
        if (d.round >= self.rounds[0] && d.round <= self.rounds[self.rounds.length-1]) {
          self.max_nodes.push({"round": d.round, "name": d.name});
        }
      })

      // nodes
      self.node_wls = {}
      self.node_json = {}
      nodes.forEach(function (d, i) {
        if (d.round >= self.rounds[0] && d.round <= self.rounds[self.rounds.length-1]) {
          // node_wls for summary glyph
          if (!self.node_wls[d.round]) self.node_wls[d.round] = []
          self.node_wls[d.round].push(d.workload);

          if (!self.node_json[d.round]) self.node_json[d.round] = {}

          var name = self.filtered_nodes[d.name] == 1 ? d.name : self.n_nodes // d.name can not be n_nodes
          if (!self.node_json[d.round][name]) 
            self.node_json[d.round][name] = {
              "count": 0,
              "localCount": 0,
              "workload": 0,
              "estWorkload": 0,
              "npts": 0,
              "nfdpts": 0
            }

          self.node_json[d.round][name].count += d.count
          self.node_json[d.round][name].localCount += d.localCount
          self.node_json[d.round][name].workload += d.workload
          self.node_json[d.round][name].estWorkload += d.estWorkload
          self.node_json[d.round][name].npts += d.npts
          self.node_json[d.round][name].nfdpts += d.nfdpts
        }
      })

      // links
      self.link_json = {}
      links.forEach(function (d, i) {
        if (d.round >= self.rounds[0] && d.round < self.rounds[self.rounds.length-1]) {
          if (!self.link_json[d.round]) self.link_json[d.round] = {}

          var source = self.filtered_nodes[d.source] == 1 ? d.source : self.n_nodes
          if (!self.link_json[d.round][source]) self.link_json[d.round][source] = {}

          var target = self.filtered_nodes[d.target] == 1 ? d.target : self.n_nodes
          if (!self.link_json[d.round][source][target]) self.link_json[d.round][source][target] = {"value": 0, "count": 0}

          self.link_json[d.round][source][target].value += d.value
          self.link_json[d.round][source][target].count += d.count
        }
      })

      // dist_json
      self.dist_json = {}
      dists.forEach(function (d, i) {
        if (d.round >= self.rounds[0] && d.round <= self.rounds[self.rounds.length-1]) {
          if (!self.dist_json[d.round]) self.dist_json[d.round] = {}

          var name = self.filtered_nodes[d.name] == 1 ? d.name : self.n_nodes
          if (!self.dist_json[d.round][name]) self.dist_json[d.round][name] = {}

          if (!self.dist_json[d.round][name][d.blockid]) 
            self.dist_json[d.round][name][d.blockid] = {
              "workload": 0,
              "estWorkload": 0,
              "isLocal": 0
            }

          self.dist_json[d.round][name][d.blockid].workload += d.workload
          self.dist_json[d.round][name][d.blockid].estWorkload += d.estWorkload
          self.dist_json[d.round][name][d.blockid].isLocal = self.dist_json[d.round][name][d.blockid].isLocal==1 ? 1 : d.isLocal
        }
      })

      // transfer_json
      self.transfer_json = {}
      transfers.forEach(function (d, i) {
        if (d.round >= self.rounds[0] && d.round < self.rounds[self.rounds.length-1]) {
          if (!self.transfer_json[d.round]) self.transfer_json[d.round] = {}

          var source = self.filtered_nodes[d.source] == 1 ? d.source : self.n_nodes
          if (!self.transfer_json[d.round][source]) self.transfer_json[d.round][source] = {}

          var target = (self.filtered_nodes[d.target] == 1 || d.target == self.n_nodes+1) ? d.target : self.n_nodes
          if (!self.transfer_json[d.round][source][target]) self.transfer_json[d.round][source][target] = {}

          if (!self.transfer_json[d.round][source][target][d.blockid])
            self.transfer_json[d.round][source][target][d.blockid] = {"isLocal": 0}

          self.transfer_json[d.round][source][target][d.blockid].isLocal = self.transfer_json[d.round][source][target][d.blockid].isLocal==1 ? 1 : d.isLocal
        }
      })


      self.min_npts = 1000000000
      self.max_npts = 0
      self.min_nfdpts = 1000000000
      self.max_nfdpts = 0
      self.min_nufdpts = 1000000000
      self.max_nufdpts = 0
      self.min_nblocks = 1000000000
      self.max_nblocks = 0
      self.max_wl = []
      self.min_wl = []
      for (var r in self.node_json) {
        self.min_wl[parseInt(r)-1] = 1000000000;
        self.max_wl[parseInt(r)-1] = 0;

        for (var name in self.node_json[r]) {
          var u = self.node_json[r][name]

          if (self.filtered_nodes[parseInt(name)] == 1 && parseInt(name) != self.n_nodes) {
            self.min_wl[parseInt(r)-1] = Math.min(self.min_wl[parseInt(r)-1], u.workload)
            self.max_wl[parseInt(r)-1] = Math.max(self.max_wl[parseInt(r)-1], u.workload)

            self.min_npts = Math.min(self.min_npts, u.npts)
            self.max_npts = Math.max(self.max_npts, u.npts)

            self.min_nfdpts = Math.min(self.min_nfdpts, u.nfdpts)
            self.max_nfdpts = Math.max(self.max_nfdpts, u.nfdpts)

            self.min_nufdpts = Math.min(self.min_nufdpts, u.npts - u.nfdpts)
            self.max_nufdpts = Math.max(self.max_nufdpts, u.npts - u.nfdpts)

            self.min_nblocks = Math.min(self.min_nblocks, u.count)
            self.max_nblocks = Math.max(self.max_nblocks, u.count)
          }
        }
      }

      console.log(self.min_npts, self.max_npts, self.min_nfdpts, self.max_nfdpts, self.min_nufdpts, self.max_nufdpts, self.min_nblocks, self.max_nblocks)

      self.min_value = 1000000000
      self.max_value = 0
      self.min_link_count = 1000000000
      self.max_link_count = 0
      for (var r in self.link_json) {
        for (var source in self.link_json[r]) {
          for (var target in self.link_json[r][source]) {
            var u = self.link_json[r][source][target]

            self.min_value = Math.min(self.min_value, u.value)
            self.max_value = Math.max(self.max_value, u.value)

            self.min_link_count = Math.min(self.min_link_count, u.count)
            self.max_link_count = Math.max(self.max_link_count, u.count)
          }
        } 
      }

      console.log(self.min_value, self.max_value, self.min_link_count, self.max_link_count)
    }, 

    drawViolinPlot()
    {
      var self = this;

      for (var i = 0; i < self.num_rounds; i ++) 
      {
        var round = self.rounds[i];
        self.node_wls[round] = self.node_wls[round].sort(d3.ascending) // 升序
      // console.log(self.node_wls[round])
        var max_node_wl = d3.max(self.node_wls[round])

        var data = d3.layout.histogram()
                    .bins(self.resolution)
                    .frequency(0)
                    (self.node_wls[round]);

        var roundHeight = self.graphHeight/(self.num_rounds - 1);
        var wlG = self.glyphG.append("g").attr("transform", "translate(0, " + (i * roundHeight - roundHeight/2 + roundHeight*0.15) + ")");

        // violin plot
        var violin_data = []
        data.forEach(function (d, k) {
          violin_data.push({"x": d.x, "y0":-1*d.y, "y1":d.y})
        })

        var min_x = d3.min(violin_data, function(d) {return d.x})
        var max_x = d3.max(violin_data, function(d) {return d.x})

        var y = d3.scale.linear()
                 .range([roundHeight*0.7, 0])
                 .domain([d3.min(violin_data, function(d) { return d.y0; }), d3.max(violin_data, function(d) { return d.y1; })]);

        var violin_domain = [min_x, max_x]
        var x = d3.scale.linear()
                 .range([0, self.glyphWidth])
                 //.domain(violin_domain)
                 .domain([0, max_node_wl])

        var area = d3.svg.area()
            .interpolate('basis')
            .x(function(d) { return x(d.x); })
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y1); })

        var line = d3.svg.line()
            .interpolate('basis')
            .x(function(d) { return x(d.x); })
            .y(function(d) { return y(d.y1); })

        wlG.append("path")
          .datum(violin_data)
          .attr("class", "area")
          .attr("d", area)
          .style("fill", "#cccccc");

        wlG.append("path")
          .datum(violin_data)
          .attr("class", "violin")
          .attr("d", line)
          .style("stroke", "#cccccc");

        // box plot
        var x = d3.scale.linear()
                  .range([0, self.glyphWidth])
                  .domain([0, max_node_wl]);

        var probs=[0.05,0.25,0.5,0.75,0.95];
        for(var j=0; j<probs.length; j++){
          probs[j]=x(d3.quantile(self.node_wls[round], probs[j]))
        }

        wlG.append("rect")
          .attr("class", "boxplot fill")
          .attr("y", roundHeight*0.35 - self.node_r*0.5)
          .attr("height", self.node_r)
          .attr("x", probs[1])
          .attr("width", -probs[1]+probs[3])
          .style("fill", "black");

        var iS=[0,2,4];
        var iSclass=["","median",""];
        var iSColor=["black", "white", "black"]
        for(var j=0; j<iS.length; j++){
          wlG.append("line")
            .attr("class", "boxplot "+iSclass[j])
            .attr("y1", roundHeight*0.35 - self.node_r*0.5)
            .attr("y2", roundHeight*0.35 + self.node_r*0.5)
            .attr("x1", probs[iS[j]])
            .attr("x2", probs[iS[j]])
            .style("fill", iSColor[j])
            .style("stroke", iSColor[j]);
        }

        var iS=[[0,1],[3,4]];
        for(var j=0; j<iS.length; j++){
          wlG.append("line")
            .attr("class", "boxplot")
            .attr("y1", roundHeight*0.35)
            .attr("y2", roundHeight*0.35)
            .attr("x1", probs[iS[j][0]])
            .attr("x2", probs[iS[j][1]])
            .style("stroke", "black");
        }

        wlG.append("rect")
          .attr("class", "boxplot")
          .attr("y", roundHeight*0.35 - self.node_r*0.5)
          .attr("height", self.node_r)
          .attr("x", probs[1])
          .attr("width", -probs[1]+probs[3])
          .style("stroke", "black");

        wlG.append("circle")
          .attr("class", "boxplot mean")
          .attr("cy", roundHeight*0.35)
          .attr("cx", x(d3.mean(self.node_wls[round])))
          .attr("r", self.node_r*0.2)
          .style("fill", "white")
          .style("stroke", 'None');

        wlG.append("circle")
          .attr("class", "boxplot mean")
          .attr("cy", roundHeight*0.35)
          .attr("cx", x(d3.mean(self.node_wls[round])))
          .attr("r", self.node_r*0.1)
          .style("fill", "black")
          .style("stroke", 'None');
      }
    },

    drawMaxNodes()
    {
      var self = this

      // draw nodes with max workload TODO
      self.max_node = self.graphG.selectAll(".max-nodes").data(self.max_nodes).enter()
        .append("circle")
        .attr('class', 'max-node')
        .attr('id', function (d, i) {
          return 'maxnode-' + i
        })
        .attr("r", self.node_r) 
        .attr("fill", "none")
        .attr("stroke-opacity", function (d) {
          if (self.filtered_nodes[d.name] == 1) return 0.8
          else return 0
        })
        .attr("stroke", "black")
        .attr("stroke-width", 1) 
        .attr("cx", function (d) {
          if (self.filtered_nodes[d.name] == 1) 
            return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
          else return 0
        })
        .attr("cy", function (d) {
          if (self.filtered_nodes[d.name] == 1)
            return (d.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1);
          else return 0
        });
    },

    drawProcNodes()
    {
      var self = this

      var temp_nodes = []
      self.node.remove();
      for (var r in self.node_json) {
        for (var name in self.node_json[r]) {
          temp_nodes.push({
            "name": parseInt(name),
            "count": self.node_json[r][name].count,
            "localCount": self.node_json[r][name].localCount,
            "workload": self.node_json[r][name].workload,
            "estWorkload": self.node_json[r][name].estWorkload,
            "npts": self.node_json[r][name].npts,
            "nfdpts": self.node_json[r][name].nfdpts,
            "round": parseInt(r)
          })
        }
      }

      // draw nodes representing procs
      self.node = self.graphG.selectAll(".nodes").data(temp_nodes).enter()
        .append("circle")
        .attr('class', 'node')
        .attr('id', function (d, i) { return 'node-' + i })
        .attr("r", function (d) {
          if (d.name == self.n_nodes) return self.super_node_r;
          else {
            return (d.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
          // return (d.npts - d.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
          }
        })
        .attr("fill", function (d) {
          if (d.name == self.n_nodes) return '#666'
          else {
            var linear = d3.scale.linear()
              .domain([self.min_wl[d.round - 1], self.max_wl[d.round - 1]])
              .range([0, 1]);

            return self.compute(linear(d.workload));
          }
        })
        .attr("opacity", "1.0")
        .attr("cx", function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
        })
        .attr("cy", function (d) {
          return (d.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1);
        })
        .attr("stroke", "black")
        .attr("stroke-width", function (d) {
          return 0
          // if (d.name == self.n_nodes) return 0; // TODO 统一处理
          // else return (d.nfdpts - self.min_nfdpts) * self.max_node2_stroke_w / (self.max_nfdpts - self.min_nfdpts);
        })
        .on('click', function (d, i) {
          if (d.name == self.n_nodes) alert("It is a super node!!");
          else {
            self.graphG.selectAll(".nodetexts").remove();
            self.graphG.selectAll(".noderects").remove();
            self.focused_round = self.focused_name = -1;

            // select or disselect node
            if (self.selected_nodes[d.round-1][d.name] == 1)
              self.selected_nodes[d.round-1][d.name] = 0;
            else
              self.selected_nodes[d.round-1][d.name] = 1;

            self.updateProcLinks(-1, -1);
            self.updateProcNodes();
            self.updateProcNodeRects();

            if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();
          }
        })
        .on('mouseover', function (d) { 
          if (d.name != self.n_nodes) self.showDetails(d) 
        })
        .on("mouseout", function (d) { 
          if (d.name != self.n_nodes) self.hideDetails()
        })
        .on('contextmenu', function (d) { 
          if (d.name == self.n_nodes) alert("It is a super node!!");
          else {
            var focused_node = {"name": d.name, "round": d.round}; 
            d3.event.preventDefault();
            // console.log('contextmenu')
            self.menu(d3.mouse(this)[0]+20 + self.paddingWidth, d3.mouse(this)[1] + self.paddingHeight, focused_node);
          }
        });

      // draw Proc. IDs
      var procIDtexts = [];
      for (var i = 0; i <= self.n_nodes; i ++) {
        if (self.rankings[i] || self.rankings[i] == 0) procIDtexts.push({
          "name": i,
          "rank": self.rankings[i]
        })
      }

      var drag = d3.behavior.drag()
            .on("drag", dragmove)
            .on('dragend', dragend);
      
      function dragmove(d) {
        var tartext = "#procidtext"+d3.select(this).attr("idtext");
        d3.select(tartext)
          .attr("x", d3.event.x)
          .attr("y", d3.event.y)
       
       self.endx =  d3.event.x
      }

      function dragend(d) {
        // rerank
        var tid = parseInt(d3.select(this).attr("idtext"));
        //console.log(d3.event.x)
        //var endx = parseInt(d3.event.x)
        // self.rankings[d.name] * self.graphWidth / self.n_display_nodes
        var position = self.endx*(self.n_display_nodes-1)/self.graphWidth
        var cpo = Math.ceil(position),
            fpo = Math.floor(position)

        var temp_rankings = self.rankings
        self.rankings = {}

        console.log("dragend", position, cpo, fpo, tid, temp_rankings[tid])

        if (fpo == temp_rankings[tid]) self.rankings = temp_rankings

        if (fpo < temp_rankings[tid]) {
          for (var k in temp_rankings) {
            if (temp_rankings[k] <= fpo) self.rankings[k] = temp_rankings[k]

            if (temp_rankings[k] > fpo && temp_rankings[k] < temp_rankings[tid]) self.rankings[k] = temp_rankings[k] + 1

            if (temp_rankings[k] == temp_rankings[tid]) self.rankings[k] = fpo + 1

            if (temp_rankings[k] > temp_rankings[tid]) self.rankings[k] = temp_rankings[k]
          }
        } 

        if (fpo > temp_rankings[tid]) {
          console.log(self.rankings)
          for (var k in temp_rankings) {
            if (temp_rankings[k] < temp_rankings[tid])  {
              self.rankings[k] = temp_rankings[k]
            }

            if (temp_rankings[k] == temp_rankings[tid]) {
              self.rankings[k] = fpo
            }

            if (temp_rankings[k] > temp_rankings[tid] && temp_rankings[k] <= fpo) {
              self.rankings[k] = temp_rankings[k] - 1
            }

            if (temp_rankings[k] > fpo) {
              self.rankings[k] = temp_rankings[k]
            }
          }
        }

        self.raw_rankings = self.rankings

        console.log("new rankings: ", self.rankings)
        
        self.updateGraph();
      }

      self.textG.selectAll(".procIDtexts").remove(); 
      self.textG.selectAll(".made").remove(); // ma de

      self.textG.selectAll(".made").data(procIDtexts).enter().append("rect")
        .attr("class", "made")
        .attr("idtext", function(d) {return d.name})
        .attr('x', function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1) - 10;
        })
        .attr('y', 0 - 15)
        .attr('width', 20)
        .attr('height', 20)
        .attr('stroke', 'white')
        .attr('fill', 'white')
        .call(drag)

      self.textG.selectAll(".procIDtexts").data(procIDtexts).enter().append("text")
        .text(function (d) { 
          if (d.name < self.n_nodes) return d.name; 
          else return "-"
        })
        .attr("class", "procIDtexts")
        .attr("id", function(d) {return "procidtext"+d.name})
        .attr('x', function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
        })
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', self.node_text_size)
        //.call(drag)
    
    },

    drawRoundIndex()
    {
      var self = this;

      var data = self.rounds
      self.roundG.selectAll(".roundindex") 
        .data(data)
        .enter().append("rect")
        .attr("class", function(d,i) {
          return "roundindex"+d
        })
        .attr("x", 5)
        .attr("y", function (d, i) { 
          return i*self.graphHeight/(self.num_rounds-1) - self.node_r/2;
        })
        .attr("width", 20)
        .attr("height", self.node_r)
        .attr("fill", "white")
        .attr("stroke-width", 1)
        .attr("stroke", "black")
        .on('mouseover', function(d){
          d3.select(this).style('cursor', 'pointer')
        })
        .on('click', function(d,i){
          if(self.selected_rounds.indexOf(d)!=-1) {
            self.selected_rounds.splice(self.selected_rounds.indexOf(d),1) // remove this round

            d3.select(".roundindex"+d).attr("fill", "white")
          } else {
            self.selected_rounds.push(d);

            d3.select(".roundindex"+d).attr("fill", "grey")
          }

          console.log("selected_rounds", self.selected_rounds)

          self.reRankGraph(self.init_max_nodes, self.init_nodes, self.init_links, self.init_dists, self.init_transfers)

        })

      self.roundG.selectAll(".roundindextexts") 
        .data(data)
        .enter().append("text")
        .attr("class", "roundindextexts")
        .text(function(d, i) {
          return d
        })
        .attr("x", 15)
        .attr("y", function (d, i) { 
          return i*self.graphHeight/(self.num_rounds-1) + self.node_r/2 - 4;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', self.node_text_size);
    },

    drawProcLinks()
    {
      var self = this

      var line_data = []
      self.proc_link.selectAll('path').remove();
      for (var r in self.link_json) {
        for (var source in self.link_json[r]) {
          for (var target in self.link_json[r][source]) {
            var d = self.link_json[r][source][target]

            if (d.value > 0 || d.count > 0) {
              var x1 = self.rankings[parseInt(source)] * self.graphWidth / (self.n_display_nodes-1),
                y1 = (parseInt(r) - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1),
                x2 = self.rankings[parseInt(target)] * self.graphWidth / (self.n_display_nodes-1),
                y2 = (parseInt(r) - self.rounds[0] + 1) * self.graphHeight / (self.num_rounds - 1);

              var p1 = [x1, y1]
              var p2 = [(x2 + 3 * x1) / 4, (y1 + y2) / 2]
              var p3 = [(3 * x2 + x1) / 4, (y1 + y2) / 2]
              var p4 = [x2, y2]

              line_data.push({
                'points': [p1, p2, p3, p4],
                'attr': {"source": parseInt(source), "target": parseInt(target), "value": d.value, "count": d.count, "round": parseInt(r)}
              })
            }
          }
        }
      }

      line_data.forEach(function (line) {
        self.proc_link.append('path')
          .datum(line.points)
          .attr("d", self.lineGenaretor)
          .attr("id", "line-" + line.attr.round + line.attr.source + line.attr.target)
          .attr("fill", "none")
          .attr('class', 'proc-link')
          .attr('source', line.attr.source)
          .attr('target', line.attr.target)
          .attr("round", line.attr.round)
          .attr("value", line.attr.value)
          .attr("count", line.attr.count)
          .attr("stroke-width", function (d) {
            if (line.attr.value > 100)
              return (line.attr.value - self.min_value) * (3.0 - 0.3) / (self.max_value - self.min_value) + 0.3;
            else {
              if (line.attr.count > 0) 
                return (line.attr.count - self.min_link_count) * (3.0 - 0.3) / (self.max_link_count - self.min_link_count) + 0.3;
              else return 0;
            }
          })
          .attr("stroke", function (d) {
            // To Be Changed
            if (line.attr.value > 0 && line.attr.count > 0) return "black" // both
            if (line.attr.value > 0 && line.attr.count <= 0) return "#3288bd" // only particles
            if (line.attr.value <= 0 && line.attr.count > 0) return "#d53e4f" // only blocks
            if (line.attr.value <= 0 && line.attr.count <= 0) return "white"
          })
          .attr("stroke-opacity", 0.4)
      });
    },


    // functions for updating nodes and proc links
    updateProcNodeRects() // TODO do not use .data(nodes) 
    {
      var self = this;

      var rnodes = []
      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j]
          if (self.selected_nodes[index][dnode] == 1)
            rnodes.push({
              "name": dnode,
              "round": index+1
            })
        }
      }

      self.graphG.selectAll(".rects").data(rnodes).enter().append('rect')
        .attr("class", "noderects")
        .attr("x", function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1) - self.rect_xOffset;
        })
        .attr("y", function (d) {
          return (d.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) - self.rect_yOffset;
        })
        .attr("width", self.rect_xOffset*2)
        .attr("height", self.graphHeight / (self.num_rounds - 1) + self.rect_yOffset*2)
        .attr("opacity", 1)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-dasharray", 5)
        .attr("stroke-width", 1);
    },

    updateProcNodes()
    {
      var self = this;

      self.highlighted_nodes = [];
      var hnodes = []
      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        self.highlighted_nodes[index] = {}

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j]

          if (self.nodes_target[index][dnode] == 1 || 
            self.nodes_source[index][dnode] == 1 || 
            self.outdistselected_nodes[index][dnode] == 1 || 
            self.outdistnodes_target[index][dnode] > 0 || 
            self.indistselected_nodes[index][dnode] == 1 || 
            self.indistnodes_source[index][dnode] > 0 || 
            self.nodes_transfer[index][dnode] == 1 || 
            self.indistpath_nodes[index][dnode] == 1) 
          {
            self.highlighted_nodes[index][dnode] = 1;
            hnodes.push({
              "name": dnode,
              "round": index+1
            })
          }
        }
      }

      self.max_node.transition().duration(500)
        .attr('stroke-opacity', function (d) {
          if (self.highlighted_nodes[d.round-1][d.name] == 1) {
            if (self.filtered_nodes[d.name] == 1) return 0.8
            else return 0
          } else {
            if (self.filtered_nodes[d.name] == 1) return 0.4
            else return 0
          }
        })
        .attr("cx", function (d) {
          if (self.filtered_nodes[d.name] == 1) 
            return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
        })
        .attr("cy", function (d) {
          if (self.filtered_nodes[d.name] == 1) 
            return (d.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1);
        })

      self.node.transition().duration(500)
        .attr('opacity', function (u) {
          if (self.highlighted_nodes[u.round-1][u.name] == 1) return 1;
          else return 0.25;
        })
        .attr("cx", function (d) { // super node 肯定排最后一位
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
        })
        .attr("cy", function (d) {
          return (d.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1);
        });

      self.graphG.selectAll(".texts").data(hnodes).enter().append("text")
        .text(function (u) {
          if (u.name != self.n_nodes) return u.name;
        })
        .attr("class", "nodetexts")
        .attr('x', function (u) {
          return self.rankings[u.name] * self.graphWidth / (self.n_display_nodes-1) + self.node_text_xOffset;
        })
        .attr('y', function (u) {
          return (u.round - self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) + self.node_text_yOffset;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', self.node_text_size);

      self.textG.selectAll(".made")
        .transition()
        .duration(500)
        .attr('x', function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1) - 10;
        })
        .attr('y', 0 - 15)

      self.textG.selectAll(".procIDtexts")
        .transition()
        .duration(500)
        .attr('x', function (d) {
          return self.rankings[d.name] * self.graphWidth / (self.n_display_nodes-1);
        })
        .attr('y', 0)
    },

    updateProcLinks(r, name) 
    {
      var self = this

      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        self.nodes_source[index] = {};
        self.nodes_target[index] = {};
      }

      self.proc_link.selectAll('path')
        .transition()
        .duration(500)
        .attr("stroke-opacity", function (q) {
          var source = d3.select(this).attr('source'),
            target = d3.select(this).attr('target'),
            round = d3.select(this).attr('round'),
            value = d3.select(this).attr('value'),
            count = d3.select(this).attr('count');

          if (r < 0) {
            if (self.selected_nodes[round-1][source] == 1 || self.selected_nodes[round-1][target] == 1) {
              if (self.selected_nodes[round-1][source] == 1 && (value > 100 || count > 0)) {
                self.nodes_target[round][target] = 1;
                self.nodes_source[round-1][source] = 1;
              }

              if (self.selected_nodes[round-1][target] == 1 && (value > 100 || count > 0)) {
                self.nodes_source[round-1][source] = 1;
                self.nodes_target[round][target] = 1;
              }

              return 1;
            }
            else return 0.05;
          }
          else {
            if ((round >= r && source == name) || (round < r && target == name)) {
              if ((round >= r && source == name) && (value > 100 || count > 0)) {
                self.nodes_target[round][target] = 1;
                self.nodes_source[round-1][name] = 1;
              }

              if ((round < r && target == name) && (value > 100 || count > 0)) {
                self.nodes_source[round-1][source] = 1;
                self.nodes_target[round][name] = 1;
              }

              return 1;
            }
            else return 0.05;
          }
        });
    },

    // functions for block dist
    computeBlockPathBlocks(blockids)
    { 
      var self = this;

      self.nodes_transfer = [];
      self.indistpath_nodes = [];
      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        self.nodes_transfer[index] = {}
        self.indistpath_nodes[index] = {};

        for (var name in self.dist_json[parseInt(index)+1]) {
          for (var bid in self.dist_json[parseInt(index)+1][name]) {
            //if (parseInt(bid) == blockid) 
            if (blockids.indexOf(parseInt(bid))!=-1)
            {
              self.nodes_transfer[index][parseInt(name)] = 1;
              self.indistpath_nodes[index][parseInt(name)] = 1;
            }
          }
        }
      }
    },

    updateInBlockDist(round, name, blockIdList) 
    {
      var self = this;
      d3.selectAll('.in_block_dist_vline'+round+name).remove()
      d3.selectAll('.in_block_dist'+round+name).remove();

      var x1, y1
      var block_len = blockIdList.length

      if (self.is_align_blocks) {
        x1 = Math.max(self.graphWidth/2 - self.max_block_rect_w*self.block_lists_len/2, -1 *self.node_r * 1.1);
        y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) - self.node_r * 1.1 - self.max_block_rect_h;
      } else {
        x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1);  // start position of first rect.
        y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) - self.node_r * 1.1 - self.max_block_rect_h; 
        x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));
      }

      var pnode_r;

      for (var jname in self.node_json[round]) {
        var s = self.node_json[round][jname]

        if (parseInt(jname) == name) {
          if (name == self.n_nodes) pnode_r = self.super_node_r;
          else {
            pnode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks +1) + self.min_node2_r;
            // pnode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
          }
        }
      }

      var xx1, yy1, xx2, yy2
      xx1 = self.rankings[name] * self.graphWidth / (self.n_display_nodes-1)  // node_pos[round][progress_id][0],
      yy1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds-1) - pnode_r // node_pos[round][progress_id][1],
      xx2 = x1 + self.max_block_rect_w * block_len/2
      yy2 = y1 + self.max_block_rect_h + 1
      if (self.is_align_blocks) 
        xx2 = x1 + self.max_block_rect_w*self.block_lists_len/2

      var p1 = [xx1, yy1]
      var p2 = [(xx2 + 3 * xx1)/4, (yy1 + yy2)/2]
      var p3 = [(3 * xx2 + xx1)/4, (yy1 + yy2)/2]
      var p4 = [xx2, yy2]
      self.indist_link.append('path') // line from block rect. to self node
        .datum([p1, p2, p3, p4])
        .attr("d", self.lineGenaretor)
        .attr("class", 'in_block_dist_vline'+round+name) // "block-path"+round+progress_id+"block")
        .attr("stroke", 'black')// TODO
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1)

      var block_pos = {}
      for (var i = 0; i < blockIdList.length; i ++) {
        var blockid = blockIdList[i].blockid
        block_pos[blockid] = [];
      }

      self.graphG.selectAll(".in_block_dist_rect"+round+name)
          //.transition()
          //.duration(500)
          .attr("x", function (u, i) {
            if (self.is_align_blocks) {
              block_pos[u.blockid].push(x1 + self.max_block_rect_w*self.block_align_lists[u.blockid]+self.max_block_rect_w/2);
              return x1 + self.max_block_rect_w*self.block_align_lists[u.blockid]
            } else {
              block_pos[u.blockid].push(x1 + self.max_block_rect_w*i+self.max_block_rect_w/2)
              return x1 + self.max_block_rect_w*i
            }
          })
          .attr("y", function (u, i) { 
            block_pos[u.blockid].push(y1)
            return y1; 
          })
          .on('mouseover', function (u) {
            d3.select(this).attr("stroke-width", 1);   

            var x1
            if (self.is_align_blocks) {
              x1 = Math.max(self.graphWidth/2 - self.max_block_rect_w*self.block_lists_len/2, -1 *self.node_r * 1.1);
            } else {
              var block_len = blockIdList.length
              x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1);  // start position of first rect.
              x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));
            }

            if (self.is_align_blocks) {
              self.graphG.append("line")
                .attr("class", "block_align_line")
                .attr('x1', function () {
                  return x1 + self.max_block_rect_w*self.block_align_lists[u.blockid]+self.max_block_rect_w/2
                })
                .attr('y1', 0)
                .attr('x2', function () {
                  return x1 + self.max_block_rect_w*self.block_align_lists[u.blockid]+self.max_block_rect_w/2
                })
                .attr('y2', self.graphHeight)
                .attr('fill', 'none')
                .attr('stroke', 'light gray')
                .attr('stroke-width', 0.5)
                .style("stroke-dasharray","5,5")
            } 
            
            self.blockRectMouseOver(u.blockid);
          })
          .on("mouseout", function (u) { 
            d3.select(this).attr("stroke-width", function (s) {
              //if (s.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(s.blockid) != -1)
                return 1;
              else return 0.5;
            })

            self.graphG.select(".block_align_line").remove()

            self.blockRectMouseOut(u.blockid);
          })

      self.graphG.selectAll(".in_block_dist_texts"+round+name) // block rects.
          //.transition()
          //.duration(500)
          .attr('x', function (u,i) {
            if (self.is_align_blocks) {
              return x1 + self.max_block_rect_w*self.block_align_lists[u.blockid] + self.max_block_rect_w/2
            } else {
              return x1 + self.max_block_rect_w*i + self.max_block_rect_w/2
            }
          })
          .attr('y', function (d,i) {
            return y1 - self.max_block_rect_h/2
          })

      d3.select('.in_block_dist_rect_outline'+round+name).remove();
      if (self.is_align_blocks) {
        self.graphG.append('rect')
          .attr("class", 'in_block_dist_rect_outline'+round+name)
          .attr("x", x1-1)
          .attr("y", y1-1)
          .attr("width", self.max_block_rect_w*self.block_lists_len+2)
          .attr("height", self.max_block_rect_h+2)
          .attr("opacity", 1)
          .attr("fill", "none")
          .attr("stroke", "black")
          .attr("stroke-dasharray", 5)
          .attr("stroke-width", 0.5);
      }

      blockIdList.forEach(function (u) {
          var snode_r;

          for (var jname in self.node_json[parseInt(round)-1]) {
            var s = self.node_json[parseInt(round)-1][jname]

            if (parseInt(jname) == u.source) {
              if (parseInt(jname) == self.n_nodes) snode_r = self.super_node_r;
              else {
                snode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
                // snode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
              }
            }
          }
  
          var x1 = block_pos[u.blockid][0],
              y1 = block_pos[u.blockid][1],
              x2 = self.rankings[u.source] * self.graphWidth / (self.n_display_nodes-1), // node_pos[round+1][index][0],
              y2 = (round-self.rounds[0]-1) * self.graphHeight / (self.num_rounds - 1) + snode_r; // node_pos[round+1][index][1]

          var p1 = [x1, y1]
          var p2 = [(x2 + 3 * x1)/4, (y1 + y2)/2]
          var p3 = [(3 * x2 + x1)/4, (y1 + y2)/2]
          var p4 = [x2, y2]
          self.indist_link.append('path') // curve lines from source node to block rect.
            .datum([p1, p2, p3, p4])
            .attr("d", self.lineGenaretor)
            .attr("class", 'in_block_dist'+round+name) //"block-path"+round+progress_id+" block"+u)
            .attr("id", u.blockid) // "line-block-"+lineIndex)
            .attr("source", u.source)
            .attr("target", u.target)
            .attr('isLocal', u.isLocal)
            .attr("fill", "none")
            .attr("stroke", function () {
              //if (u.blockid == self.selected_block) 
              // To Be Changed 颜色
              if (self.selected_blocks.indexOf(u.blockid) != -1)
              {
                /*if (u.isLocal == 1) return 'red'
                else return 'green'*/
                return 'grey'
              } else return 'black'
            })// TODO
            .attr("stroke-opacity", function () {
              //if (u.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(u.blockid) != -1)
                return 1
              else return 0.5;
            })
            .attr("stroke-width", function () {
              //if (u.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(u.blockid) != -1)
                return 1.5
              else return 1;
            })
        })
    },

    addInBlockDist(round, name, blockids) 
    {
      var self = this;

      var blockIdList = [],
          block_pos = {}

      var source; // for blockid >= 0
 
      for(var jsource in self.transfer_json[round-1]) {
        for (var jtarget in self.transfer_json[round-1][jsource]) {
          for (var bid in self.transfer_json[round-1][jsource][jtarget]) {
            var u = self.transfer_json[round-1][jsource][jtarget][bid]

            if (parseInt(jtarget) == name && (blockids.length > 0 ? blockids.indexOf(parseInt(bid)) != -1 : true)) 
            {
              blockIdList.push({"source": parseInt(jsource), "target": parseInt(jtarget), "blockid": parseInt(bid), "isLocal": u.isLocal})
              block_pos[parseInt(bid)] = []

              source = parseInt(jsource);

              if (blockids.length > 0) // 为了算reorder graph
              {
                if (!self.distances[parseInt(jsource)]) self.distances[parseInt(jsource)] = {}
                if (!self.distances[parseInt(jsource)][parseInt(jtarget)]) self.distances[parseInt(jsource)][parseInt(jtarget)] = 0

                self.distances[parseInt(jsource)][parseInt(jtarget)] += Math.abs(self.rankings[parseInt(jsource)] - self.rankings[parseInt(jtarget)])
              }

              if (self.indistnodes_source[round-2][parseInt(jsource)]) self.indistnodes_source[round-2][parseInt(jsource)] += 1;
              else self.indistnodes_source[round-2][parseInt(jsource)] = 1;
            }
          }
        }
      }

      if (blockids.length == 0) { // 为了装入block_dist_array，为了align blocks
        var key = round + '|' + name + '|' + 1; // 1 for in and 0 for out
        self.block_dist_array[key] = blockIdList;
        // console.log("addInBlockDist", self.block_dist_array)
      }

      blockIdList.sort(function (a, b) { return a["blockid"] - b["blockid"]; }); 

      var block_len = blockIdList.length;

      var x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1), 
          y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) - self.node_r * 1.1 - self.max_block_rect_h; 
          x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));

      var pnode_r;

      for (var jname in self.node_json[round]) {
        var s = self.node_json[round][jname]

        if (parseInt(jname) == name) {
          if (name == self.n_nodes) pnode_r = self.super_node_r;
          else {
            pnode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
            // pnode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
          }
        }
      }

      if (name == self.n_nodes) { // ???
/*        blockIdList.forEach(function (u) {
          var snode_r;

          for (var jname in self.node_json[parseInt(round)-1]) {
            var s = self.node_json[parseInt(round)-1][jname]

            if (parseInt(jname) == u.source) {
              if (parseInt(jname) == self.n_nodes) snode_r = self.super_node_r
              else {
                snode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks) + self.min_node2_r;
                // snode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
              }
            }
          }

          var x1 = self.rankings[name] * self.graphWidth / self.n_display_nodes,
              y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1),
              x2 = self.rankings[u.source] * self.graphWidth / self.n_display_nodes, // node_pos[round+1][index][0],
              y2 = (round-self.rounds[0]-1) * self.graphHeight / (self.num_rounds - 1) + snode_r; // node_pos[round+1][index][1]

          var p1 = [x1, y1]
          var p2 = [(x2 + 3 * x1)/4, (y1 + y2)/2]
          var p3 = [(3 * x2 + x1)/4, (y1 + y2)/2]
          var p4 = [x2, y2]
          self.indist_link.append('path')
            .datum([p1, p2, p3, p4])
            .attr("d", self.lineGenaretor)
            .attr("class", 'in_block_dist'+round+name) //"block-path"+round+progress_id+" block"+u)
            .attr("id", u.blockid) // "line-block-"+lineIndex)
            .attr('isLocal', u.isLocal)
            .attr("fill", "none")
            .attr("stroke", function () {
              if (u.blockid == self.selected_block) {
                if (u.isLocal == 1) return 'red'
                else return 'green'
              } else return 'black'
            })// TODO
            .attr("stroke-opacity", function () {
              if (u.blockid == self.selected_block) return 1
              else return 0.3;
            })
            .attr("stroke-width", function () {
              if (u.blockid == self.selected_block) return 1.5
              else return 1;
            })
        })
*/
      } else {
        var xx1 = self.rankings[name] * self.graphWidth / (self.n_display_nodes-1),  // node_pos[round][progress_id][0],
            yy1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds-1) - pnode_r, // node_pos[round][progress_id][1],
            xx2 = x1 + self.max_block_rect_w * block_len/2,
            yy2 = y1 + self.max_block_rect_h

        var p1 = [xx1, yy1]
        var p2 = [(xx2 + 3 * xx1)/4, (yy1 + yy2)/2]
        var p3 = [(3 * xx2 + xx1)/4, (yy1 + yy2)/2]
        var p4 = [xx2, yy2]
        self.indist_link.append('path') // line from block rect. to self node
          .datum([p1, p2, p3, p4])
          .attr("d", self.lineGenaretor)
          .attr("class", 'in_block_dist_vline'+round+name) // "block-path"+round+progress_id+"block")
          .attr("stroke", 'black')// TODO
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 1)

        var max_his_workload = 0, min_his_workload = 1000000000;

        var total_workload = 0;
        for (var bid in self.dist_json[round][name]) {
          var u = self.dist_json[round][name][bid]
          max_his_workload = Math.max(max_his_workload, u.workload);
          min_his_workload = Math.min(min_his_workload, u.workload);

          total_workload += u.workload;
        }

        //console.log("max_min_his_workload", max_his_workload, min_his_workload)

        self.graphG.selectAll(".in_block_dist_rect"+round+name) // block rects.
          .data(blockIdList)
          .enter().append("rect")
          .attr("class", "in_block_dist_rect"+round+name)
          .attr("x", function (u, i) { 
            block_pos[u.blockid].push(x1 + self.max_block_rect_w*i+self.max_block_rect_w/2)
            return x1 + self.max_block_rect_w*i
          })
          .attr("y", function (u, i) { 
            block_pos[u.blockid].push(y1)
            return y1; 
          })
          .attr("width", self.max_block_rect_w)
          .attr("height", self.max_block_rect_h)
          .attr("fill", function (u, i) {
            var linear = d3.scale.linear()
              .domain([min_his_workload, max_his_workload])
              .range([0, 1]);

            var workload = 0;
            if (self.dist_json[round][name][u.blockid]) {
              workload = self.dist_json[round][name][u.blockid].workload
            }

            return self.compute(linear(workload));
          })
          .attr("stroke-width", function (u) {
            //if (u.blockid == self.selected_block) 
            if (self.selected_blocks.indexOf(u.blockid) != -1)
              return 1
            else return 0.5
          })
          .attr("stroke", "black")
          .attr('cursor', 'pointer')
          .on('click', function (u, i) {
            self.updateBlockTransferPath(u.blockid) 

            if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();   

            var sedata = [round, name, u.blockid];
            self.setRoundProcBlock(sedata)    
          })
          .on('mouseover', function (u) {
            d3.select(this).attr("stroke-width", 1);   

            self.blockRectMouseOver(u.blockid);
          })
          .on("mouseout", function (u) { 
            d3.select(this).attr("stroke-width", function (s) {
              //if (s.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(s.blockid) != -1)
                return 1;
              else return 0.5;
            })

            self.blockRectMouseOut(u.blockid);
          })
          .append("title")
          .text(function (u) { 
            var workload = 0;
            if (self.dist_json[round][name][u.blockid]) {
              workload = self.dist_json[round][name][u.blockid].workload
            }

            var coords = self.bid2coords(u.blockid);
            var texts = u.blockid + ": [" + coords[0] + "," + coords[1] + "," + coords[2] + "], " + workload + ", " + (workload/total_workload * 100).toFixed(2) + "%";;
            
            return texts;
            //return u; 
          });

        self.graphG.selectAll(".in_block_dist_texts"+round+name) // block rects.
          .data(blockIdList)
          .enter().append("text")
          .text(function(u) {
            return u.blockid
          })
          .attr("class", "in_block_dist_texts"+round+name)
          .attr('x', function (u, i) {
            return x1 + self.max_block_rect_w*i + self.max_block_rect_w/2
          })
          .attr('y', function (u, i) {
            return y1 - self.max_block_rect_h/2
          })
          .attr('text-anchor', 'middle')
          .style('font-size', 9);

        if (blockids.length > 0) { // for connecting outdist blocks and indist blocks (along the block transfer path) 如果有outdistselected_node就不连
          for (var i = 0; i < self.display_nodes_array.length; i ++) {
            var dnode = self.display_nodes_array[i]; // dnode 永远不会是 第n_nodes结点
            if (self.outdistselected_nodes[round-2][dnode] == 1 && dnode == source) return;
          }
        }

        blockIdList.forEach(function (u) {
          var snode_r;

          for (var jname in self.node_json[parseInt(round)-1]) {
            var s = self.node_json[parseInt(round)-1][jname]

            if (parseInt(jname) == u.source) {
              if (parseInt(jname) == self.n_nodes) snode_r = self.super_node_r;
              else {
                snode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
                // snode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
              }
            }
          }

          var x1 = block_pos[u.blockid][0],
              y1 = block_pos[u.blockid][1],
              x2 = self.rankings[u.source] * self.graphWidth / (self.n_display_nodes-1), // node_pos[round+1][index][0],
              y2 = (round-self.rounds[0]-1) * self.graphHeight / (self.num_rounds - 1) + snode_r; // node_pos[round+1][index][1]

          var p1 = [x1, y1]
          var p2 = [(x2 + 3 * x1)/4, (y1 + y2)/2]
          var p3 = [(3 * x2 + x1)/4, (y1 + y2)/2]
          var p4 = [x2, y2]
          self.indist_link.append('path') // curve lines from source node to block rect.
            .datum([p1, p2, p3, p4])
            .attr("d", self.lineGenaretor)
            .attr("class", 'in_block_dist'+round+name) //"block-path"+round+progress_id+" block"+u)
            .attr("id", u.blockid) // "line-block-"+lineIndex)
            .attr("source", u.source)
            .attr("target", u.target)
            .attr('isLocal', u.isLocal)
            .attr("fill", "none")
            .attr("stroke", function () {
              //if (u.blockid == self.selected_block) 
              // To Be Changed 颜色
              if (self.selected_blocks.indexOf(u.blockid) != -1)
              {
                /*if (u.isLocal == 1) return 'red'
                else return 'green'*/
                return 'grey'
              } else return 'black'
            })// TODO
            .attr("stroke-opacity", function () {
              //if (u.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(u.blockid) != -1)
                return 1
              else return 0.5;
            })
            .attr("stroke-width", function () {
              //if (u.blockid == self.selected_block) 
              if (self.selected_blocks.indexOf(u.blockid) != -1)
                return 1.5
              else return 1;
            })
        })
      }
    },

    removeInBlockDist(round, name, blockids)
    {
      var self = this;

      if (blockids.length == 0) {
        var key = round + '|' + name + '|' + 1;
        delete self.block_dist_array[key]
        // console.log("removeInBlockDist", self.block_dist_array)
      }

      for(var source in self.transfer_json[round-1]) {
        for (var target in self.transfer_json[round-1][source]) {
          for (var bid in self.transfer_json[round-1][source][target]) {
            if (parseInt(target) == name && (blockids.length > 0 ? blockids.indexOf(parseInt(bid)) != -1 : true)) {
              self.indistnodes_source[round-2][parseInt(source)] = Math.max(self.indistnodes_source[round-2][parseInt(source)]-1, 0);
            }
          }
        }
      }

      d3.selectAll('.in_block_dist'+round+name).remove();
      d3.selectAll('.in_block_dist_vline'+round+name).remove();
      d3.selectAll('.in_block_dist_rect'+round+name).remove();
      d3.selectAll('.in_block_dist_texts'+round+name).remove()
    },

    updateOutBlockDist(round, name, blockIdList) // TODO do not want to use this actually
    {
      var self = this

      d3.selectAll('.out_block_dist'+round+name).remove();
 
      var x1, y1
      if (self.is_align_blocks) {
        x1 = Math.max(self.graphWidth/2 - self.max_block_rect_w*self.block_lists_len/2, -1 *self.node_r * 1.1);
        y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) + self.node_r * 1.1;
      } else {
        var block_len = blockIdList.length
        x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1), 
        y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) + self.node_r * 1.1; 
        x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));
      }

      var pnode_r;

      for (var jname in self.node_json[round]) {
        var s = self.node_json[round][jname]

        if (parseInt(jname) == name) {
          if (name == self.n_nodes) pnode_r = self.super_node_r // cannot happen
          else {
            pnode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
            // pnode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
          }
        }
      }

      var xx1, yy1, xx2, yy2
      xx1 = self.rankings[name] * self.graphWidth / (self.n_display_nodes-1)  // node_pos[round][progress_id][0],
      yy1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds-1) + pnode_r // node_pos[round][progress_id][1],
      xx2 = x1 + self.max_block_rect_w * block_len/2
      yy2 = y1 - 1
      if (self.is_align_blocks) 
        xx2 = x1 + self.max_block_rect_w*self.block_lists_len/2

      var p1 = [xx1, yy1]
      var p2 = [(xx2 + 3 * xx1)/4, (yy1 + yy2)/2]
      var p3 = [(3 * xx2 + xx1)/4, (yy1 + yy2)/2]
      var p4 = [xx2, yy2]
      self.outdist_link.append('path')
        .datum([p1, p2, p3, p4])
        .attr("d", self.lineGenaretor)
        .attr("class", 'out_block_dist'+round+name) // "block-path"+round+progress_id+"block")
        .attr("stroke", 'black')
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1)

      var block_pos = {}
      for (var i = 0; i < blockIdList.length; i ++) {
        var blockid = blockIdList[i]
        block_pos[blockid] = [];
      }
      
      self.graphG.selectAll(".out_block_dist_rect"+round+name)
        //.transition()
        //.duration(500)
        .attr("x", function (u, i) {
          if (self.is_align_blocks) {
            block_pos[u].push(x1 + self.max_block_rect_w*self.block_align_lists[u]+self.max_block_rect_w/2);
            return (x1 + self.max_block_rect_w*self.block_align_lists[u])
          } else {
            block_pos[u].push(x1 + self.max_block_rect_w*i+self.max_block_rect_w/2)
            return (x1 + self.max_block_rect_w*i)
          }
        })
        .attr("y", function (u, i) { 
          block_pos[u].push(y1+self.max_block_rect_h)
          return y1; 
        })
        .on('mouseover', function (u) {
          d3.select(this).attr("stroke-width", 1);   

          var x1
          if (self.is_align_blocks) {
            x1 = Math.max(self.graphWidth/2 - self.max_block_rect_w*self.block_lists_len/2, -1 *self.node_r * 1.1);
          } else {
            var block_len = blockIdList.length
            x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1), 
            x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));
          }

          if (self.is_align_blocks) {
            self.graphG.append("line")
              .attr("class", "block_align_line")
              .attr('x1', function () {
                return x1 + self.max_block_rect_w*self.block_align_lists[u]+self.max_block_rect_w/2
              })
              .attr('y1', 0)
              .attr('x2', function () {
                return x1 + self.max_block_rect_w*self.block_align_lists[u]+self.max_block_rect_w/2
              })
              .attr('y2', self.graphHeight)
              .attr('fill', 'none')
              .attr('stroke', 'light gray')
              .attr('stroke-width', 0.5)
              .style("stroke-dasharray","5,5")
            } 

          self.blockRectMouseOver(u);
        })
        .on("mouseout", function (u) { 
          d3.select(this).attr("stroke-width", function (s) {
            //if (s == self.selected_block) 
            if (self.selected_blocks.indexOf(s) != -1)
              return 1;
            else return 0.5;
          })

          self.graphG.select(".block_align_line").remove()

          self.blockRectMouseOut(u);
        })

      d3.select('.out_block_dist_rect_outline'+round+name).remove();
      if (self.is_align_blocks) {
        self.graphG.append('rect')
          .attr("class", 'out_block_dist_rect_outline'+round+name)
          .attr("x", x1-1)
          .attr("y", y1-1)
          .attr("width", self.max_block_rect_w*self.block_lists_len+2)
          .attr("height", self.max_block_rect_h+2)
          .attr("opacity", 1)
          .attr("fill", "none")
          .attr("stroke", "black")
          .attr("stroke-dasharray", 5)
          .attr("stroke-width", 0.5);
      }

      for(var target in self.transfer_json[round][name]) {
        for (var bid in self.transfer_json[round][name][target]) {
          var u = self.transfer_json[round][name][target][bid]

          if (self.filtered_nodes[parseInt(target)] == 1) {
            var snode_r;

            for (var jname in self.node_json[parseInt(round)+1]) {
              var s = self.node_json[parseInt(round)+1][jname]

              if (parseInt(jname) == parseInt(target)) {
                if (parseInt(jname) == self.n_nodes) snode_r = self.super_node_r;
                else {
                  snode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
                  // snode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
                }
              }
            }

            var x1 = block_pos[parseInt(bid)][0],
                y1 = block_pos[parseInt(bid)][1],
                x2 = self.rankings[parseInt(target)] * self.graphWidth / (self.n_display_nodes-1), 
                y2 = (round-self.rounds[0]+1) * self.graphHeight / (self.num_rounds - 1) - snode_r; 
/*
            if (flag >= 0 && (self.indistpath_nodes[round][parseInt(target)] == 1 && self.indistselected_nodes[round][parseInt(target)] != 1 && parseInt(target) != self.n_nodes)) // for connecting outdist blocks and indist blocks (along the block transfer path) 如果有在block transfer path上的node，那么把线指向其上方的block
              y2 = y2 + snode_r - self.node_r * 1.1 - self.max_block_rect_h;
*/ // TODO 怎么处理这个复杂的玩意儿           
            var p1 = [x1, y1]
            var p2 = [(x2 + 3 * x1)/4, (y1 + y2)/2]
            var p3 = [(3 * x2 + x1)/4, (y1 + y2)/2]
            var p4 = [x2, y2]
            self.outdist_link.append('path')
              .datum([p1, p2, p3, p4])
              .attr("d", self.lineGenaretor)
              .attr("class", 'out_block_dist'+round+name) //"block-path"+round+progress_id+" block"+u)
              .attr("id", parseInt(bid)) // "line-block-"+lineIndex)
              .attr("isLocal", u.isLocal)
              .attr("fill", "none")
              .attr("stroke", function () {
                //if (parseInt(bid) == self.selected_block) 
                // To Be Changed 颜色
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                {
                  /*if (u.isLocal == 1) return 'red'
                  else return 'green'*/
                  return 'grey'
                } else return 'black'
              })// TODO
              .attr("stroke-opacity", function () {
                //if (parseInt(bid) == self.selected_block) 
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                  return 1
                else return 0.5;
              })
              .attr("stroke-width", function () {
                //if (parseInt(bid) == self.selected_block) 
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                  return 1.5
                else return 1;
              })
            //lineIndex+=1
          }
        }
      }
    },

    addOutBlockDist(round, name) 
    {
      var self = this;

      var blockIdList = [],
          block_pos = {}

      var block2proc = [];
      for(var target in self.transfer_json[round][name]){
        for (var bid in self.transfer_json[round][name][target]) {
          block2proc.push({
            "target": parseInt(target),
            "blockid": parseInt(bid)
          })

          if (self.filtered_nodes[parseInt(target)] == 1) {
            if (self.outdistnodes_target[round][parseInt(target)]) self.outdistnodes_target[round][parseInt(target)] += 1;
            else self.outdistnodes_target[round][parseInt(target)] = 1;
          }

          if(blockIdList.indexOf(parseInt(bid)) == -1) {
            blockIdList.push(parseInt(bid))
            block_pos[parseInt(bid)] = []
          }
        }
      }

      { // 为了装入block_dist_array，为了align blocks
        var key = round + '|' + name + '|' + 0; // 1 for in and 0 for out
        self.block_dist_array[key] = blockIdList;

        // console.log("addOutBlockDist", self.block_dist_array)
      }

      blockIdList.sort(function (a, b) {
        return a - b;
      });

      var block_len = blockIdList.length;

      var x1 = Math.max(self.rankings[name] * self.graphWidth / (self.n_display_nodes-1) - self.max_block_rect_w*block_len/2, -1 *self.node_r * 1.1), 
          y1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds - 1) + self.node_r * 1.1; 
          x1 = Math.min(x1, self.graphWidth - self.max_block_rect_w * (block_len+2));

      var pnode_r;

      for (var jname in self.node_json[round]) {
        var s = self.node_json[round][jname]

        if (parseInt(jname) == name) {
          if (name == self.n_nodes) pnode_r = self.super_node_r // cannot happen
          else {
            pnode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
            // pnode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
          }
        }
      }

      var xx1 = self.rankings[name] * self.graphWidth / (self.n_display_nodes-1),  // node_pos[round][progress_id][0],
          yy1 = (round-self.rounds[0]) * self.graphHeight / (self.num_rounds-1) + pnode_r, // node_pos[round][progress_id][1],
          xx2 = x1 + self.max_block_rect_w * block_len/2,
          yy2 = y1

      var p1 = [xx1, yy1]
      var p2 = [(xx2 + 3 * xx1)/4, (yy1 + yy2)/2]
      var p3 = [(3 * xx2 + xx1)/4, (yy1 + yy2)/2]
      var p4 = [xx2, yy2]
      self.outdist_link.append('path')
        .datum([p1, p2, p3, p4])
        .attr("d", self.lineGenaretor)
        .attr("class", 'out_block_dist'+round+name) // "block-path"+round+progress_id+"block")
        .attr("stroke", 'black')// TODO
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1)

      var max_his_workload = 0, min_his_workload = 1000000000;   

      var blkwl = {}
      blockIdList.forEach(function (d) {
        blkwl[d] = 0;
        var flag = 0;
        block2proc.forEach(function (u) {
          if (u.blockid == d)  {
            if (self.filtered_nodes[u.target] == 1) {
              if (self.dist_json[parseInt(round)+1][u.target][u.blockid])
                blkwl[d] += self.dist_json[parseInt(round)+1][u.target][u.blockid].workload
            } else flag = 1
          }
        })

        if (flag == 0) {
          max_his_workload = Math.max(max_his_workload, blkwl[d]);
          min_his_workload = Math.min(min_his_workload, blkwl[d]);
        }
      })

      self.graphG.selectAll(".out_block_dist_rect"+round+name)
        .data(blockIdList)
        .enter().append("rect")
        .attr("class", "out_block_dist_rect"+round+name)
        .attr("x", function (u, i) { 
          block_pos[u].push(x1 + self.max_block_rect_w*i+self.max_block_rect_w/2)
          return x1 + self.max_block_rect_w*i
        })
        .attr("y", function (u, i) { 
          block_pos[u].push(y1+self.max_block_rect_h)
          return y1; 
        })
        .attr("width", self.max_block_rect_w)
        .attr("height", self.max_block_rect_h)
        .attr("fill", function (u, i) {
          var flag = 0
          if (self.transfer_json[round][name][parseInt(self.n_nodes)+1]) {
            for (bid in self.transfer_json[round][name][parseInt(self.n_nodes)+1]) {
              if (parseInt(bid) == u) flag = 1
            }
          }

          if (flag == 1) return 'white'
          else {
            var linear = d3.scale.linear()
              .domain([min_his_workload, max_his_workload])
              .range([0, 1]);

            var workload = blkwl[u]
            if (workload < 0) alert("Error block workload!");

            return self.compute(linear(workload));
          }
        })
        .attr("stroke-width", function (u) {
          //if (u == self.selected_block) 
          if (self.selected_blocks.indexOf(u) != -1)
            return 1
          else return 0.5
        })
        .attr("stroke", "black")
        .attr('cursor', 'pointer')
        .on('click', function (u, i) {
          self.updateBlockTransferPath(u);

          if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();

          var sedata = [round, name, u.blockid];
          self.setRoundProcBlock(sedata) 
        })
        .on('mouseover', function (u) {
          d3.select(this).attr("stroke-width", 1);   

          self.blockRectMouseOver(u);
        })
        .on("mouseout", function (u) { 
          d3.select(this).attr("stroke-width", function (s) {
            //if (s == self.selected_block) 
            if (self.selected_blocks.indexOf(s) != -1)
              return 1;
            else return 0.5;
          })

          self.blockRectMouseOut(u);
        })
        .append("title")
        .text(function (u) { 
          var workload = 0;

          workload = blkwl[u]
          var coords = self.bid2coords(u);
          var texts = u + ": [" + coords[0] + "," + coords[1] + "," + coords[2] + "], " + workload;
          
          return texts;
          //return u; 
        });
    
      for(var target in self.transfer_json[round][name]) {
        for (var bid in self.transfer_json[round][name][target]) {
          var u = self.transfer_json[round][name][target][bid]

          if (self.filtered_nodes[parseInt(target)] == 1) {
            var snode_r;

            for (var jname in self.node_json[parseInt(round)+1]) {
              var s = self.node_json[parseInt(round)+1][jname]

              if (parseInt(jname) == parseInt(target)) {
                if (parseInt(jname) == self.n_nodes) snode_r = self.super_node_r;
                else {
                  snode_r = (s.count - self.min_nblocks) * (self.max_node2_r - self.min_node2_r) / (self.max_nblocks - self.min_nblocks+1) + self.min_node2_r;
                  // snode_r = (s.npts - s.nfdpts - self.min_nufdpts) * (self.max_node2_r - self.min_node2_r) / (self.max_npts - self.min_nufdpts) + self.min_node2_r;
                }
              }
            }

            var x1 = block_pos[parseInt(bid)][0],
                y1 = block_pos[parseInt(bid)][1],
                x2 = self.rankings[parseInt(target)] * self.graphWidth / (self.n_display_nodes-1), 
                y2 = (round-self.rounds[0]+1) * self.graphHeight / (self.num_rounds - 1) - snode_r; 
/*
            if (flag >= 0 && (self.indistpath_nodes[round][parseInt(target)] == 1 && self.indistselected_nodes[round][parseInt(target)] != 1 && parseInt(target) != self.n_nodes)) // for connecting outdist blocks and indist blocks (along the block transfer path) 如果有在block transfer path上的node，那么把线指向其上方的block
              y2 = y2 + snode_r - self.node_r * 1.1 - self.max_block_rect_h;
*/            
            var p1 = [x1, y1]
            var p2 = [(x2 + 3 * x1)/4, (y1 + y2)/2]
            var p3 = [(3 * x2 + x1)/4, (y1 + y2)/2]
            var p4 = [x2, y2]
            self.outdist_link.append('path')
              .datum([p1, p2, p3, p4])
              .attr("d", self.lineGenaretor)
              .attr("class", 'out_block_dist'+round+name) //"block-path"+round+progress_id+" block"+u)
              .attr("id", parseInt(bid)) // "line-block-"+lineIndex)
              .attr("isLocal", u.isLocal)
              .attr("fill", "none")
              .attr("stroke", function () {
                //if (parseInt(bid) == self.selected_block) 
                // To Be Changed 颜色
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                {
                  /*if (u.isLocal == 1) return 'red'
                  else return 'green'*/
                  return 'grey'
                } else return 'black'
              })// TODO
              .attr("stroke-opacity", function () {
                //if (parseInt(bid) == self.selected_block) 
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                  return 1
                else return 0.5;
              })
              .attr("stroke-width", function () {
                //if (parseInt(bid) == self.selected_block) 
                if (self.selected_blocks.indexOf(parseInt(bid)) != -1)
                  return 1.5
                else return 1;
              })
            //lineIndex+=1
          }
        }
      }
    },

    removeOutBlockDist(round, name)
    {
      var self = this;

      var key = round + '|' + name + '|' + 0
      delete self.block_dist_array[key]
      // console.log("removeOutBlockDist", self.block_dist_array)

      for(var target in self.transfer_json[round][name]) {
        for (var bid in self.transfer_json[round][name][target]) {
          //if (self.filtered_nodes[parseInt(target)] == 1)
          self.outdistnodes_target[round][parseInt(target)] = Math.max(self.outdistnodes_target[round][parseInt(target)]-1, 0);
        }
      }

      d3.selectAll('.out_block_dist'+round+name).remove();
      d3.selectAll('.out_block_dist_rect'+round+name).remove();
    },

    addDistance(round, name, blockids) 
    {
      var self = this;
 
      if (blockids.length > 0) 
      {
        for(var jsource in self.transfer_json[round-1]) 
        {
          for (var jtarget in self.transfer_json[round-1][jsource]) 
          {
            for (var bid in self.transfer_json[round-1][jsource][jtarget]) 
            {
              if (parseInt(jtarget) == name && blockids.indexOf(parseInt(bid)) != -1) 
              {    
                if (!self.distances[parseInt(jsource)]) self.distances[parseInt(jsource)] = {}
                if (!self.distances[parseInt(jsource)][parseInt(jtarget)]) self.distances[parseInt(jsource)][parseInt(jtarget)] = 0

                self.distances[parseInt(jsource)][parseInt(jtarget)] += Math.abs(self.rankings[parseInt(jsource)] - self.rankings[parseInt(jtarget)])
              }
            }
          }
        }
      }
    },

    updateBlockTransferPath(blockid) // 点击一个block rect，触发显示block transfer path
    { 
      var self = this;

      self.graphG.selectAll(".nodetexts").remove();

      // for (var i = 1; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length-1; i ++) {
        var index = self.rounds[i];

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];

          if (self.indistpath_nodes[index][dnode] == 1) {
            if (self.indistselected_nodes[index][dnode] == 1) 
              self.updateBlockTransferPathRelated(index+1, dnode, []);
            else {
              self.removeInBlockDist(index+1, dnode, self.selected_blocks);
            }
          }
        }
      }

      if (self.selected_blocks.indexOf(blockid) != -1) {        
        self.selected_blocks.splice(self.selected_blocks.indexOf(blockid),1)
      }
      else {
        self.selected_blocks.push(blockid);
      }

      //console.log(self.selected_blocks)
      self.distances = {} // 选reorder时graph上只能有block transfer path

      self.computeBlockPathBlocks(self.selected_blocks);
      // for (var i = 1; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length-1; i ++) {
        var index = self.rounds[i];

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];

          if (self.indistpath_nodes[index][dnode] == 1) {
            if (self.indistselected_nodes[index][dnode] == 1) {
              self.addDistance(index+1, dnode, self.selected_blocks);
              self.updateBlockTransferPathRelated(index+1, dnode, self.selected_blocks);
            }
            else {
              self.addInBlockDist(index+1, dnode, self.selected_blocks);
            }
          }
        }
      }

      self.updateProcNodes();
    },

    updateBlockTransferPathRelated(round, name, blockids)
    {
      d3.selectAll('.out_block_dist'+round+name)
        .transition()
        .duration(500)
        .attr("stroke", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
          {
            if (d3.select(this).attr('isLocal') == 1) return "red";
            else return 'green'
          } else return "black"
        })
        .attr("stroke-width", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
            return 1.5;
          else return 1;
        })
        .attr("stroke-opacity", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
            return 1
          else return 0.5;
        })

      d3.selectAll('.in_block_dist'+round+name)
        .transition()
        .duration(500)
        .attr("stroke", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
          {
            if (d3.select(this).attr('isLocal') == 1) return "red";
            else return 'green'
          } else return "black"
        })
        .attr("stroke-width", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
            return 1.5;
          else return 1;
        })
        .attr("stroke-opacity", function () {
          //if (d3.select(this).attr('id') == blockid) 
          if (blockids.indexOf(d3.select(this).attr('id')) != -1)
            return 1;
          else return 0.5;
        })

      d3.selectAll('.out_block_dist_rect'+round+name) 
        .attr("stroke-width", function (u){
          //if (u == blockid) 
          if (blockids.indexOf(u) != -1)
            return 1;
          else return 0.5;
        })

      d3.selectAll('.in_block_dist_rect'+round+name)
        .attr("stroke-width", function (u){
          //if (u.blockid == blockid) 
          if (blockids.indexOf(u) != -1)
            return 1;
          else return 0.5;
        })
    },

    blockRectMouseOver(u) 
    {
      var self = this;

      // for (var i = 0; i < self.max_round; i ++) { // TODO to be improved
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];

          d3.selectAll(".out_block_dist"+(index+1)+dnode)
            .transition()
            .duration(500)
            .attr("stroke", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
              {
                // if (d3.select(this).attr('isLocal') == 1) return "red";
                // else return 'green'
                return "grey"
              } else return "black"
            })
            .attr("stroke-width", function () {
              //if (d3.select(this).attr('id') == u || d3.select(this).attr('id') == self.selected_block) 
              if (d3.select(this).attr('id') == u || self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1.5;
              else return 1;
            })
            .attr("stroke-opacity", function () {
              //if (d3.select(this).attr('id') == u || d3.select(this).attr('id') == self.selected_block) 
              if (d3.select(this).attr('id') == u || self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1;
              else return 0.5;
            })

          d3.selectAll(".in_block_dist"+(index+1)+dnode)
            .transition()
            .duration(500)
            .attr("stroke", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
              {
                // if (d3.select(this).attr('isLocal') == 1) return "red";
                // else return 'green'
                return 'grey'
              } else return "black"
            })
            .attr("stroke-width", function () {
              //if (d3.select(this).attr('id') == u || d3.select(this).attr('id') == self.selected_block) 
              if (d3.select(this).attr('id') == u || self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1.5;
              else return 1;
            })
            .attr("stroke-opacity", function () {
              // if (d3.select(this).attr('id') == u || d3.select(this).attr('id') == self.selected_block) 
              if (d3.select(this).attr('id') == u || self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1;
              else return 0.5;
            })
        }
      }
    },

    blockRectMouseOut(u) 
    {
      var self = this;

      // for (var i = 0; i < self.max_round; i ++) { // TODO to be improved
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];

          d3.selectAll(".out_block_dist"+(index+1)+dnode)
            .transition()
            .duration(500)
            .attr("stroke", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
              {
                // if (d3.select(this).attr('isLocal') == 1) return "red";
                // else return 'green'
                return 'grey'
              } else return 'black'
            })
            .attr("stroke-width", function () {
              //if (d3.select(this).attr('id') == self.selected_block)
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1.5
              else return 1;
            })
            .attr("stroke-opacity", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1
              else return 0.5;
            })

          d3.selectAll(".in_block_dist"+(index+1)+dnode)
            .transition()
            .duration(500)
            .attr("stroke", function () {
              //if (d3.select(this).attr('id') == self.selected_block)
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
              {
                // if (d3.select(this).attr('isLocal') == 1) return "red";
                // else return 'green'
                return 'grey'
              } else return 'black'
            })
            .attr("stroke-width", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1.5
              else return 1;
            })
            .attr("stroke-opacity", function () {
              //if (d3.select(this).attr('id') == self.selected_block) 
              if (self.selected_blocks.indexOf(parseInt(d3.select(this).attr('id'))) != -1)
                return 1
              else return 0.5;
            })
        }
      }
    },

    // functions for checking nodes
    isNoneNodesHighlighted()
    {
      var self = this;

      // for (var i = 0; i < self.max_round; i ++) {
      for (var i = 0; i < self.rounds.length; i ++) {
        var index = self.rounds[i]-1;

        for (var j = 0; j < self.display_nodes_array.length; j ++) {
          var dnode = self.display_nodes_array[j];
          if (self.highlighted_nodes[index][dnode] == 1) return false;
        }
      }

      return true;
    },

    recoveryProcNodesLinks()
    {
      var self = this;

      self.max_node.transition().duration(500).attr('stroke-opacity', function(d) {
        if (self.filtered_nodes[d.name] == 1) return 0.8
        else return 0
      });
      self.node.transition().duration(500).attr('opacity', 1)

      self.proc_link.selectAll('path')
        .transition()
        .duration(500)
        .attr("stroke-opacity", 0.4)
    },

    // functions for context menu (rignt click events)
    contextMenu() {
      var height,
          width, 
          margin = 0.1, // fraction of width
          items = [], 
          rescale = false, 
          style = {
            'rect': {
              'mouseout': {
                'fill': 'rgb(244,244,244)', 
                'stroke': 'white', 
                'stroke-width': '1px'
              }, 
              'mouseover': {
                'fill': 'rgb(200,200,200)'
              }
            }, 
            'text': {
              'fill': 'steelblue', 
              'font-size': '13'
            }
          }; 
        
      function menu(x, y, focused_node) {
        var self = this;

        d3.select('.context-menu').remove();
        scaleItems();

        // Draw the menu
        d3.select('#container-g')
          .append('g').attr('class', 'context-menu')
          .selectAll('tmp')
          .data(items).enter()
          .append('g').attr('class', 'menu-entry')
          .style({'cursor': 'pointer'})
          .on('mouseover', function(){ 
            d3.select(this).select('rect').style(style.rect.mouseover) })
          .on('mouseout', function(){ 
            d3.select(this).select('rect').style(style.rect.mouseout) });
            
        d3.selectAll('.menu-entry')
          .append('rect')
          .attr('class', style.text)
          .attr('x', x)
          .attr('y', function(d, i){ return y + (i * height); })
          .attr('width', width)
          .attr('height', height)
          .style(style.rect.mouseout);
            
        d3.selectAll('.menu-entry')
          .append('text')
          .text(function(d){ return d; })
          .attr('x', x)
          .attr('y', function(d, i){ return y + (i * height); })
          .attr('dy', height - margin / 2)
          .attr('dx', margin)
          .style(style.text);

        d3.selectAll('.menu-entry')
          .on('click', function (d, index){ 
            var name = focused_node.name, round = focused_node.round;
            
            if (index == 0) { // Incoming Block Dist.
              if (round == 1) { alert("First round no incoming!"); return; }
              
              self.graphG.selectAll(".nodetexts").remove();

              if (self.indistselected_nodes[round-1][name] == 1) {
                self.indistselected_nodes[round-1][name] = 0;
                self.removeInBlockDist(round, name, []);
                if (self.indistpath_nodes[round-1][name] == 1) {
                  self.addInBlockDist(round, name, self.selected_blocks);
                }
              }
              else {
                self.indistselected_nodes[round-1][name] = 1;
                if (self.indistpath_nodes[round-1][name] == 1) 
                  self.removeInBlockDist(round, name, self.selected_blocks);
                self.addInBlockDist(round, name, []);
              }

              self.updateProcLinks(-1, -1);
              self.updateProcNodes();
            } else if (index == 1) { // Outgoing Block Dist.
              self.graphG.selectAll(".nodetexts").remove();

              if (self.outdistselected_nodes[round-1][name] == 1) {
                self.outdistselected_nodes[round-1][name] = 0;
                self.removeOutBlockDist(round, name);
                /*for(var target in self.transfer_json[round][name]) {
                  for (var bid in self.transfer_json[round][name][target]) {
                    if (self.filtered_nodes[parseInt(target)] == 1) {
                      if (self.indistpath_nodes[round][parseInt(target)] == 1 && self.indistselected_nodes[round][parseInt(target)] != 1) {
                        self.addInBlockDist(round+1, parseInt(target), self.selected_block);
                      }
                    }
                  }
                }*/

              }
              else {
                self.outdistselected_nodes[round-1][name] = 1;
                self.addOutBlockDist(round, name);
                /*for(var target in self.transfer_json[round][name]) {
                  for (var bid in self.transfer_json[round][name][target]) {
                    if (self.filtered_nodes[parseInt(target)] == 1) {
                      if (self.indistpath_nodes[round][parseInt(target)] == 1 && self.indistselected_nodes[round][parseInt(target)] != 1) {
                        self.removeInBlockDist(round+1, parseInt(target), self.selected_block);
                        self.addInBlockDist(round+1, parseInt(target), self.selected_block);
                      }
                    }
                  }
                }*/
              }

              self.updateProcLinks(-1, -1);
              self.updateProcNodes();
            } else if (index == 2) { // Incoming Block Dist. All
              self.graphG.selectAll(".noderects").remove();
              self.graphG.selectAll(".nodetexts").remove();

              for (var rd = 2; rd <= self.num_rounds; rd ++) {
                if (self.indistselected_nodes[rd-1][name] != 1) {
                  self.addInBlockDist(rd, name, self.selected_blocks);
                  self.indistselected_nodes[rd-1][name] = 1;
                }
              }

              self.updateProcLinks(-1, -1);
              self.updateProcNodes(); 
            } else { // Sources/Targets or Focused Sources/Targets
              self.graphG.selectAll(".noderects").remove();
              self.graphG.selectAll(".nodetexts").remove();

              // for (var i = 0; i < self.max_round; i ++) {
              for (var i = 0; i < self.rounds.length; i ++) {
                var idx = self.rounds[i]-1;

                self.selected_nodes[idx] = {};
                self.selected_nodes[idx][name] = 1;
              }

              if (index == 3) { // Sources/Targets
                self.focused_round = self.focused_name = -1;
                self.updateProcLinks(-1, -1);
                self.updateProcNodes();
              } else { // Focused Sources/Targets
                self.focused_round = round; self.focused_name = name;
                self.updateProcLinks(round, name);
                self.updateProcNodes(); 
              }

              //for (var i = 0; i < self.max_round; i ++) {
              for (var i = 0; i < self.rounds.length; i ++) {
                var idx = self.rounds[i]-1;
                self.selected_nodes[idx] = {};
              }
            }

            if (self.isNoneNodesHighlighted()) self.recoveryProcNodesLinks();
          });

        // Other interactions
        d3.select('body')
          .on('click', function() {
            d3.select('.context-menu').remove();
          });
      }
        
      menu.items = function(e) {
        if (!arguments.length) return items;
        for (var i in arguments) items.push(arguments[i]);
        rescale = true;
        return menu;
      }

      // Automatically set width, height, and margin;
      function scaleItems() {
        if (rescale) {
          d3.select('svg').selectAll('tmp')
            .data(items).enter()
            .append('text')
            .text(function(d){ return d; })
            .style(style.text)
            .attr('x', -1000)
            .attr('y', -1000)
            .attr('class', 'tmp');
          
          var z = d3.selectAll('.tmp')[0]
                    .map(function(x){ return x.getBBox(); });
          width = d3.max(z.map(function(x){ return x.width; }));
          margin = margin * width;
          width =  width + 2 * margin;
          height = d3.max(z.map(function(x){ return x.height + margin / 2; }));
                
          // cleanup
          d3.selectAll('.tmp').remove();
          rescale = false;
        }
      }

      return menu;
    },

    // functions for tooltips
    showTooltip(content, event) {
      var self = this

      $("#" + self.tooltipId).html(content);
      $("#" + self.tooltipId).show();
      self.updatePosition(event);
    },
    hideTooltip() {
      var self = this
      $("#" + self.tooltipId).hide();
    },
    showDetails(data) {
      var self = this

      var content = "";
      content = "<span class=\"name\">Round: </span><span class=\"address\">" + data.round + "</span><br/>";
      content += "<span class=\"name\">Proc ID: </span><span class=\"address\">" + data.name + "</span><br/>";
      content += "<span class=\"name\">NBlocks: </span><span class=\"address\">" + data.count + "</span><br/>";
      //content += "<span class=\"name\">NLocalBlocks: </span><span class=\"address\">" + data.localCount + "</span><br/>";
      content += "<span class=\"name\">Workload: </span><span class=\"address\">" + data.workload + "</span><br/>";
      //content += "<span class=\"name\">Est_Workload: </span><span class=\"address\">" + data.estWorkload + "</span><br/>";
      //content += "<span class=\"name\">Workload_Diff: </span><span class=\"address\">" + (data.workload - data.estWorkload) + "</span><br/>";
      content += "<span class=\"name\">N_Pts: </span><span class=\"address\">" + data.npts + "</span><br/>";
      content += "<span class=\"name\">N_Finished_Pts: </span><span class=\"address\">" + data.nfdpts + "</span><br/>";
      content += "<span class=\"name\">Workload_Per_Pt: </span><span class=\"address\">" + (data.workload / data.nfdpts).toFixed(3) + "</span><br/>";

      //console.log("context:", content);
      self.showTooltip(content, d3.event);
    },
    hideDetails() {
      var self = this
      self.hideTooltip();
    },
    updatePosition(event) {
      var self = this

      var ttid = "#" + self.tooltipId;
      var xOffset = 10;
      var yOffset = 10;
      var ttw = $(ttid).width();
      var tth = $(ttid).height();
      var wscrY = $(window).scrollTop();
      var wscrX = $(window).scrollLeft();
      var curX = (document.all) ? event.clientX + wscrX : event.pageX;
      var curY = (document.all) ? event.clientY + wscrY : event.pageY;
      var ttleft = ((curX - wscrX + xOffset * 2 + ttw) > $(window).width()) ? curX - ttw - xOffset * 2 : curX + xOffset;
      if (ttleft < wscrX + xOffset) {
        ttleft = wscrX + xOffset;
      }
      var tttop = ((curY - wscrY + yOffset * 2 + tth) > $(window).height()) ? curY - tth - yOffset * 2 : curY + yOffset;
      if (tttop < wscrY + yOffset) {
        tttop = curY + yOffset;
      }
      $(ttid).css('top', tttop + 'px').css('left', ttleft + 'px');
    },

    bid2coords(bid)
    {
      var coords = [];

      var dx = 8, dy = 8, dz = 8;
      var dxdy = dx*dy;
      coords[2] = parseInt(bid / dxdy);
      coords[1] = parseInt((bid - coords[2]*dxdy) / dx);
      coords[0] = bid - coords[1]*dx - coords[2]*dxdy;

      return coords;
    }
  }
}

</script>
<style lang="less">
@import "../style/style.css";
@import "../style/d3.slider.css";

</style>