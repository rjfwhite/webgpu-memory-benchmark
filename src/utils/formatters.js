/**
 * Formats bytes into human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Checks if the current browser is iOS Safari
 * @returns {boolean} True if iOS Safari
 */
export function isIOSSafari() {
    const userAgent = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
}

/**
 * Creates a random texture data pattern
 * @param {number} width - Texture width
 * @param {number} height - Texture height
 * @returns {Uint8Array} Texture data
 */
export function createRandomTextureData(width, height) {
    const textureSize = width * height * 4;
    const data = new Uint8Array(textureSize);
    
    for (let i = 0; i < textureSize; i += 4) {
        const noise = Math.random();
        if (noise > 0.5) {
            data[i] = Math.floor(Math.random() * 256);     // R
            data[i + 1] = Math.floor(Math.random() * 256); // G
            data[i + 2] = Math.floor(Math.random() * 256); // B
        } else {
            const value = Math.random() > 0.5 ? 255 : 0;
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
        }
        data[i + 3] = 255; // A
    }
    
    return data;
}

/**
 * Creates random buffer data
 * @param {number} size - Buffer size in bytes
 * @returns {Uint8Array} Buffer data
 */
export function createRandomBufferData(size) {
    const alignedSize = Math.floor(size / 4) * 4;
    const data = new Uint8Array(alignedSize);
    
    // For small buffers, fill with random data
    if (alignedSize <= 1024 * 1024) {
        for (let i = 0; i < alignedSize; i += 4) {
            const value = Math.floor(Math.random() * 4294967295);
            data[i] = value & 0xFF;
            data[i + 1] = (value >> 8) & 0xFF;
            data[i + 2] = (value >> 16) & 0xFF;
            data[i + 3] = (value >> 24) & 0xFF;
        }
    } else {
        // For large buffers, fill first 1MB with random data, then repeat pattern
        const patternSize = 1024 * 1024;
        for (let i = 0; i < patternSize; i += 4) {
            const value = Math.floor(Math.random() * 4294967295);
            data[i] = value & 0xFF;
            data[i + 1] = (value >> 8) & 0xFF;
            data[i + 2] = (value >> 16) & 0xFF;
            data[i + 3] = (value >> 24) & 0xFF;
        }
        
        // Repeat the pattern for the rest of the buffer
        for (let i = patternSize; i < alignedSize; i += patternSize) {
            const copySize = Math.min(patternSize, alignedSize - i);
            data.set(data.subarray(0, copySize), i);
        }
    }
    
    return data;
} 