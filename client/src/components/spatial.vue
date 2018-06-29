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

    }
  },

  methods: {
    
  }
}

</script>
