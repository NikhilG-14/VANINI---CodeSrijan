import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PosType = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  pos: PosType;
  direction: Direction;
  mapId: string;
  moving: boolean;
  activeMiniGame: string | null;
}

const initialState: GameState = {
  pos: { x: 5, y: 5 },
  direction: 'down',
  mapId: 'city_center',
  moving: false,
  activeMiniGame: null,
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    moveUp: (state) => {
      state.direction = 'up';
      state.pos.y -= 1;
    },
    moveDown: (state) => {
      state.direction = 'down';
      state.pos.y += 1;
    },
    moveLeft: (state) => {
      state.direction = 'left';
      state.pos.x -= 1;
    },
    moveRight: (state) => {
      state.direction = 'right';
      state.pos.x += 1;
    },
    setMoving: (state, action: PayloadAction<boolean>) => {
      state.moving = action.payload;
    },
    enterZone: (state, action: PayloadAction<string>) => {
      state.activeMiniGame = action.payload;
      state.moving = false; // Stop moving when entering a minigame
    },
    exitZone: (state) => {
      state.activeMiniGame = null;
    },
    setMap: (state, action: PayloadAction<string>) => {
      state.mapId = action.payload;
    }
  },
});

export const {
  moveUp,
  moveDown,
  moveLeft,
  moveRight,
  setMoving,
  enterZone,
  exitZone,
  setMap
} = gameSlice.actions;

export default gameSlice.reducer;
