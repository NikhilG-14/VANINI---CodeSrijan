'use client';

import { useCallback, useEffect, useRef } from 'react';

// Utils
import { simulateKeyEvent } from '@/lib/gameUtils';

// Constants
import {
    ENTER_KEY,
    SPACE_KEY,
    ARROW_UP_KEY,
    ARROW_DOWN_KEY,
    ARROW_LEFT_KEY,
    ARROW_RIGHT_KEY,
    E_KEY,
} from '@/lib/gameConstants';

// Styles
import styles from './VirtualGamepad.module.scss';

function VirtualGamepad() {
    const handleAction = useCallback((code: string, type: 'down' | 'up') => {
        simulateKeyEvent(code, type);
    }, []);

    // Helper for dpad interactions
    const DPadButton = ({ code, className }: { code: string, className: string }) => (
        <img
            className={`${styles.button} ${className}`}
            src="/assets/images/d_pad_button.png"
            onPointerDown={() => handleAction(code, 'down')}
            onPointerUp={() => handleAction(code, 'up')}
            onPointerLeave={() => handleAction(code, 'up')}
            alt={code}
        />
    );

    return (
        <div className={styles.buttonsWrapper}>
            <div className={styles.dPadWrapper}>
                <DPadButton code={ARROW_LEFT_KEY} className={styles.dPadLeft} />
                <DPadButton code={ARROW_UP_KEY} className={styles.dPadUp} />
                <DPadButton code={ARROW_RIGHT_KEY} className={styles.dPadRight} />
                <DPadButton code={ARROW_DOWN_KEY} className={styles.dPadDown} />
            </div>

            <div className={styles.actionButtonsWrapper}>
                <img
                    className={`${styles.button} ${styles.aButton}`}
                    src="/assets/images/a_button.png"
                    onPointerDown={() => handleAction(E_KEY, 'down')}
                    onPointerUp={() => handleAction(E_KEY, 'up')}
                    alt="Interact"
                />
                <img
                    className={`${styles.button} ${styles.bButton}`}
                    src="/assets/images/b_button.png"
                    onPointerDown={() => handleAction(SPACE_KEY, 'down')}
                    onPointerUp={() => handleAction(SPACE_KEY, 'up')}
                    alt="Jump/Special"
                />
            </div>
        </div>
    );
}

export default VirtualGamepad;
