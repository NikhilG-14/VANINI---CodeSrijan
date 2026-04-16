import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RawMetrics {
  reaction_times: number[];
  error_rate: number;
  hesitation_time: number;
  engagement_level: number;
  decision_changes: number;
}

export interface EmotionScores {
  anxietyOffset: number;
  fatigueOffset: number;
  decisionParalysisOffset: number;
  depressionOffset: number;
  overthinkingOffset: number;
}

export interface BehaviorState {
  currentSessionId: string | null;
  rawMetrics: RawMetrics;
  emotionScores: EmotionScores;
}

const initialState: BehaviorState = {
  currentSessionId: null,
  rawMetrics: {
    reaction_times: [],
    error_rate: 0,
    hesitation_time: 0,
    engagement_level: 0,
    decision_changes: 0,
  },
  emotionScores: {
    anxietyOffset: 0,
    fatigueOffset: 0,
    decisionParalysisOffset: 0,
    depressionOffset: 0,
    overthinkingOffset: 0,
  }
};

export const behaviorSlice = createSlice({
  name: 'behavior',
  initialState,
  reducers: {
    addReactionTime: (state, action: PayloadAction<number>) => {
      state.rawMetrics.reaction_times.push(action.payload);
    },
    setErrorRate: (state, action: PayloadAction<number>) => {
      state.rawMetrics.error_rate = action.payload;
    },
    incrementDecisionChanges: (state) => {
      state.rawMetrics.decision_changes += 1;
    },
    resetMetrics: (state) => {
      state.rawMetrics = initialState.rawMetrics;
    },
    updateEmotionScores: (state, action: PayloadAction<Partial<EmotionScores>>) => {
      state.emotionScores = { ...state.emotionScores, ...action.payload };
    }
  },
});

export const {
  addReactionTime,
  setErrorRate,
  incrementDecisionChanges,
  resetMetrics,
  updateEmotionScores
} = behaviorSlice.actions;

export default behaviorSlice.reducer;
