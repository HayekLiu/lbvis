import * as types from './types';

export default {
  setGraphData({ commit, state }, graphData) {
    commit(types.GRAPH_DATA, graphData)
  },
  setSelectRound({ commit, state }, selectRound) {
    console.log(selectRound)
    commit(types.SELECT_ROUND, selectRound)
  },
  setFilterRoundIndex({ commit, state }, filterRoundIndex) {
    console.log(filterRoundIndex)
    commit(types.FILTER_ROUND_INDEX, filterRoundIndex)
  },
  setSelectRankingBy({ commit, state }, selectRankingBy) {
    console.log(selectRankingBy)
    commit(types.SELECT_RANKING_BY, selectRankingBy)
  },
  setSelectAlignBlocks({ commit, state }, selectAlignBlocks) {
    console.log(selectAlignBlocks)
    commit(types.SELECT_ALIGN_BLOCKS, selectAlignBlocks)
  },
  setResetGraphView({ commit, state }, resetGraphView) {
    console.log(resetGraphView)
    commit(types.RESET_GRAPH_VIEW, resetGraphView)
  },
}