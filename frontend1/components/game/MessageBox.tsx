'use client';

import { animated, useSpring } from '@react-spring/web';
import { useCallback, useEffect, useState } from 'react';

// Components
import Message from './Message/Message';

// Store
import { useGameStore } from '@/store/gameStore';

// Constants
import { ENTER_KEY, ESCAPE_KEY, SPACE_KEY, E_KEY } from '@/lib/gameConstants';

interface MessageBoxProps {
    showNext?: boolean;
    dialogWindowClassname?: string | null;
    dialogTitleClassname?: string | null;
    dialogFooterClassname?: string | null;
    show?: boolean;
}

function MessageBox({
    showNext = false,
    dialogWindowClassname = '',
    dialogTitleClassname = '',
    dialogFooterClassname = '',
    show = false,
}: MessageBoxProps) {
    // Selectors from gameStore
    const gameZoom = useGameStore(s => s.gameZoom);
    const gameHeight = useGameStore(s => s.gameHeight);
    const dialogAction = useGameStore(s => s.dialogAction);
    const dialogMessages = useGameStore(s => s.dialogMessages);
    const characterName = useGameStore(s => s.dialogCharacterName);

    const [dialogState, setDialogState] = useState({
        currentMessage: 0,
        messageEnded: false,
        forceShowFullMessage: false,
        shouldShowMessage: false,
    });

    const { currentMessage, messageEnded, forceShowFullMessage, shouldShowMessage } = dialogState;
    const dialogDone = currentMessage === dialogMessages.length - 1 && messageEnded;

    const springOnRestCallback = useCallback(({ finished }: { finished?: boolean }) => {
        setDialogState(prev => ({ ...prev, shouldShowMessage: !!(finished && show) }));
    }, [show]);

    const animatedStyles = useSpring({
        config: { duration: 250 },
        from: { transform: `translate(-50%, ${gameHeight * gameZoom}px)` },
        to: { transform: show ? 'translate(-50%, 0%)' : `translate(-50%, ${gameHeight * gameZoom}px)` },
        onRest: springOnRestCallback,
    });

    // Resetting state is now handled by the 'key' prop in the parent component
    // which triggers a full re-mount when show changes.

    const handleClick = useCallback(() => {
        if (!shouldShowMessage) {
            return;
        }

        if (messageEnded) {
            if (currentMessage < dialogMessages.length - 1) {
                setDialogState(prev => ({
                    ...prev,
                    messageEnded: false,
                    forceShowFullMessage: false,
                    currentMessage: prev.currentMessage + 1
                }));
            } else {
                setDialogState(prev => ({
                    ...prev,
                    messageEnded: false,
                    forceShowFullMessage: false,
                    currentMessage: 0
                }));
                dialogAction?.();
            }
        } else {
            setDialogState(prev => ({
                ...prev,
                messageEnded: true,
                forceShowFullMessage: true
            }));
        }
    }, [shouldShowMessage, messageEnded, currentMessage, dialogMessages.length, dialogAction]);

    useEffect(() => {
        const handleKeyPressed = (e: KeyboardEvent) => {
            const codes = [ENTER_KEY, SPACE_KEY, ESCAPE_KEY, E_KEY];
            const keys = ['Enter', ' ', 'Escape', 'e', 'E'];
            
            if (codes.includes(e.code) || keys.includes(e.key)) {
                handleClick();
            }
        };
        window.addEventListener('keydown', handleKeyPressed);

        return () => window.removeEventListener('keydown', handleKeyPressed);
    }, [handleClick]);

    if (!show && !shouldShowMessage) return null;

    return (
        <animated.div className={dialogWindowClassname || ''} style={animatedStyles}>
            {characterName && (
                <div className={dialogTitleClassname || ''}>
                    {characterName}
                </div>
            )}
            {shouldShowMessage && dialogMessages[currentMessage] && (
                <Message
                    message={dialogMessages[currentMessage]}
                    key={currentMessage}
                    forceShowFullMessage={forceShowFullMessage}
                    onMessageEnded={() => {
                        setDialogState(prev => ({ ...prev, messageEnded: true }));
                    }}
                />
            )}
            {showNext && (
                <div
                    onClick={handleClick}
                    className={dialogFooterClassname || ''}
                    style={{ cursor: 'pointer' }}
                >
                    {dialogDone ? 'OK' : 'NEXT'}
                </div>
            )}
        </animated.div>
    );
}

export default MessageBox;
