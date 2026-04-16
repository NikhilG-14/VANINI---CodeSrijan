'use client';

import { useMemo } from 'react';

// Store
import { useGameStore } from '@/store/gameStore';

// Styles
import styles from './GameMenu.module.scss';

function GameMenu() {
    const menuItems = useGameStore(s => s.menuItems);

    const menuClassname = useMemo(() => {
        return `${styles.menuWrapper} ${styles.positionCenter}`;
    }, []);

    return (
        <div className={menuClassname}>
            <ul className={styles.menuItemsWrapper}>
                {menuItems.map((item, index) => {
                    const { label, onClick, selected } = item;

                    return (
                        <li
                            key={index}
                            className={`${styles.menuItem} ${selected ? styles.selectedMenuItem : ''}`}
                            onClick={onClick}
                        >
                            {label}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default GameMenu;
