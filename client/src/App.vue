<template>
  <div id="app">
    <nav class="navbar navbar-default" role="navigation">
      <div class="navbar-header">
        <a class="navbar-brand" href="#">LBVis: Interactively Visualizing the Dynamic Load Balancing in Parallel Particle Tracing</a>
      </div>
    </nav>
    <div id="content">
      <!-- <myRank id="rank-container"></myRank> -->
      <myOverall id="overview-container"></myOverall>
      <myGlyph id="glyph-container"></myGlyph>
      <myGraph id="load-balance-container"></myGraph>
      <mySimilar id="similarity-container"></mySimilar>
      <mySpatial id="spatial-container"></mySpatial>
    </div>
  </div>
</template>
<script>
import '../node_modules/bootstrap/dist/css/bootstrap.css'
import '../node_modules/bootstrap-vue/dist/bootstrap-vue.css'
import BootstrapVue from 'bootstrap-vue'
import myOverall from './components/overview.vue'
import myGraph from './components/graph.vue'
//import myRank from './components/rank.vue'
import myGlyph from './components/glyph.vue'
import mySimilar from './components/similarity.vue'
import mySpatial from './components/spatial.vue'
import $ from 'jquery'
import { mapActions, mapGetters } from 'vuex'
import axios from 'axios'
export default {
  name: 'app',
  components: { myOverall, myGlyph, myGraph, mySimilar, mySpatial },
  methods: {
    ...mapActions(['setGraphData', 'setSelectRound', 'setFilterRoundIndex', 'setSelectRankingBy', 'setSelectAlignBlocks', 'setResetGraphView']),
  },
  async created() {
    // axios.get("../static/resource/data32_2/block_transfer.csv").then(response => {  
          
    //       console.log(response) 
    // });

    var self = this

    sendTest()

        function sendTest () {
          var constraint = {}
          var formData = new URLSearchParams();
          constraint = JSON.stringify(constraint)      
          formData.append('constraint', constraint)
          sendUrl ('ws', formData, 'test')
        }

        function sendUrl (Url, formData, v_id){
          Url='http://127.0.0.1:22068/'+Url // 发送消息字符
          console.log('Request: ', Url)
          self.$api.post(Url,formData, d => { // 接收到返回值
            console.log('success: ', d)
            
          })
        }
        
    var max_round = 11, n_nodes = 32 

    //var min_workload, max_worload;
    var balances = [];
    var nodes = [], max_nodes = [], links = [], dists = [], transfers = []
    //var transfer_json = {}, dist_json = {};

    var dir = "static/resource/data"+n_nodes+"_2_new/"

  d3.csv(dir + "balance.csv", function (error, data_b) {
    if (error) throw error;

    data_b.forEach(function (d, i) {
      if (i < 45) 
      {
        balances.push({
          "time": +d.time, 
          "balance": +d.balance,
          "maxwl": +d.maxwl,
          "minwl": +d.minwl,
          "quartile1": +d.quartile1,
          "median": +d.median,
          "quartile2": +d.quartile2
        });
      }
    });

    d3.csv(dir + "block_dist.csv", function (error, data_d1) {
      if (error) throw error;

      data_d1.forEach(function (d, i) {
        if (+d.round <= max_round) {
          dists.push({
            "name": +d.name,
            "blockid": +d.blockid,
            "isLocal": +d.isLocal,
            "workload": +d.wl,
            "estWorkload": +d.estWl,
            "round": +d.round
          })
/*
          d = {
            "name": +d.name,
            "blockid": +d.blockid,
            "isLocal": +d.isLocal,
            "workload": +d.wl,
            "estWorkload": +d.estWl,
            "round": +d.round
          }

          if(!dist_json[d.round]) dist_json[d.round] = {}
          if(!dist_json[d.round][d.name]) dist_json[d.round][d.name] = []

          dist_json[d.round][d.name].push({
            "blockid": d.blockid,
            "isLocal": d.isLocal,
            "workload": d.workload,
            "estWorkload": d.estWorkload
          })
*/
        }
      });

      
      d3.csv(dir + "block_transfer.csv", function (error, data_t1) {
        if (error) throw error;

        data_t1.forEach(function (d, i) {
          if (+d.round < max_round) {
            transfers.push({
              "source": +d.source,
              "target": +d.target,
              "blockid": +d.blockid,
              "isLocal": +d.isLocal,
              //"count": +d.count,
              "round": +d.round
            })
/*
            // store by json structure
            d = {
              "source": +d.source,
              "target": +d.target,
              "blockid": +d.blockid,
              "isLocal": +d.isLocal,
              //"count": +d.count,
              "round": +d.round
            }
          
            if(!transfer_json[d.round]) transfer_json[d.round] = {}
            if(!transfer_json[d.round][d.source]) transfer_json[d.round][d.source] = {}

            if(!transfer_json[d.round][d.source][d.target]) transfer_json[d.round][d.source][d.target] = []

            //transfer_json[d.round][d.source][d.target].push(d.blockid)
            transfer_json[d.round][d.source][d.target].push({"blockid": d.blockid, "isLocal": d.isLocal})
*/
          }
        });

          d3.csv(dir + "nodes.csv", function (error, data2) {
            if (error) throw error;

            var node_json = {};
            data2.forEach(function (d, i) {
              if (+d.round <= max_round) {
                //count++;
                nodes.push({ 
                  "name": +d.name,
                  "count": +d.count,
                  "localCount": +d.localCount,
                  "workload": +d.workload,
                  "estWorkload": +d.estWorkload,
                  "npts": +d.npts,
                  "nfdpts": +d.nfdpts,
                  "round": +d.round 
                });

                if(!node_json[d.round]) node_json[+d.round] = []
                node_json[+d.round].push({
                   // "index": d.index,
                   "name": +d.name,
                   "count": +d.count,
                   "localCount": +d.localCount,
                   "workload": +d.workload,
                   "estWorkload": +d.estWorkload,
                   "npts": +d.npts,
                   "nfdpts": +d.nfdpts,
                   "round": +d.round 
                })
              }
            })

            for (var i = 0; i < max_round; i ++) {
              node_json[parseInt(i)+1].sort(function (a, b) {
                return b["workload"] - a["workload"];
              });

              max_nodes.push({"round": node_json[parseInt(i)+1][0].round, "name": node_json[parseInt(i)+1][0].name});
            }

            console.log(max_nodes)

            d3.csv(dir + "links.csv", function (error, data3) {
              if (error) throw error;

              var link_json = {}
              data3.forEach(function (d) {
                if (+d.round < max_round) {
                  links.push({
                    "source": +d.source,
                    "target": +d.target,
                    "value": +d.value,
                    "count": +d.count,
                    "round": +d.round
                  });
/*
                  d = {
                    "source": d.source,
                    "target": d.target,
                    "value": +d.value,
                    "count": +d.count,
                    //"count": +d.count,
                    "round": +d.round
                  }

                  if (!link_json[d.round]) link_json[d.round] = {}
                  if (!link_json[d.round][d.source]) link_json[d.round][d.source] = {}
                  if (!link_json[d.round][d.source][d.target]) link_json[d.round][d.source][d.target] = {"value": 0, "count": 0}

                  link_json[d.round][d.source][d.target].value += d.value
                  link_json[d.round][d.source][d.target].count += d.count
*/
                }
              });

              self.setGraphData({
                                 'balances': balances,
                                 'nodes': nodes, 
                                 'max_nodes': max_nodes,
                                 'links': links, 
                                 'dists': dists,
                                 'transfers': transfers
                               })

            });
          });
      });
    });
  });
  }
}

