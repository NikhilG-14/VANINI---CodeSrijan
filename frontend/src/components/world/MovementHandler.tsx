import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { moveUp, moveDown, moveLeft, moveRight, enterZone, setMoving } from '../../state/gameSlice';
import { RootState } from '../../state/store';

// Assuming tiles are 32px or grid based logic, 
// for pure logic we just work in integers (x,y map coordinates)
const MOVE_TICK_RATE = 200; // ms per tile movement

type GameMapData = {
  width: number;
  height: number;
  walls: { x: number, y: number }[];
  zones: { x: number, y: number, type: string }[];
}

// Temporary hardcoded map until Map JSON schema is fully built out
const mockCityMap: GameMapData = {
  width: 20,
  height: 20,
  walls: [
    { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 } // example wall
  ],
  zones: [
    { x: 10, y: 10, type: 'FastReactionGame' }, // Anxiety Zone
    { x: 2, y: 8, type: 'TimedDecisionsGame' }  // Decision Paralysis Zone
  ]
};

export const MovementHandler = () => {
  const dispatch = useDispatch();
  
  // Track keys
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
  });

  const pos = useSelector((state: RootState) => state.game.pos);
  const activeMiniGame = useSelector((state: RootState) => state.game.activeMiniGame);
  const direction = useSelector((state: RootState) => state.game.direction);
  
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  // Key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keys.hasOwnProperty(e.key)) {
        setKeys(prev => ({ ...prev, [e.key]: true }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.hasOwnProperty(e.key)) {
        setKeys(prev => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keys]);

  // Determine active direction intended by user
  const activeDir = keys.w || keys.ArrowUp ? 'up' :
                    keys.s || keys.ArrowDown ? 'down' :
                    keys.a || keys.ArrowLeft ? 'left' :
                    keys.d || keys.ArrowRight ? 'right' : null;

  useEffect(() => {
    dispatch(setMoving(!!activeDir));
  }, [activeDir, dispatch]);

  useEffect(() => {
    const move = (dir: 'up' | 'down' | 'left' | 'right') => {
      if (activeMiniGame) return; // Prevent movement when in minigame

      let targetX = pos.x;
      let targetY = pos.y;

      if (dir === 'up') targetY -= 1;
      if (dir === 'down') targetY += 1;
      if (dir === 'left') targetX -= 1;
      if (dir === 'right') targetX += 1;

      // 1. Boundary Check
      if (targetX < 0 || targetX >= mockCityMap.width || targetY < 0 || targetY >= mockCityMap.height) return;

      // 2. Wall Check
      const isWall = mockCityMap.walls.some(w => w.x === targetX && w.y === targetY);
      if (isWall) return;

      // 3. Zone Check
      const zone = mockCityMap.zones.find(z => z.x === targetX && z.y === targetY);
      if (zone) {
        dispatch(enterZone(zone.type));
         // Step into the zone so we aren't blockaded outside of it returning
         // optionally, we can prevent walking IN and just trigger overlay
      }

      // 4. Dispatch Step
      if (dir === 'up') dispatch(moveUp());
      if (dir === 'down') dispatch(moveDown());
      if (dir === 'left') dispatch(moveLeft());
      if (dir === 'right') dispatch(moveRight());
    };

    if (activeDir && !activeMiniGame) {
      if (!tickRef.current) {
        // move immediately
        move(activeDir);
        tickRef.current = setInterval(() => {
          move(activeDir);
        }, MOVE_TICK_RATE);
      }
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [activeDir, activeMiniGame, pos, dispatch]);

  return null; // pure logic component
};
