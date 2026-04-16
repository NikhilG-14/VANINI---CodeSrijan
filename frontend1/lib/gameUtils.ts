import { 
    ENTER_KEY, 
    SPACE_KEY, 
    ARROW_LEFT_KEY, 
    ARROW_UP_KEY, 
    ARROW_RIGHT_KEY, 
    ARROW_DOWN_KEY,
    E_KEY
} from './gameConstants';

/**
 * Simulate a key event.
 * @param {String} code The code of the key to simulate
 * @param {String} type (optional) The type of event : down, up or press. The default is down
 */
export const simulateKeyEvent = (code: string, type: 'down' | 'up' | 'press' = 'down') => {
    const keysMap: Record<string, number> = {
        [ENTER_KEY]: 13,
        [SPACE_KEY]: 32,
        [ARROW_LEFT_KEY]: 37,
        [ARROW_UP_KEY]: 38,
        [ARROW_RIGHT_KEY]: 39,
        [ARROW_DOWN_KEY]: 40,
        [E_KEY]: 69,
    };

    const event = new KeyboardEvent(`key${type}`, {
        code,
        keyCode: keysMap[code],
        bubbles: true,
        cancelable: true,
    });

    document.dispatchEvent(event);
};

export const isDev = () => process.env.NODE_ENV !== 'production';
