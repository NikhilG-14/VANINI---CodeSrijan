import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../state/store';
import { WorldMap } from './WorldMap';
import { MovementHandler } from './MovementHandler';
import { exitZone } from '../../state/gameSlice';

// Temporary Mock Components referencing the names we know the user has
const FastReactionGame = ({ onClose }: { onClose: () => void }) => (
    <div className="p-8 bg-white text-black border rounded-lg flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">Anxiety Test: Fast Reaction</h2>
        <p>Record mouse telemetry here...</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>Exit Game</button>
    </div>
);

const TimedDecisionsGame = ({ onClose }: { onClose: () => void }) => (
    <div className="p-8 bg-white text-black border rounded-lg flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">Decision Paralysis Test</h2>
        <p>Measure time taken to choose paths...</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>Exit Game</button>
    </div>
);

export const GameManager = () => {
  const activeMiniGame = useSelector((state: RootState) => state.game.activeMiniGame);
  const dispatch = useDispatch();

  const handleCloseMiniGame = () => {
    dispatch(exitZone());
    // Also dispatch Redux metrics here if actual data was collected
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 overflow-hidden relative">
      <MovementHandler />
      
      <WorldMap />

      {/* Mini-Game Overlays */}
      {activeMiniGame && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          {activeMiniGame === 'FastReactionGame' && <FastReactionGame onClose={handleCloseMiniGame} />}
          {activeMiniGame === 'TimedDecisionsGame' && <TimedDecisionsGame onClose={handleCloseMiniGame} />}
        </div>
      )}
    </div>
  );
};
