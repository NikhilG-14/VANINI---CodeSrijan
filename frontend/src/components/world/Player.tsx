import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';

const TILE_SIZE = 32;

export const Player = () => {
  const pos = useSelector((state: RootState) => state.game.pos);
  const direction = useSelector((state: RootState) => state.game.direction);
  const moving = useSelector((state: RootState) => state.game.moving);

  return (
    <div
      style={{
        position: 'absolute',
        top: pos.y * TILE_SIZE,
        left: pos.x * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
        backgroundColor: 'red', // Temporary placeholder for sprite
        transition: 'top 0.2s linear, left 0.2s linear', // smooth grid movement
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px'
      }}
    >
      {moving ? '🚶' : '🧍'}
    </div>
  );
};
