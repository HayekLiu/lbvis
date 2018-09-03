<template>
  <div id='rankContainer' ref="rankContainer">
    <div id="rank-control">
      <div id="rank-control-top">
        <span id="rankDiv">
            &nbsp&nbsp&nbsp&nbspRank by:&nbsp
            <input name="rankRadios" id="procWlScale" type="radio" checked>&nbspProc. Workload&nbsp&nbsp&nbsp
            <input name="rankRadios" id="blockCntScale" type="radio">&nbspBlock Count&nbsp&nbsp&nbsp
            <input name="rankRadios" id="AvgBlkWlScale" type="radio">&nbspAverage Block Workload
        </span>
        <br>
        <span id="optionDiv">
            &nbsp&nbsp&nbsp&nbspOptions:&nbsp
            <input name="boxAlign" id="boxAlignCheck" type="checkbox">&nbspAlign Blocks&nbsp&nbsp&nbsp
            <input name="reset" id="resetButton" type="button" value="Clear">
        </span>
      </div>
      <div id="rank-control-bottom">
      </div>
    </div>
    <div id="rank-bar">
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
        graphData: 'getGraphData',
      }),
  },
  watch: {
    graphData: function(data) {
      var self = this;
      this.drawPanel(data['balances']) // TODO
    }
  },

  methods: {
    ...mapActions(['setSelectRankingBy', 'setSelectAlignBlocks', 'setResetGraphView']),

    init() {
      var self = this;

      self.isAlignBlocks = false;
    },

    drawPanel(data)
    {
      var self = this;

      $("#procWlScale").click(function(evt) {
        console.log("#procWlScale");        
        self.setSelectRankingBy(2)
      });

      $("#blockCntScale").click(function(evt) {        
        self.setSelectRankingBy(1)
      });

      $("#AvgBlkWlScale").click(function(evt) {        
        self.setSelectRankingBy(0)
      });

      $("#boxAlignCheck").click(function(evt) {
        self.isAlignBlocks = !self.isAlignBlocks;
        self.setSelectAlignBlocks(self.isAlignBlocks);
      });

      $("#resetButton").on('click',function (evt) {
        self.setResetGraphView(Math.random());
      });
    }
  }
}

</script>
