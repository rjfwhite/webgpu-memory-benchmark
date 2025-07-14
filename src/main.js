class WebGPUMemoryBenchmark {
    constructor() {
        this.device = null;
        this.adapter = null;
        this.buffers = [];
        this.textures = [];
        this.allocatedMemory = 0;
        this.isRunning = false;
        this.startTime = null;
        this.lastAllocationTime = null;
        
        this.initializeUI();
        this.checkWebGPUSupport();
    }

    initializeUI() {
        this.statusElement = document.getElementById('webgpu-status');
        this.startButton = document.getElementById('start-test');
        this.stressButton = document.getElementById('stress-test');
        this.clearButton = document.getElementById('clear-memory');
        this.clearLogButton = document.getElementById('clear-log');
        this.logElement = document.getElementById('log');
        
        this.allocatedMemoryElement = document.getElementById('allocated-memory');
        this.bufferCountElement = document.getElementById('buffer-count');
        this.textureCountElement = document.getElementById('texture-count');
        this.allocationRateElement = document.getElementById('allocation-rate');

        this.startButton.addEventListener('click', () => this.startMemoryTest());
        this.stressButton.addEventListener('click', () => this.startStressTest());
        this.clearButton.addEventListener('click', () => this.clearMemory());
        this.clearLogButton.addEventListener('click', () => this.clearLog());
    }

    async checkWebGPUSupport() {
        try {
            if (!navigator.gpu) {
                this.log('❌ WebGPU not supported in this browser', 'error');
                this.statusElement.textContent = 'WebGPU not supported';
                this.statusElement.className = 'status error';
                return;
            }

            this.adapter = await navigator.gpu.requestAdapter();
            if (!this.adapter) {
                this.log('❌ Failed to get WebGPU adapter', 'error');
                this.statusElement.textContent = 'Failed to get WebGPU adapter';
                this.statusElement.className = 'status error';
                return;
            }

            this.device = await this.adapter.requestDevice();
            
            // Log device limits
            const limits = this.adapter.limits;
            this.log('✅ WebGPU initialized successfully', 'success');
            this.log(`📊 Device Limits:`, 'info');
            this.log(`   Max Buffer Size: ${this.formatBytes(limits.maxBufferSize)}`, 'info');
            this.log(`   Max Storage Buffer Binding Size: ${this.formatBytes(limits.maxStorageBufferBindingSize)}`, 'info');
            this.log(`   Max Texture Dimension 2D: ${limits.maxTextureDimension2D}px`, 'info');
            
            // Log adapter info for debugging (if available)
            try {
                if (this.adapter.requestAdapterInfo) {
                    const adapterInfo = await this.adapter.requestAdapterInfo();
                    this.log(`🖥️ GPU: ${adapterInfo.device || 'Unknown'}`, 'info');
                    this.log(`🏗️ Vendor: ${adapterInfo.vendor || 'Unknown'}`, 'info');
                } else {
                    this.log('🖥️ GPU info not available in this browser', 'info');
                }
            } catch (error) {
                this.log('🖥️ GPU info not accessible', 'info');
            }
            
            this.statusElement.textContent = 'WebGPU ready for testing';
            this.statusElement.className = 'status success';
            
            // Add iOS Safari specific warnings
            if (this.isIOSSafari()) {
                this.log('📱 iOS Safari detected - expect memory limits around 200-800MB', 'warning');
                this.log('⚠️ Tab may crash when limit is exceeded', 'warning');
            }
            
            this.startButton.disabled = false;
            this.stressButton.disabled = false;
            this.clearButton.disabled = false;

        } catch (error) {
            this.log(`❌ Error initializing WebGPU: ${error.message}`, 'error');
            this.statusElement.textContent = `Error: ${error.message}`;
            this.statusElement.className = 'status error';
        }
    }

    async startMemoryTest() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastAllocationTime = Date.now();
        this.startButton.disabled = true;
        this.stressButton.disabled = true;
        
        this.log('🚀 Starting gradual memory allocation test...', 'info');
        
        try {
            let allocationSize = 1024 * 1024; // Start with 1MB
            
            while (this.isRunning) {
                await this.allocateBuffer(allocationSize);
                await this.allocateTexture(512, 512); // 512x512 RGBA texture
                
                // Gradually increase allocation size
                if (this.buffers.length % 10 === 0) {
                    allocationSize = Math.min(allocationSize * 1.1, 64 * 1024 * 1024); // Cap at 64MB
                }
                
                // Small delay to prevent blocking the UI
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Check if we should continue (simple heuristic)
                if (this.allocatedMemory > 4000 * 1024 * 1024) { // Stop at 2GB
                    this.log('⚠️ Reached 4GB allocation limit, stopping test', 'warning');
                    break;
                }
            }
        } catch (error) {
            this.log(`💥 Memory allocation failed: ${error.message}`, 'error');
            this.log('🎯 This might indicate the memory limit!', 'warning');
            this.log(`📊 Final memory before crash: ${this.formatBytes(this.allocatedMemory)}`, 'warning');
            
            // Try to detect if this was an out-of-memory error
            if (error.message.toLowerCase().includes('memory') || 
                error.message.toLowerCase().includes('allocation') ||
                error.message.toLowerCase().includes('resource')) {
                this.log('💀 OUT OF MEMORY ERROR DETECTED! This is the limit!', 'error');
            }
        }
        
        this.stopTest();
    }

    async startStressTest() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastAllocationTime = Date.now();
        this.startButton.disabled = true;
        this.stressButton.disabled = true;
        
        this.log('💥 Starting aggressive stress test...', 'info');
        
        try {
            while (this.isRunning) {
                // Allocate multiple buffers rapidly
                const promises = [];
                for (let i = 0; i < 5; i++) {
                    promises.push(this.allocateBuffer(8 * 1024 * 1024)); // 8MB each
                    promises.push(this.allocateTexture(1024, 1024)); // 1024x1024 RGBA texture
                }
                
                await Promise.all(promises);
                
                // Very short delay
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Check memory threshold
                if (this.allocatedMemory > 4000 * 1024 * 1024) { // Stop at 3GB
                    this.log('⚠️ Reached 4GB allocation limit, stopping stress test', 'warning');
                    break;
                }
            }
        } catch (error) {
            this.log(`💥 Stress test triggered error: ${error.message}`, 'error');
            this.log('🎯 This is likely the memory limit!', 'warning');
            this.log(`📊 Final memory before crash: ${this.formatBytes(this.allocatedMemory)}`, 'warning');
            
            // Try to detect if this was an out-of-memory error
            if (error.message.toLowerCase().includes('memory') || 
                error.message.toLowerCase().includes('allocation') ||
                error.message.toLowerCase().includes('resource')) {
                this.log('💀 OUT OF MEMORY ERROR DETECTED! This is the limit!', 'error');
            }
        }
        
        this.stopTest();
    }

    async allocateBuffer(size) {
        try {
            const buffer = this.device.createBuffer({
                size: size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: false
            });
            
            // Force actual memory allocation by writing data to the buffer
            // Ensure size is aligned to 4 bytes for WebGPU requirements
            const alignedSize = Math.floor(size / 4) * 4;
            const data = new Uint8Array(alignedSize);
            
            // Fill with random data to prevent compression optimizations
            for (let i = 0; i < Math.min(alignedSize, 1024 * 1024); i += 4) {
                // Write 4 bytes at a time for better performance
                const value = Math.floor(Math.random() * 4294967295); // Random 32-bit value
                data[i] = value & 0xFF;
                data[i + 1] = (value >> 8) & 0xFF;
                data[i + 2] = (value >> 16) & 0xFF;
                data[i + 3] = (value >> 24) & 0xFF;
            }
            
            this.device.queue.writeBuffer(buffer, 0, data);
            
            // Submit the commands and wait for completion to ensure memory is allocated
            const commandEncoder = this.device.createCommandEncoder();
            this.device.queue.submit([commandEncoder.finish()]);
            
            // Additional stress test with compute shader to ensure memory is really used
            await this.stressBufferMemory(buffer, size);
            
            this.buffers.push(buffer);
            this.allocatedMemory += size;
            this.updateMetrics();
            
            this.log(`📦 Allocated & stressed buffer: ${this.formatBytes(size)} (Total: ${this.formatBytes(this.allocatedMemory)})`, 'info');
            
            return buffer;
        } catch (error) {
            // Log additional context for debugging
            this.log(`🚨 Buffer allocation failed at ${this.formatBytes(this.allocatedMemory)} total`, 'error');
            this.log(`🔍 Error details: ${error.message}`, 'error');
            throw new Error(`Buffer allocation failed: ${error.message}`);
        }
    }

    async allocateTexture(width, height) {
        try {
            const texture = this.device.createTexture({
                size: [width, height, 1],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });
            
            // Force actual memory allocation by writing data to the texture
            const textureSize = width * height * 4; // RGBA = 4 bytes per pixel
            const data = new Uint8Array(textureSize);
            
            // Fill with random data to prevent compression optimizations
            // Texture data is already aligned (width * height * 4 bytes)
            for (let i = 0; i < Math.min(textureSize, 1024 * 1024); i += 4) {
                // Write RGBA pixels with random values
                data[i] = Math.floor(Math.random() * 256);     // R
                data[i + 1] = Math.floor(Math.random() * 256); // G
                data[i + 2] = Math.floor(Math.random() * 256); // B
                data[i + 3] = 255; // A (full alpha)
            }
            
            this.device.queue.writeTexture(
                { texture: texture },
                data,
                { bytesPerRow: width * 4, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 }
            );
            
            // Submit the commands to ensure memory is allocated
            const commandEncoder = this.device.createCommandEncoder();
            this.device.queue.submit([commandEncoder.finish()]);
            
            this.textures.push(texture);
            this.allocatedMemory += textureSize;
            this.updateMetrics();
            
            this.log(`🖼️ Allocated & filled texture: ${width}x${height} (${this.formatBytes(textureSize)})`, 'info');
            
            return texture;
        } catch (error) {
            // Log additional context for debugging
            this.log(`🚨 Texture allocation failed at ${this.formatBytes(this.allocatedMemory)} total`, 'error');
            this.log(`🔍 Error details: ${error.message}`, 'error');
            throw new Error(`Texture allocation failed: ${error.message}`);
        }
    }

    clearMemory() {
        this.log('🧹 Clearing all allocated memory...', 'info');
        
        // Destroy all buffers
        this.buffers.forEach(buffer => {
            try {
                buffer.destroy();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        
        // Destroy all textures
        this.textures.forEach(texture => {
            try {
                texture.destroy();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        
        this.buffers = [];
        this.textures = [];
        this.allocatedMemory = 0;
        
        this.updateMetrics();
        this.log('✅ Memory cleared successfully', 'success');
    }

    stopTest() {
        this.isRunning = false;
        this.startButton.disabled = false;
        this.stressButton.disabled = false;
        
        const duration = (Date.now() - this.startTime) / 1000;
        this.log(`⏱️ Test completed in ${duration.toFixed(2)} seconds`, 'info');
        this.log(`📈 Final allocation: ${this.formatBytes(this.allocatedMemory)}`, 'info');
        this.log(`📊 Total buffers: ${this.buffers.length}, Total textures: ${this.textures.length}`, 'info');
    }

    updateMetrics() {
        this.allocatedMemoryElement.textContent = this.formatBytes(this.allocatedMemory);
        this.bufferCountElement.textContent = this.buffers.length.toString();
        this.textureCountElement.textContent = this.textures.length.toString();
        
        // Calculate allocation rate
        if (this.lastAllocationTime && this.startTime) {
            const timeDiff = (Date.now() - this.startTime) / 1000; // seconds
            const rate = timeDiff > 0 ? (this.allocatedMemory / (1024 * 1024)) / timeDiff : 0; // MB/s
            this.allocationRateElement.textContent = `${rate.toFixed(2)} MB/s`;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logEntry.className = type;
        
        this.logElement.appendChild(logEntry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
        
        // Console log for debugging
        console.log(`[WebGPU Benchmark] ${message}`);
    }

    clearLog() {
        this.logElement.innerHTML = '';
    }

    // Detect if running on iOS Safari
    isIOSSafari() {
        const userAgent = navigator.userAgent;
        return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    }

    // Add a method to create a compute shader that uses memory
    async createMemoryStressingComputeShader() {
        const shaderCode = `
            @group(0) @binding(0) var<storage, read_write> data: array<f32>;
            
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                if (index >= arrayLength(&data)) {
                    return;
                }
                // Write and read to ensure memory is actually used
                data[index] = f32(index) * 1.23456789;
                data[index] = data[index] + 1.0;
            }
        `;

        const computeShader = this.device.createShaderModule({
            code: shaderCode
        });

        return computeShader;
    }

    // Add a method to run compute operations on buffers to stress memory
    async stressBufferMemory(buffer, size) {
        try {
            const computeShader = await this.createMemoryStressingComputeShader();
            
            const bindGroupLayout = this.device.createBindGroupLayout({
                entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                }]
            });

            const computePipeline = this.device.createComputePipeline({
                layout: this.device.createPipelineLayout({
                    bindGroupLayouts: [bindGroupLayout]
                }),
                compute: {
                    module: computeShader,
                    entryPoint: 'main'
                }
            });

            const bindGroup = this.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: buffer }
                }]
            });

            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, bindGroup);
            
            // Dispatch enough workgroups to cover the buffer
            const workgroupSize = 64;
            const numElements = size / 4; // f32 = 4 bytes
            const numWorkgroups = Math.ceil(numElements / workgroupSize);
            passEncoder.dispatchWorkgroups(numWorkgroups);
            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
        } catch (error) {
            this.log(`⚠️ Compute stress test failed: ${error.message}`, 'warning');
        }
    }
}

// Initialize the benchmark when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebGPUMemoryBenchmark();
}); 