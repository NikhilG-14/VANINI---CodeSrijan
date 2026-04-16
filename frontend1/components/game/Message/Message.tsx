'use client';

import { useMemo } from 'react';
import { animated, useTransition } from '@react-spring/web';

// Styles
import styles from './Message.module.scss';

interface MessageProps {
    message?: string;
    trail?: number;
    onMessageEnded?: () => void;
    forceShowFullMessage?: boolean;
}

function Message({
    message = '',
    trail = 35,
    onMessageEnded = () => {},
    forceShowFullMessage = false,
}) {
    const items = useMemo(
        () => [...message.trim()].map((letter, index) => ({
            item: letter,
            key: index,
        })),
        [message]
    );

    const transitions = useTransition(items, {
        trail,
        from: { display: 'none' },
        enter: { display: '' },
        onRest: (_status: any, _controller: any, item: any) => {
            if (item.key === items.length - 1) {
                onMessageEnded();
            }
        },
    });

    return (
        <div className={styles.dialogMessage}>
            {forceShowFullMessage && (
                <span>{message}</span>
            )}

            {!forceShowFullMessage && transitions((animatedStyles, { item, key }) => (
                <animated.span key={key} style={animatedStyles}>
                    {item}
                </animated.span>
            ))}
        </div>
    );
}

export default Message;
