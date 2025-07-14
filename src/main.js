// Base class for common functionality
class BaseBenchmark {
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

    // Common methods
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
        logEntry.textContent = `[${timestamp}] [${this.apiName}] ${message}`;
        logEntry.className = type;
        
        this.logElement.appendChild(logEntry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
        
        console.log(`[${this.apiName} Benchmark] ${message}`);
    }

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

    stopTextureDisplay() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }

    isIOSSafari() {
        const userAgent = navigator.userAgent;
        return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    }

    // Abstract methods to be implemented by subclasses
    async checkSupport() { throw new Error('Must implement checkSupport'); }
    async initializeRendering() { throw new Error('Must implement initializeRendering'); }
    async allocateBuffer(size) { throw new Error('Must implement allocateBuffer'); }
    async allocateTexture(width, height) { throw new Error('Must implement allocateTexture'); }
    clearMemory() { throw new Error('Must implement clearMemory'); }
    startTextureDisplay() { throw new Error('Must implement startTextureDisplay'); }
}

class WebGPUMemoryBenchmark extends BaseBenchmark {
    constructor() {
        super('WebGPU');
        this.device = null;
        this.adapter = null;
        this.renderPipeline = null;
        this.sampler = null;
        this.initialized = false;
    }

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
            await this.initializeRendering();
            
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

