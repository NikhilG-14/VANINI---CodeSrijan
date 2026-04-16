'use client';

import Phaser from 'phaser';
import { useCallback, useEffect, useState, useRef } from 'react';
import isMobile from 'is-mobile';

// Utils
import { calculateGameSize } from '@/lib/phaserUtils';
import { isDev } from '@/lib/gameUtils';

// Scenes
import BootScene from '@/game/scenes/BootScene';
import WorldScene from '@/game/scenes/WorldScene';

// Components
import VirtualGamepad from './VirtualGamepad/VirtualGamepad';
import ReactWrapper from './ReactWrapper';

// Store
import { useGameStore } from '@/store/gameStore';

// Constants
import {
    TILE_WIDTH,
    TILE_HEIGHT,
    MIN_GAME_WIDTH,
    GAME_CONTENT_ID,
    MIN_GAME_HEIGHT,
    RESIZE_THRESHOLD,
    RE_RESIZE_THRESHOLD,
} from '@/lib/gameConstants';

const IS_DEV = isDev();

function Game() {
    const [phaserGame, setPhaserGame] = useState<Phaser.Game | null>(null);
    const hasInitialized = useRef(false);

    const {
        setGameZoom,
        setGameWidth,
        setGameHeight,
        setGameCanvasElement,
    } = useGameStore();

    const updateGameGlobalState = useCallback((
        width: number,
        height: number,
        zoom: number
    ) => {
        setGameHeight(height);
        setGameWidth(width);
        setGameZoom(zoom);
    }, [setGameHeight, setGameWidth, setGameZoom]);

    // Create the game inside a useEffect to create it only once
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const { width, height, zoom } = calculateGameSize(
            MIN_GAME_WIDTH,
            MIN_GAME_HEIGHT,
            TILE_WIDTH,
            TILE_HEIGHT
        );

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            title: 'Vanini World',
            parent: GAME_CONTENT_ID,
            width,
            height,
            zoom,
            pixelArt: true,
            roundPixels: true,
            scale: {
                autoCenter: Phaser.Scale.CENTER_BOTH,
                mode: Phaser.Scale.NONE,
            },
            scene: [BootScene, WorldScene],
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: IS_DEV,
                },
            },
            backgroundColor: '#000000',
        };

        const game = new Phaser.Game(config);
        setPhaserGame(game);
        updateGameGlobalState(width, height, zoom);

        return () => {
            game.destroy(true);
            hasInitialized.current = false;
        };
    }, [updateGameGlobalState]);

    useEffect(() => {
        if (phaserGame?.canvas) {
            setGameCanvasElement(phaserGame.canvas);
        }
    }, [setGameCanvasElement, phaserGame?.canvas]);

    // Handle Resize
    useEffect(() => {
        if (!phaserGame) return;

        const handleResize = () => {
            const gameSize = calculateGameSize(
                MIN_GAME_WIDTH,
                MIN_GAME_HEIGHT,
                TILE_WIDTH,
                TILE_HEIGHT
            );

            phaserGame.scale.setZoom(gameSize.zoom);
            phaserGame.scale.resize(gameSize.width, gameSize.height);
            updateGameGlobalState(gameSize.width, gameSize.height, gameSize.zoom);
            
            // Sync to CSS
            phaserGame.canvas.style.setProperty('--game-zoom', gameSize.zoom.toString());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [phaserGame, updateGameGlobalState]);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <div
                id={GAME_CONTENT_ID}
                className="relative"
            >
                {/* Phaser canvas renders here */}
            </div>
            <ReactWrapper />
            {isMobile() && (
                <VirtualGamepad />
            )}
        </div>
    );
}

export default Game;
