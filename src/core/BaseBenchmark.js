import { formatBytes, isIOSSafari } from '../utils/formatters.js';

/**
 * Base class for benchmark implementations
 * Contains common functionality shared between WebGPU and WebGL2 benchmarks
 */
export class BaseBenchmark {
    constructor(apiName) {
        this.apiName = apiName;
        this.buffers = [];
        this.textures = [];
        this.allocatedMemory = 0;
        this.isRunning = false;
        this.startTime = null;
        this.lastAllocationTime = null;
        
        // Rendering properties
        this.canvas = null;
        this.context = null;
        this.currentTextureIndex = 0;
        this.renderInterval = null;
        
        // UI elements (shared across implementations)
        this.statusElement = document.getElementById('api-status');
        this.startButton = document.getElementById('start-test');
        this.stressButton = document.getElementById('stress-test');
        this.clearButton = document.getElementById('clear-memory');
        this.clearLogButton = document.getElementById('clear-log');
        this.logElement = document.getElementById('log');
        this.renderTitleElement = document.getElementById('render-title');
        
        this.allocatedMemoryElement = document.getElementById('allocated-memory');
        this.bufferCountElement = document.getElementById('buffer-count');
        this.textureCountElement = document.getElementById('texture-count');
        this.allocationRateElement = document.getElementById('allocation-rate');

        // Get canvas for rendering
        this.canvas = document.getElementById('render-canvas');
    }

    /**
     * Format bytes into human-readable string
     */
    formatBytes(bytes) {
        return formatBytes(bytes);
    }

    /**
     * Check if running on iOS Safari
     */
    isIOSSafari() {
        return isIOSSafari();
    }

    /**
     * Log message to UI and console
     * @param {string} message - Message to log
     * @param {string} type - Message type (info, error, warning, success)
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] [${this.apiName}] ${message}`;
        logEntry.className = type;
        
        this.logElement.appendChild(logEntry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
        
        console.log(`[${this.apiName} Benchmark] ${message}`);
    }

    /**
     * Update metrics display
     */
    updateMetrics() {
        this.allocatedMemoryElement.textContent = this.formatBytes(this.allocatedMemory);
        this.bufferCountElement.textContent = this.buffers.length.toString();
        this.textureCountElement.textContent = this.textures.length.toString();
        
        if (this.lastAllocationTime && this.startTime) {
            const timeDiff = (Date.now() - this.startTime) / 1000;
            const rate = timeDiff > 0 ? (this.allocatedMemory / (1024 * 1024)) / timeDiff : 0;
            this.allocationRateElement.textContent = `${rate.toFixed(2)} MB/s`;
        }
    }

    /**
     * Stop the current test
     */
    stopTest() {
        this.isRunning = false;
        this.startButton.disabled = false;
        this.stressButton.disabled = false;
        
        this.stopTextureDisplay();
        
        const duration = (Date.now() - this.startTime) / 1000;
        this.log(`⏱️ Test completed in ${duration.toFixed(2)} seconds`, 'info');
        this.log(`📈 Final allocation: ${this.formatBytes(this.allocatedMemory)}`, 'info');
        this.log(`📊 Total buffers: ${this.buffers.length}, Total textures: ${this.textures.length}`, 'info');
        
        if (this.textures.length > 0) {
            this.log(`💡 Use "Clear Memory" to free allocated resources.`, 'info');
        }
    }

    /**
     * Stop texture display rendering
     */
    stopTextureDisplay() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }

    // Abstract methods to be implemented by subclasses
    async checkSupport() { 
        throw new Error('Must implement checkSupport'); 
    }
    
    async initialize() { 
        throw new Error('Must implement initialize'); 
    }
    
    async initializeRendering() { 
        throw new Error('Must implement initializeRendering'); 
    }
    
    async allocateBuffer(size) { 
        throw new Error('Must implement allocateBuffer'); 
    }
    
    async allocateTexture(width, height) { 
        throw new Error('Must implement allocateTexture'); 
    }
    
    clearMemory() { 
        throw new Error('Must implement clearMemory'); 
    }
    
    startTextureDisplay() { 
        throw new Error('Must implement startTextureDisplay'); 
    }
} 