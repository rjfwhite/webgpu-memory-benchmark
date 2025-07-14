import { BaseBenchmark } from '../core/BaseBenchmark.js';
import { WebGPURenderer } from '../renderers/WebGPURenderer.js';
import { createRandomTextureData, createRandomBufferData } from '../utils/formatters.js';

/**
 * WebGPU Memory Benchmark Implementation
 */
export class WebGPUMemoryBenchmark extends BaseBenchmark {
    constructor() {
        super('WebGPU');
        this.device = null;
        this.adapter = null;
        this.renderer = null;
        this.initialized = false;
    }

    /**
     * Check if WebGPU is supported in the current browser
     */
    async checkSupport() {
        try {
            if (!navigator.gpu) {
                this.log('❌ WebGPU not supported in this browser', 'error');
                return false;
            }

            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                this.log('❌ Failed to get WebGPU adapter', 'error');
                return false;
            }

            this.log('✅ WebGPU support detected', 'success');
            
            if (this.isIOSSafari()) {
                this.log('📱 iOS Safari detected - expect memory limits around 200-800MB', 'warning');
            }
            
            return true;
        } catch (error) {
            this.log(`❌ Error checking WebGPU: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Initialize WebGPU device and renderer
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            if (!navigator.gpu) {
                this.log('❌ WebGPU not supported in this browser', 'error');
                return false;
            }

            this.adapter = await navigator.gpu.requestAdapter();
            if (!this.adapter) {
                this.log('❌ Failed to get WebGPU adapter', 'error');
                return false;
            }

            this.device = await this.adapter.requestDevice();
            
            // Initialize renderer
            this.renderer = new WebGPURenderer(this.device, this.canvas);
            await this.renderer.initialize();
            
            const limits = this.adapter.limits;
            this.log('✅ WebGPU initialized successfully', 'success');
            this.log(`📊 Device Limits:`, 'info');
            this.log(`   Max Buffer Size: ${this.formatBytes(limits.maxBufferSize)}`, 'info');
            this.log(`   Max Texture Dimension 2D: ${limits.maxTextureDimension2D}px`, 'info');
            
            this.initialized = true;
            return true;
        } catch (error) {
            this.log(`❌ Error initializing WebGPU: ${error.message}`, 'error');
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
     * Allocate a WebGPU buffer
     * @param {number} size - Buffer size in bytes
     */
    async allocateBuffer(size) {
        if (!this.device) {
            await this.initialize();
        }
        
        try {
            const buffer = this.device.createBuffer({
                size: size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: false
            });
            
            const data = createRandomBufferData(size);
            this.device.queue.writeBuffer(buffer, 0, data);
            
            // Ensure the operation is submitted
            const commandEncoder = this.device.createCommandEncoder();
            this.device.queue.submit([commandEncoder.finish()]);
            
            this.buffers.push(buffer);
            this.allocatedMemory += size;
            this.lastAllocationTime = Date.now();
            this.updateMetrics();
            
            this.log(`📦 Allocated WebGPU buffer: ${this.formatBytes(size)} VRAM`, 'info');
            return buffer;
        } catch (error) {
            this.log(`🚨 WebGPU buffer allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Allocate a WebGPU texture
     * @param {number} width - Texture width
     * @param {number} height - Texture height
     */
    async allocateTexture(width, height) {
        if (!this.device) {
            await this.initialize();
        }
        
        try {
            const texture = this.device.createTexture({
                size: [width, height, 1],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            
            const textureSize = width * height * 4;
            const data = createRandomTextureData(width, height);
            
            this.device.queue.writeTexture(
                { texture: texture },
                data,
                { bytesPerRow: width * 4, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 }
            );
            
            this.textures.push(texture);
            this.allocatedMemory += textureSize;
            this.lastAllocationTime = Date.now();
            this.updateMetrics();
            
            this.log(`🖼️ Allocated WebGPU texture: ${width}x${height} (${this.formatBytes(textureSize)} VRAM)`, 'info');
            return texture;
        } catch (error) {
            this.log(`🚨 WebGPU texture allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Clear all allocated memory
     */
    clearMemory() {
        this.log('🧹 Clearing WebGPU VRAM...', 'info');
        this.stopTextureDisplay();
        
        // Destroy all buffers
        this.buffers.forEach(buffer => {
            try { 
                buffer.destroy(); 
            } catch (e) {
                console.warn('Failed to destroy buffer:', e);
            }
        });
        
        // Destroy all textures
        this.textures.forEach(texture => {
            try { 
                texture.destroy(); 
            } catch (e) {
                console.warn('Failed to destroy texture:', e);
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
        
        this.log('✅ WebGPU VRAM cleared', 'success');
    }
} 