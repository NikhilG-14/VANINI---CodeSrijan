import React from 'react';
import { Player } from './Player';

const TILE_SIZE = 32;

// Re-using the mock definition from MovementHandler
const mockCityMap = {
  width: 20,
  height: 20,
  walls: [
    { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 }
  ],
  zones: [
    { x: 10, y: 10, type: 'FastReactionGame' }, 
    { x: 2, y: 8, type: 'TimedDecisionsGame' }
  ]
};

export const WorldMap = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: mockCityMap.width * TILE_SIZE,
        height: mockCityMap.height * TILE_SIZE,
        backgroundColor: '#e0e0e0',
        border: '2px solid black',
        overflow: 'hidden'
      }}
    >
      {/* Render Walls */}
      {mockCityMap.walls.map((wall, idx) => (
        <div
          key={`wall-${idx}`}
          style={{
            position: 'absolute',
            top: wall.y * TILE_SIZE,
            left: wall.x * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            backgroundColor: '#444' // solid wall
          }}
        />
      ))}

      {/* Render Zones (Interactive Tiles) */}
      {mockCityMap.zones.map((zone, idx) => (
        <div
          key={`zone-${idx}`}
          style={{
            position: 'absolute',
            top: zone.y * TILE_SIZE,
            left: zone.x * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            backgroundColor: 'rgba(0, 0, 255, 0.3)', // blue tint for interactive zones
            border: '1px dashed blue'
          }}
        />
      ))}

      {/* Render the Player */}
      <Player />
    </div>
  );
};
