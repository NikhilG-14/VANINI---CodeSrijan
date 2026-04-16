'use client';

// Styles
import styles from './GameText.module.scss';

interface GameTextProps {
    text: string;
    config?: {
        left?: string | number;
        top?: string | number;
        bottom?: string | number;
        right?: string | number;
        color?: string;
    };
}

function GameText({ text, config = {} }: GameTextProps) {
    const { left, top, bottom, right, color } = config;

    return (
        <div
            className={styles.gameText}
            style={{
                left: left || '50%',
                top: top || '50%',
                bottom,
                right,
                color: color || '#fff',
                transform: left || right ? 'none' : 'translate(-50%, -50%)',
            }}
        >
            {text}
        </div>
    );
}

export default GameText;
