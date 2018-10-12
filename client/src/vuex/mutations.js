import * as types from './types';
export default {
  [types.GRAPH_DATA] (state, graphData) {
    state.graphData = graphData
  },
  [types.SELECT_ROUND] (state, selectRound) {
    state.selectRound = selectRound
  },
  [types.FILTER_ROUND_INDEX] (state, filterRoundIndex) {
    state.filterRoundIndex = filterRoundIndex
  },
  [types.SELECT_RANKING_BY] (state, selectRankingBy) {
    state.selectRankingBy = selectRankingBy
  },
  [types.SELECT_ALIGN_BLOCKS] (state, selectAlignBlocks) {
    state.selectAlignBlocks = selectAlignBlocks
  },
  [types.RESET_GRAPH_VIEW] (state, resetGraphView) {
    state.resetGraphView = resetGraphView
  },
  [types.ROUND_PROC_BLOCK] (state, roundProcBlock) {
    state.roundProcBlock = roundProcBlock
  },
}
