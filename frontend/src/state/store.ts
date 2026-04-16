import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';
import behaviorReducer from './behaviorSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    behavior: behaviorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
