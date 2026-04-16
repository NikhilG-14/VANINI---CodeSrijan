export const calculateGameSize = (
    width: number,
    height: number,
    tileWidth: number,
    tileHeight: number,
    widthThreshold = 0.5,
    heightThreshold = 0.5
) => {
    if (typeof window === 'undefined') return { zoom: 1, width, height };

    const widthScale = Math.floor(window.innerWidth / width);
    const heightScale = Math.floor(window.innerHeight / height);
    const zoom = Math.min(widthScale, heightScale) || 1;

    const newWidth = Math.floor(window.innerWidth / tileWidth) * tileWidth / zoom;
    const newHeight = Math.floor(window.innerHeight / tileHeight) * tileHeight / zoom;

    return {
        zoom,
        width: Math.min(newWidth, Math.floor((width * (1 + widthThreshold)) / tileWidth) * tileWidth),
        height: Math.min(newHeight, Math.floor((height * (1 + heightThreshold)) / tileHeight) * tileHeight),
    };
};