</script>
<style lang="less">

#app {
  position: absolute;
  height: 100%;
  width: 100%;
  ul, ol {
      padding-left: 5px;
  }
  .navbar{
    height: 2.5em;
    background: black;
    color: grey;
    a, .uk-link{
      color:grey;
      font-weight: bolder;
    }
  }
  #content {
    position: absolute;
    width: 100%;
    top: 2.5em; 
    height: calc(~"100% - 2.5em"); 
    border-left: 2px solid grey;
    border-right: 2px solid grey;
    border-bottom: 2px solid grey;
    #overview-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 75%;
      height: 15%;
      border: 1px solid grey;
    }
    #glyph-container {
      position: absolute;
      top: 15%;
      left: 0%;
      width: 5%;
      height: 85%;
      border: 0px solid grey;
    }
    #load-balance-container {
      position: absolute;
      top: 15%;
      left: 5%;
      width: 70%;
      height: 85%;
      border: 1px solid grey;
    }
    #similarity-container {
      position: absolute;
      top: 0;
      left: 75%;
      width: 25%;
      height: 50%;
      border: 1px solid grey;
    }
    #spatial-container {
      position: absolute;
      top: 50%;
      left: 75%;
      width: 25%;
      height: 50%;
      border: 1px solid grey;
    }
  }
}

</style>