    async initializeRendering() {
        this.context = this.canvas.getContext('webgpu');
        if (!this.context) {
            throw new Error('Failed to get WebGPU context from canvas');
        }

        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: canvasFormat,
            alphaMode: 'premultiplied',
        });

        this.sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        const shaderModule = this.device.createShaderModule({
            code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) texCoord: vec2<f32>,
                }

                @vertex
                fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                    var pos = array<vec2<f32>, 6>(
                        vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
                        vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0), vec2<f32>(-1.0,  1.0)
                    );
                    
                    var texCoord = array<vec2<f32>, 6>(
                        vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 0.0),
                        vec2<f32>(1.0, 1.0), vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 0.0)
                    );

                    var output: VertexOutput;
                    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
                    output.texCoord = texCoord[vertexIndex];
                    return output;
                }

                @group(0) @binding(0) var textureSampler: sampler;
                @group(0) @binding(1) var textureData: texture_2d<f32>;

                @fragment
                fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                    return textureSample(textureData, textureSampler, input.texCoord);
                }
            `
        });

        this.renderPipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: shaderModule, entryPoint: 'vs_main' },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format: canvasFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
    }

    startTextureDisplay() {
        if (this.renderInterval) clearInterval(this.renderInterval);
        
        this.renderInterval = setInterval(() => {
            if (this.textures.length > 0) {
                this.renderTextureGrid();
            }
        }, 100);
    }

    async renderTextureGrid() {
        if (!this.renderPipeline || !this.context || this.textures.length === 0) return;

        try {
            const textureCount = this.textures.length;
            const gridSize = Math.ceil(Math.sqrt(textureCount));

            const commandEncoder = this.device.createCommandEncoder();
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: { r: 0.1, g: 0.1, b: 0.3, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            });

            renderPass.setPipeline(this.renderPipeline);

            for (let i = 0; i < Math.min(textureCount, gridSize * gridSize); i++) {
                const texture = this.textures[i];
                if (!texture) continue;

                const row = Math.floor(i / gridSize);
                const col = i % gridSize;

                const bindGroup = this.device.createBindGroup({
                    layout: this.renderPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: this.sampler },
                        { binding: 1, resource: texture.createView() },
                    ],
                });

                const x = col * (this.canvas.width / gridSize);
                const y = row * (this.canvas.height / gridSize);
                const width = this.canvas.width / gridSize;
                const height = this.canvas.height / gridSize;

                renderPass.setViewport(x, y, width, height, 0.0, 1.0);
                renderPass.setBindGroup(0, bindGroup);
                renderPass.draw(6);
            }

            renderPass.end();
            this.device.queue.submit([commandEncoder.finish()]);
        } catch (error) {
            this.log(`⚠️ Failed to render texture grid: ${error.message}`, 'warning');
        }
    }

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
            
            const alignedSize = Math.floor(size / 4) * 4;
            const data = new Uint8Array(alignedSize);
            
            for (let i = 0; i < Math.min(alignedSize, 1024 * 1024); i += 4) {
                const value = Math.floor(Math.random() * 4294967295);
                data[i] = value & 0xFF;
                data[i + 1] = (value >> 8) & 0xFF;
                data[i + 2] = (value >> 16) & 0xFF;
                data[i + 3] = (value >> 24) & 0xFF;
            }
            
            this.device.queue.writeBuffer(buffer, 0, data);
            
            const commandEncoder = this.device.createCommandEncoder();
            this.device.queue.submit([commandEncoder.finish()]);
            
            this.buffers.push(buffer);
            this.allocatedMemory += size;
            this.updateMetrics();
            
            this.log(`📦 Allocated WebGPU buffer: ${this.formatBytes(size)}`, 'info');
            return buffer;
        } catch (error) {
            this.log(`🚨 WebGPU buffer allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

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
            const data = new Uint8Array(textureSize);
            
            for (let i = 0; i < textureSize; i += 4) {
                const noise = Math.random();
                if (noise > 0.5) {
                    data[i] = Math.floor(Math.random() * 256);
                    data[i + 1] = Math.floor(Math.random() * 256);
                    data[i + 2] = Math.floor(Math.random() * 256);
                } else {
                    const value = Math.random() > 0.5 ? 255 : 0;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
                data[i + 3] = 255;
            }
            
            this.device.queue.writeTexture(
                { texture: texture },
                data,
                { bytesPerRow: width * 4, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 }
            );
            
            this.textures.push(texture);
            this.allocatedMemory += textureSize;
            this.updateMetrics();
            
            this.log(`🖼️ Allocated WebGPU texture: ${width}x${height}`, 'info');
            return texture;
        } catch (error) {
            this.log(`🚨 WebGPU texture allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    clearMemory() {
        this.log('🧹 Clearing WebGPU memory...', 'info');
        this.stopTextureDisplay();
        
        this.buffers.forEach(buffer => {
            try { buffer.destroy(); } catch (e) {}
        });
        
        this.textures.forEach(texture => {
            try { texture.destroy(); } catch (e) {}
        });
        
        this.buffers = [];
        this.textures = [];
        this.allocatedMemory = 0;
        this.updateMetrics();
        
        if (this.context) {
            const commandEncoder = this.device.createCommandEncoder();
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: { r: 0.0, g: 0.0, b: 0.2, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            });
            renderPass.end();
            this.device.queue.submit([commandEncoder.finish()]);
        }
        
        this.log('✅ WebGPU memory cleared', 'success');
    }
}

class WebGL2MemoryBenchmark extends BaseBenchmark {
    constructor() {
        super('WebGL2');
        this.gl = null;
        this.program = null;
        this.arrayBuffers = []; // For tracking JavaScript arrays
        this.initialized = false;
    }

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

    async initialize() {
        if (this.initialized) return true;
        
        try {
            this.gl = this.canvas.getContext('webgl2');
            if (!this.gl) {
                this.log('❌ Failed to get WebGL2 context', 'error');
                return false;
            }

            await this.initializeRendering();
            
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

    async initializeRendering() {
        const vertexShaderSource = `#version 300 es
            in vec4 a_position;
            in vec2 a_texCoord;
            out vec2 v_texCoord;
            uniform vec2 u_viewport;
            uniform vec2 u_offset;
            
            void main() {
                vec2 scaledPos = (a_position.xy + u_offset) * u_viewport * 2.0 - 1.0;
                gl_Position = vec4(scaledPos, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `#version 300 es
            precision mediump float;
            in vec2 v_texCoord;
            out vec4 fragColor;
            uniform sampler2D u_texture;
            
            void main() {
                fragColor = texture(u_texture, v_texCoord);
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);

        // Create quad geometry
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
             1, -1,  1,  1,  -1, 1
        ]);
        
        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,
            1, 1,  1, 0,  0, 0
        ]);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

        this.positionAttributeLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordAttributeLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.viewportUniformLocation = this.gl.getUniformLocation(this.program, 'u_viewport');
        this.offsetUniformLocation = this.gl.getUniformLocation(this.program, 'u_offset');
        this.textureUniformLocation = this.gl.getUniformLocation(this.program, 'u_texture');
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${error}`);
        }
        
        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Program linking error: ${error}`);
        }
        
        return program;
    }

    startTextureDisplay() {
        if (this.renderInterval) clearInterval(this.renderInterval);
        
        this.renderInterval = setInterval(() => {
            if (this.textures.length > 0) {
                this.renderTextureGrid();
            }
        }, 100);
    }

    renderTextureGrid() {
        if (!this.program || this.textures.length === 0) return;

        try {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.useProgram(this.program);

            const textureCount = this.textures.length;
            const gridSize = Math.ceil(Math.sqrt(textureCount));
            const cellSize = 1.0 / gridSize;

            // Set up attribute buffers
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.enableVertexAttribArray(this.positionAttributeLocation);
            this.gl.vertexAttribPointer(this.positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
            this.gl.enableVertexAttribArray(this.texCoordAttributeLocation);
            this.gl.vertexAttribPointer(this.texCoordAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.uniform2f(this.viewportUniformLocation, cellSize, cellSize);

            for (let i = 0; i < Math.min(textureCount, gridSize * gridSize); i++) {
                const texture = this.textures[i];
                if (!texture) continue;

                const row = Math.floor(i / gridSize);
                const col = i % gridSize;

                this.gl.uniform2f(this.offsetUniformLocation, col * cellSize, row * cellSize);
                
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.uniform1i(this.textureUniformLocation, 0);

                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            }
        } catch (error) {
            this.log(`⚠️ Failed to render WebGL2 texture grid: ${error.message}`, 'warning');
        }
    }

    async allocateBuffer(size) {
        if (!this.gl) {
            await this.initialize();
        }
        
        try {
            // Create WebGL buffer
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            
            // Also create JavaScript array for actual memory pressure
            const arrayBuffer = new ArrayBuffer(size);
            const dataView = new Uint8Array(arrayBuffer);
            
            // Fill with random data
            for (let i = 0; i < size; i++) {
                dataView[i] = Math.floor(Math.random() * 256);
            }
            
            // Upload to WebGL buffer
            this.gl.bufferData(this.gl.ARRAY_BUFFER, dataView, this.gl.STATIC_DRAW);
            
            this.buffers.push(buffer);
            this.arrayBuffers.push(arrayBuffer);
            this.allocatedMemory += size;
            this.updateMetrics();
            
            this.log(`📦 Allocated WebGL2 buffer: ${this.formatBytes(size)}`, 'info');
            return buffer;
        } catch (error) {
            this.log(`🚨 WebGL2 buffer allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async allocateTexture(width, height) {
        if (!this.gl) {
            await this.initialize();
        }
        
        try {
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            
            const textureSize = width * height * 4;
            const data = new Uint8Array(textureSize);
            
            // Fill with high contrast noise
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
            
            this.gl.texImage2D(
                this.gl.TEXTURE_2D, 0, this.gl.RGBA,
                width, height, 0,
                this.gl.RGBA, this.gl.UNSIGNED_BYTE, data
            );
            
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            
            this.textures.push(texture);
            this.arrayBuffers.push(data.buffer); // Keep reference to prevent GC
            this.allocatedMemory += textureSize;
            this.updateMetrics();
            
            this.log(`🖼️ Allocated WebGL2 texture: ${width}x${height}`, 'info');
            return texture;
        } catch (error) {
            this.log(`🚨 WebGL2 texture allocation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    clearMemory() {
        this.log('🧹 Clearing WebGL2 memory...', 'info');
        this.stopTextureDisplay();
        
        this.buffers.forEach(buffer => {
            try { this.gl.deleteBuffer(buffer); } catch (e) {}
        });
        
        this.textures.forEach(texture => {
            try { this.gl.deleteTexture(texture); } catch (e) {}
        });
        
        this.buffers = [];
        this.textures = [];
        this.arrayBuffers = []; // Release JavaScript memory
        this.allocatedMemory = 0;
        this.updateMetrics();
        
        // Clear canvas
        this.gl.clearColor(0.0, 0.0, 0.2, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        this.log('✅ WebGL2 memory cleared', 'success');
    }
}

// Unified benchmark controller
class BenchmarkController {
    constructor() {
        this.currentApi = 'webgpu';
        this.benchmarks = {
            webgpu: new WebGPUMemoryBenchmark(),
            webgl2: new WebGL2MemoryBenchmark()
        };
        this.currentBenchmark = null;
        
        this.initializeUI();
        this.initializeAPI();
    }

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
    }

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

    async switchAPI(api) {
        if (this.currentBenchmark && this.currentBenchmark.isRunning) {
            this.currentBenchmark.log('⚠️ Stopping current test to switch API', 'warning');
            this.currentBenchmark.stopTest();
        }

        // Clear any existing canvas context by recreating the canvas
        const oldCanvas = document.getElementById('render-canvas');
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'render-canvas';
        newCanvas.width = 512;
        newCanvas.height = 400;
        oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
        
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

    clearMemory() {
        if (this.currentBenchmark) {
            this.currentBenchmark.clearMemory();
        }
    }

    clearLog() {
        document.getElementById('log').innerHTML = '';
    }
}

// Initialize the benchmark controller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BenchmarkController();
}); 