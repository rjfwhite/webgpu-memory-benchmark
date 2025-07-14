import { BaseBenchmark } from '../core/BaseBenchmark.js';
import { WebGL2Renderer } from '../renderers/WebGL2Renderer.js';
import { createRandomTextureData } from '../utils/formatters.js';

/**
 * WebGL2 Memory Benchmark Implementation
 */
export class WebGL2MemoryBenchmark extends BaseBenchmark {
    constructor() {
        super('WebGL2');
        this.gl = null;
        this.renderer = null;
        this.initialized = false;
    }

    /**
     * Check if WebGL2 is supported in the current browser
     */
    async checkSupport() {
        try {
            // Test WebGL2 support without interfering with existing contexts
            const testCanvas = document.createElement('canvas');
            const testGl = testCanvas.getContext('webgl2');
            
            if (!testGl) {
                this.log('❌ WebGL2 not supported in this browser', 'error');
                return false;
            }
            
            // Clean up test canvas
            testCanvas.remove();
            
            this.log('✅ WebGL2 support detected', 'success');
            
            if (this.isIOSSafari()) {
                this.log('📱 iOS Safari detected - expect memory limits around 200-800MB', 'warning');
            }
            
            return true;
        } catch (error) {
            this.log(`❌ Error checking WebGL2: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Initialize WebGL2 context and renderer
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            this.gl = this.canvas.getContext('webgl2');
            if (!this.gl) {
                this.log('❌ Failed to get WebGL2 context', 'error');
                return false;
            }

            // Initialize renderer
            this.renderer = new WebGL2Renderer(this.gl, this.canvas);
            await this.renderer.initialize();
            
            this.log('✅ WebGL2 initialized successfully', 'success');
            this.log(`📊 WebGL2 Limits:`, 'info');
            this.log(`   Max Texture Size: ${this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)}px`, 'info');
            this.log(`   Max Renderbuffer Size: ${this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE)}px`, 'info');
            
            this.initialized = true;
            return true;
        } catch (error) {
            this.log(`❌ Error initializing WebGL2: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Start texture display rendering
     */
    startTextureDisplay() {
        if (this.renderInterval) clearInterval(this.renderInterval);
        
        this.renderInterval = setInterval(() => {
            if (this.textures.length > 0) {
                this.renderer.renderTextureGrid(this.textures);
            }
        }, 100);
    }

    /**
     * Allocate a WebGL2 buffer
     * @param {number} size - Buffer size in bytes
     */
    async allocateBuffer(size) {
        if (!this.gl) {
            await this.initialize();
        }
        
        try {
            // Create WebGL buffer
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            
            // Create JavaScript array for upload (will be garbage collected after upload)
            const arrayBuffer = new ArrayBuffer(size);
            const dataView = new Uint8Array(arrayBuffer);
            
            // Fill with random data
            for (let i = 0; i < size; i++) {
                dataView[i] = Math.floor(Math.random() * 256);
            }
            
            // Upload to WebGL buffer
            this.gl.bufferData(this.gl.ARRAY_BUFFER, dataView, this.gl.STATIC_DRAW);
            
            // Don't store the JavaScript array - let it be garbage collected
            this.buffers.push(buffer);
            this.allocatedMemory += size;
            this.lastAllocationTime = Date.now();
            this.updateMetrics();
            
            this.log(`📦 Allocated WebGL2 buffer: ${this.formatBytes(size)} VRAM`, 'info');
            return buffer;
        } catch (error) {
            this.log(`🚨 WebGL2 buffer allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Allocate a WebGL2 texture
     * @param {number} width - Texture width
     * @param {number} height - Texture height
     */
    async allocateTexture(width, height) {
        if (!this.gl) {
            await this.initialize();
        }
        
        try {
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            
            const textureSize = width * height * 4;
            const data = createRandomTextureData(width, height);
            
            this.gl.texImage2D(
                this.gl.TEXTURE_2D, 0, this.gl.RGBA,
                width, height, 0,
                this.gl.RGBA, this.gl.UNSIGNED_BYTE, data
            );
            
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            
            // Don't store the JavaScript array - let it be garbage collected
            this.textures.push(texture);
            this.allocatedMemory += textureSize;
            this.lastAllocationTime = Date.now();
            this.updateMetrics();
            
            this.log(`🖼️ Allocated WebGL2 texture: ${width}x${height} (${this.formatBytes(textureSize)} VRAM)`, 'info');
            return texture;
        } catch (error) {
            this.log(`🚨 WebGL2 texture allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Clear all allocated memory
     */
    clearMemory() {
        this.log('🧹 Clearing WebGL2 VRAM...', 'info');
        this.stopTextureDisplay();
        
        // Delete all buffers
        this.buffers.forEach(buffer => {
            try { 
                this.gl.deleteBuffer(buffer); 
            } catch (e) {
                console.warn('Failed to delete buffer:', e);
            }
        });
        
        // Delete all textures
        this.textures.forEach(texture => {
            try { 
                this.gl.deleteTexture(texture); 
            } catch (e) {
                console.warn('Failed to delete texture:', e);
            }
        });
        
        this.buffers = [];
        this.textures = [];
        this.allocatedMemory = 0;
        this.updateMetrics();
        
        // Clear the canvas
        if (this.renderer) {
            this.renderer.clear();
        }
        
        this.log('✅ WebGL2 VRAM cleared', 'success');
    }
} 