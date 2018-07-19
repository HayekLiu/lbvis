import * as types from './types';

export default {
  setGraphData({ commit, state }, graphData) {
    commit(types.GRAPH_DATA, graphData)
  },
  setSelectRound({ commit, state }, selectRound) {
    console.log(selectRound)
    commit(types.SELECT_ROUND, selectRound)
  },
  setSelectRoundIndex({ commit, state }, selectRoundIndex) {
    console.log(selectRoundIndex)
    commit(types.SELECT_ROUND_INDEX, selectRoundIndex)
  },

}
	