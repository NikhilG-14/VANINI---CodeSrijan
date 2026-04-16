'use client';

import { useMemo, useRef, useEffect } from 'react';
import useResizeObserver from 'beautiful-react-hooks/useResizeObserver';

// Store
import { useGameStore } from '@/store/gameStore';

// Components
import DialogBox from './DialogBox/DialogBox';
import GameMenu from './GameMenu/GameMenu';
import GameText from './GameText/GameText';

function ReactWrapper() {
    const canvas = useGameStore(s => s.gameCanvasElement);
    const dialogMessages = useGameStore(s => s.dialogMessages);
    const menuItems = useGameStore(s => s.menuItems);
    const gameTexts = useGameStore(s => s.texts);
    
    // We use a ref for the resize observer
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        canvasRef.current = canvas;
    }, [canvas]);
    
    const DOMRect = useResizeObserver(canvasRef as React.RefObject<HTMLCanvasElement>);

    const inlineStyles = useMemo(() => {
        if (!canvas) return { position: 'absolute' as const, overflow: 'hidden' as const };
        
        return {
            position: 'absolute' as const,
            overflow: 'hidden' as const,
            width: canvas.style.width,
            height: canvas.style.height,
            marginLeft: canvas.style.marginLeft,
            marginTop: canvas.style.marginTop,
            left: canvas.offsetLeft,
            top: canvas.offsetTop,
        };
    }, [canvas]);

    return (
        <div
            id="react-content"
            style={inlineStyles}
        >
            <DialogBox 
                show={dialogMessages.length > 0} 
                key={dialogMessages.length > 0 ? 'open' : 'closed'} 
            />
            {menuItems.length > 0 && (
                <GameMenu />
            )}
            {gameTexts.length > 0 && gameTexts.map((text) => {
                const { key, value, config } = text;

                return (
                    <GameText
                        key={key || value}
                        text={value}
                        config={config}
                    />
                );
            })}
        </div>
    );
}

export default ReactWrapper;
