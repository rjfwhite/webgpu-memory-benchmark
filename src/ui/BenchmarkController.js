import { WebGPUMemoryBenchmark } from '../benchmarks/WebGPUMemoryBenchmark.js';
import { WebGL2MemoryBenchmark } from '../benchmarks/WebGL2MemoryBenchmark.js';

/**
 * Unified benchmark controller
 * Manages UI interactions and test execution
 */
export class BenchmarkController {
    constructor() {
        this.currentApi = 'webgpu';
        this.benchmarks = {
            webgpu: new WebGPUMemoryBenchmark(),
            webgl2: new WebGL2MemoryBenchmark()
        };
        this.currentBenchmark = null;
        
        this.initializeUI();
        this.initializeCanvas();
        this.initializeAPI();
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        // API selection
        document.querySelectorAll('.api-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                const api = e.target.dataset.api;
                if (!e.target.classList.contains('disabled')) {
                    await this.switchAPI(api);
                }
            });
        });

        // Control buttons
        document.getElementById('start-test').addEventListener('click', () => this.startMemoryTest());
        document.getElementById('stress-test').addEventListener('click', () => this.startStressTest());
        document.getElementById('clear-memory').addEventListener('click', () => this.clearMemory());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
        
        // Window resize handler to maintain proper canvas sizing
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('render-canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                
                // Set internal resolution to match display size with device pixel ratio
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                
                // Ensure CSS size matches display
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        });
    }

    /**
     * Initialize canvas with proper sizing
     */
    initializeCanvas() {
        const canvas = document.getElementById('render-canvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Set internal resolution to match display size with device pixel ratio
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Ensure CSS size matches display
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            
            // Set canvas reference in benchmarks
            this.benchmarks.webgpu.canvas = canvas;
            this.benchmarks.webgl2.canvas = canvas;
        }
    }

    /**
     * Initialize API support checking
     */
    async initializeAPI() {
        // Check support for both APIs
        const webgpuSupported = await this.benchmarks.webgpu.checkSupport();
        const webgl2Supported = await this.benchmarks.webgl2.checkSupport();

        // Update UI based on support
        const webgpuOption = document.querySelector('[data-api="webgpu"]');
        const webgl2Option = document.querySelector('[data-api="webgl2"]');

        if (!webgpuSupported) {
            webgpuOption.classList.add('disabled');
            webgpuOption.textContent = '🚀 WebGPU (Not Supported)';
        }

        if (!webgl2Supported) {
            webgl2Option.classList.add('disabled');
            webgl2Option.textContent = '🎮 WebGL2 (Not Supported)';
        }

        // Set initial API
        if (webgpuSupported) {
            await this.switchAPI('webgpu');
        } else if (webgl2Supported) {
            await this.switchAPI('webgl2');
        } else {
            this.benchmarks.webgpu.statusElement.textContent = 'No supported graphics APIs found';
            this.benchmarks.webgpu.statusElement.className = 'status error';
        }
    }

    /**
     * Switch between WebGPU and WebGL2 APIs
     * @param {string} api - API name ('webgpu' or 'webgl2')
     */
    async switchAPI(api) {
        if (this.currentBenchmark && this.currentBenchmark.isRunning) {
            this.currentBenchmark.log('⚠️ Stopping current test to switch API', 'warning');
            this.currentBenchmark.stopTest();
        }

        // Clear any existing canvas context by recreating the canvas
        const oldCanvas = document.getElementById('render-canvas');
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'render-canvas';
        
        // Set canvas size to match its display size for proper resolution
        const canvasContainer = oldCanvas.parentNode;
        oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
        
        // Wait for the canvas to be in the DOM then set proper dimensions
        setTimeout(() => {
            const rect = newCanvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Set internal resolution to match display size with device pixel ratio
            newCanvas.width = rect.width * dpr;
            newCanvas.height = rect.height * dpr;
            
            // Ensure CSS size matches display
            newCanvas.style.width = rect.width + 'px';
            newCanvas.style.height = rect.height + 'px';
        }, 0);
        
        // Update canvas reference in benchmarks
        this.benchmarks.webgpu.canvas = newCanvas;
        this.benchmarks.webgl2.canvas = newCanvas;
        
        // Reset initialization flags
        this.benchmarks.webgpu.initialized = false;
        this.benchmarks.webgl2.initialized = false;

        this.currentApi = api;
        this.currentBenchmark = this.benchmarks[api];

        // Update UI
        document.querySelectorAll('.api-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-api="${api}"]`).classList.add('active');

        // Initialize the API if not already done
        const apiName = api === 'webgpu' ? 'WebGPU' : 'WebGL2';
        const isSupported = !document.querySelector(`[data-api="${api}"]`).classList.contains('disabled');
        
        if (isSupported) {
            this.currentBenchmark.statusElement.textContent = `Initializing ${apiName}...`;
            this.currentBenchmark.statusElement.className = 'status';
            
            const initSuccess = await this.currentBenchmark.initialize();
            
            if (initSuccess) {
                this.currentBenchmark.statusElement.textContent = `${apiName} ready for testing`;
                this.currentBenchmark.statusElement.className = 'status success';
                this.currentBenchmark.renderTitleElement.textContent = `🎨 ${apiName} Texture Rendering Proof`;
                
                // Enable controls
                document.getElementById('start-test').disabled = false;
                document.getElementById('stress-test').disabled = false;
                document.getElementById('clear-memory').disabled = false;
                
                this.currentBenchmark.log(`🔄 Switched to ${apiName}`, 'info');
            } else {
                this.currentBenchmark.statusElement.textContent = `${apiName} initialization failed`;
                this.currentBenchmark.statusElement.className = 'status error';
                
                // Disable controls
                document.getElementById('start-test').disabled = true;
                document.getElementById('stress-test').disabled = true;
                document.getElementById('clear-memory').disabled = true;
            }
        } else {
            this.currentBenchmark.statusElement.textContent = `${apiName} not supported`;
            this.currentBenchmark.statusElement.className = 'status error';
            
            // Disable controls
            document.getElementById('start-test').disabled = true;
            document.getElementById('stress-test').disabled = true;
            document.getElementById('clear-memory').disabled = true;
        }
    }

    /**
     * Start gradual memory allocation test
     */
    async startMemoryTest() {
        if (!this.currentBenchmark || this.currentBenchmark.isRunning) return;
        
        this.currentBenchmark.isRunning = true;
        this.currentBenchmark.startTime = Date.now();
        this.currentBenchmark.lastAllocationTime = Date.now();
        
        document.getElementById('start-test').disabled = true;
        document.getElementById('stress-test').disabled = true;
        
        this.currentBenchmark.log('🚀 Starting gradual memory allocation test...', 'info');
        
        try {
            let allocationSize = 1024 * 1024; // Start with 1MB
            
            while (this.currentBenchmark.isRunning) {
                await this.currentBenchmark.allocateBuffer(allocationSize);
                
                let textureSize = 512;
                if (this.currentBenchmark.textures.length > 5) textureSize = 1024;
                if (this.currentBenchmark.textures.length > 15) textureSize = 2048;
                if (this.currentBenchmark.textures.length > 25) textureSize = 4096;
                
                await this.currentBenchmark.allocateTexture(textureSize, textureSize);
                
                if (this.currentBenchmark.textures.length === 1) {
                    this.currentBenchmark.startTextureDisplay();
                    this.currentBenchmark.log('🎨 Started grid display - visual proof of memory usage!', 'success');
                }
                
                if (this.currentBenchmark.buffers.length % 10 === 0) {
                    allocationSize = Math.min(allocationSize * 1.1, 256 * 1024 * 1024);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (this.currentBenchmark.allocatedMemory > 16000 * 1024 * 1024) {
                    this.currentBenchmark.log('⚠️ Reached 16GB allocation limit, stopping test', 'warning');
                    break;
                }
            }
        } catch (error) {
            this.currentBenchmark.log(`💥 Memory allocation failed: ${error.message}`, 'error');
            this.currentBenchmark.log('🎯 This might indicate the memory limit!', 'warning');
        }
        
        this.currentBenchmark.stopTest();
    }

    /**
     * Start aggressive stress test
     */
    async startStressTest() {
        if (!this.currentBenchmark || this.currentBenchmark.isRunning) return;
        
        this.currentBenchmark.isRunning = true;
        this.currentBenchmark.startTime = Date.now();
        this.currentBenchmark.lastAllocationTime = Date.now();
        
        document.getElementById('start-test').disabled = true;
        document.getElementById('stress-test').disabled = true;
        
        this.currentBenchmark.log('💥 Starting aggressive stress test...', 'info');
        
        try {
            while (this.currentBenchmark.isRunning) {
                const promises = [];
                for (let i = 0; i < 3; i++) {
                    promises.push(this.currentBenchmark.allocateBuffer(16 * 1024 * 1024));
                    
                    let textureSize = 2048;
                    if (this.currentBenchmark.textures.length > 10) textureSize = 4096;
                    if (this.currentBenchmark.textures.length > 20) textureSize = 8192;
                    
                    promises.push(this.currentBenchmark.allocateTexture(textureSize, textureSize));
                }
                
                await Promise.all(promises);
                
                if (this.currentBenchmark.textures.length >= 1 && !this.currentBenchmark.renderInterval) {
                    this.currentBenchmark.startTextureDisplay();
                    this.currentBenchmark.log('🎨 Started grid display - watch memory usage grow!', 'success');
                }
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
                if (this.currentBenchmark.allocatedMemory > 16000 * 1024 * 1024) {
                    this.currentBenchmark.log('⚠️ Reached 16GB allocation limit, stopping stress test', 'warning');
                    break;
                }
            }
        } catch (error) {
            this.currentBenchmark.log(`💥 Stress test triggered error: ${error.message}`, 'error');
            this.currentBenchmark.log('🎯 This is likely the memory limit!', 'warning');
        }
        
        this.currentBenchmark.stopTest();
    }

    /**
     * Clear all allocated memory
     */
    clearMemory() {
        if (this.currentBenchmark) {
            this.currentBenchmark.clearMemory();
        }
    }

    /**
     * Clear log display
     */
    clearLog() {
        document.getElementById('log').innerHTML = '';
    }
} 