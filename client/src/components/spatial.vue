<template>
  <div>
 
  </div>
</template>
<script>
import BootstrapVue from 'bootstrap-vue'
import { mapActions, mapGetters } from 'vuex'
import $ from 'jquery'
import d3 from 'd3'
var THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
export default {
  components: { },
  data() {
    return {
      list: []
    }
  },
  mounted() {
    this.init();
  },
  computed: {
      ...mapGetters({
        graphData: 'getGraphData',
        showBlockLines: 'getRoundProcBlock'
      }),
  },
  watch: {
    graphData: function(data) {
      //if (!Detector.webgl) Detector.addGetWebGLMessage();

      console.time("timer");
      this.initialize();
      console.timeEnd("timer");
      this.animate();
    },

    showBlockLines: function (data) {
      console.log("receive round proc block", data)

      if (data[0] == this.round && data[1] == this.proc && data[2] == this.blockid) {
        this.resetRendering()
        this.drawLineBox(this.blockid)
      } else {
        this.round = data[0]
        this.proc = data[1]
        this.blockid = data[2]
        this.renderLinesInBlock()
      }
    }
  },

  methods: {
    init() {
      var self = this
      self.round = -1;
      self.proc = -1;
      self.blockid = -1;

      self.domain_sizes = [512, 512, 512]
      self.blocklet_sizes = [64, 64, 64]
      self.cellsizes = [8, 8, 8]

      self.renderer = new THREE.WebGLRenderer();
      self.renderer.setPixelRatio(window.devicePixelRatio);
      //self.renderer.setClearColor(0xffffff, 1);
      self.renderer = new THREE.WebGLRenderer();
      self.renderer.setSize(self.$el.offsetWidth, self.$el.offsetHeight);
      self.$el.appendChild(self.renderer.domElement);
      //$("#spatial-container").appendChild(self.renderer.domElement);

      self.scene = new THREE.Scene();
      //this.scene.background = new THREE.Color(0xffffff)

      self.camera = new THREE.PerspectiveCamera(40, self.$el.offsetWidth / self.$el.offsetHeight, 1, 1000)

      self.camera.position.set(-40, 0, 60);
      self.camera.lookAt(0, 0, 0)

      self.controls = new OrbitControls(self.camera, self.renderer.domElement);
      self.controls.minDistance = 10;
      self.controls.maxDistance = 500;
    },

    initialize() {
      var self = this
  
      self.drawDomainBox();

      self.$el.addEventListener('resize', self.onWindowResize, false);
      self.onWindowResize();
    },

    renderLinesInBlock()
    {
      var self = this;
      
      var data_header = [], data_output = []
      var dir = "static/resource/fieldlines/" + (self.round) + "/" + self.proc + "/" + self.blockid;
      //var dir = "static/resource/fieldlines/1/1/0";
      d3.csv(dir + "_header.csv", function (error, header) {
        if (error) {
          alert("empty block!!");
          self.resetRendering()
          self.drawLineBox(self.blockid)
          throw error;
        }

        header.forEach(function (d, i) {
          data_header.push({
            "count": +d.count
          });
        });

    //console.log(data_header)

        d3.csv(dir + "_output.csv", function (error, output) {
          if (error) {
            alert("empty block!!");
            self.resetRendering()
            self.drawLineBox(self.blockid)
            throw error;
          }

          output.forEach(function (d, i) {
            data_output.push({
              "x": parseFloat(d.x),
              "y": parseFloat(d.y),
              "z": parseFloat(d.z)
            })
          });
    //console.log(data_output)
        self.resetRendering()
        self.drawLineBox(self.blockid)

          var n = 0
          data_header.forEach(function(d, i) {
            var points = []
            var colors = new Float32Array(d.count*3)
            var co = 0
            for (var k = n; k < n+d.count; k ++) {
              var x = (data_output[k].x - 256)/512. * 20
              var y = (data_output[k].y - 256)/512. * 20
              var z = (data_output[k].z - 256)/512. * 20
              points.push(new THREE.Vector3(x, y, z))
//console.log(x, y, z)
              //colors[co] = new THREE.Color(1.0 - 1.0 * co / d.count, 1.0 * co / d.count, 0.8)
              colors[co*3] = 1.0 - 1.0 * co / d.count
              colors[co*3+1] = 1.0 * co / d.count
              colors[co*3+2] = 0.8
              co ++
            }

            var geometry = new THREE.BufferGeometry().setFromPoints(points)
            geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3 ));

            var lineMaterial = new THREE.LineBasicMaterial({ 
                transparent: true, 
                opacity: 1.0, 
                linewidth: 2,
                vertexColors: THREE.VertexColors })
            //lineMaterial.color.setRGB(1.0, 1.0, 0.0)
            
            var line = new THREE.Line(geometry, lineMaterial);
            //line.computeLineDistances();
            //line.visible = true
            //line.scale.set(1, 1, 1);
            self.scene.add(line)

            n += d.count
          })
        })
      });
    },

    onWindowResize() {
      var self = this

      self.camera.aspect = self.$el.offsetWidth / self.$el.offsetHeight
      self.camera.updateProjectionMatrix();
      self.renderer.setSize(self.$el.offsetWidth, self.$el.offsetHeight);
    },

    animate() {
      var self = this

      requestAnimationFrame(self.animate);
      //stats.update();

      self.renderer.setClearColor(0xffffff, 1);
      self.renderer.setViewport(0, 0, self.$el.offsetWidth, self.$el.offsetHeight);
      // renderer will set this eventually
      //self.matLine.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
      //self.boxMatLine.resolution.set(window.innerWidth, window.innerHeight);
      self.renderer.render(self.scene, self.camera);
    },

    drawCube(starts, ends) 
    {
      var self = this

      var geometryList = [];
      var geometry0 = new THREE.BufferGeometry(),
        geometry1 = new THREE.BufferGeometry(),
        geometry2 = new THREE.BufferGeometry(),
        geometry3 = new THREE.BufferGeometry();
      var boxPositions0 = [],
        boxPositions1 = [],
        boxPositions2 = [],
        boxPositions3 = [];

      boxPositions0.push(
        new THREE.Vector3(starts[0], starts[1], starts[2]),
        new THREE.Vector3(starts[0], ends[1], starts[2]),
        new THREE.Vector3(ends[0], ends[1], starts[2]),
        new THREE.Vector3(ends[0], starts[1], starts[2]),
        new THREE.Vector3(starts[0], starts[1], starts[2]),
        new THREE.Vector3(starts[0], starts[1], ends[2]),
        new THREE.Vector3(starts[0], ends[1], ends[2]),
        new THREE.Vector3(ends[0], ends[1], ends[2]),
        new THREE.Vector3(ends[0], starts[1], ends[2]),
        new THREE.Vector3(starts[0], starts[1], ends[2])
      );
      boxPositions1.push(
        new THREE.Vector3(starts[0], ends[1], starts[2]),
        new THREE.Vector3(starts[0], ends[1], ends[2])
      );
      boxPositions2.push(
        new THREE.Vector3(ends[0], ends[1], starts[2]),
        new THREE.Vector3(ends[0], ends[1], ends[2])
      );
      boxPositions3.push(
        new THREE.Vector3(ends[0], starts[1], starts[2]),
        new THREE.Vector3(ends[0], starts[1], ends[2])
      );

      geometry0.setFromPoints(boxPositions0);
      geometry1.setFromPoints(boxPositions1);
      geometry2.setFromPoints(boxPositions2);
      geometry3.setFromPoints(boxPositions3);

      geometryList.push(geometry0);
      geometryList.push(geometry1);
      geometryList.push(geometry2);
      geometryList.push(geometry3);

      for (var i = 0; i < geometryList.length; i ++) {
        var lineMaterial = new THREE.LineBasicMaterial({ transparent: false, opacity: 1.0, linewidth: 3 })
        lineMaterial.color.setRGB(0, 0, 0)
        
        var line = new THREE.Line(geometryList[i], lineMaterial);
        //line.computeLineDistances();
        //line.scale.set(1, 1, 1);
        self.scene.add(line)
      }
    },

    drawDomainBox() {
      var self = this

      var h = 20 * 0.5;
      var starts = [-h, -h, -h], ends = [h, h, h]

      self.drawCube(starts, ends)
    },

    drawLineBox(blockid)
    {
      var self = this

      var id = [0, 0, 0]
      var dx = self.cellsizes[0], dy = self.cellsizes[1], dz = self.cellsizes[2];
      var dxdy = dx*dy;
      id[2] = parseInt(blockid / dxdy);
      id[1] = parseInt((blockid - id[2]*dxdy) / dx);
      id[0] = blockid - id[1]*dx - id[2]*dxdy;

      var starts = [0, 0, 0], ends = [0, 0, 0]

      for (var i = 0; i < 3; i ++) {
        starts[i] = id[i] * self.blocklet_sizes[i];
        ends[i] = Math.min(starts[i]+self.blocklet_sizes[i], self.domain_sizes[i]-1);
      
        starts[i] = (starts[i]- 256)/512. * 20
        ends[i] = (ends[i]- 256)/512. * 20
      }
//console.log(starts, ends)
      self.drawCube(starts, ends)

    },

    resetRendering()
    {
      var self = this
      
      self.scene.remove.apply(self.scene, self.scene.children);
      self.drawDomainBox();
    },

    drawRandomLines()
    {
      var self = this
      
      for (var i = 0; i < 100; i ++) {
        var p1 = new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        var p2 = new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);

        var points = [p1, p2]
        
        var geometry = new THREE.BufferGeometry().setFromPoints(points)

        var lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 1.0, linewidth: 2 })
        lineMaterial.color.setRGB(1.0, 0.0, 0.0)
        
        var line = new THREE.Line(geometry, lineMaterial);
        //line.computeLineDistances();
        //line.visible = true
        //line.scale.set(1, 1, 1);
        self.scene.add(line)
      }
    }
  }
}

</script>
