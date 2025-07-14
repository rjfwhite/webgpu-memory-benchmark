import { WEBGPU_SHADER_CODE } from '../utils/shaders.js';

/**
 * WebGPU Renderer - handles all WebGPU rendering operations
 */
export class WebGPURenderer {
    constructor(device, canvas) {
        this.device = device;
        this.canvas = canvas;
        this.context = null;
        this.renderPipeline = null;
        this.sampler = null;
        this.initialized = false;
    }

    /**
     * Initialize WebGPU rendering context and pipeline
     */
    async initialize() {
        if (this.initialized) return;

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
            code: WEBGPU_SHADER_CODE
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

        this.initialized = true;
    }

    /**
     * Render a grid of textures
     * @param {Array} textures - Array of WebGPU textures to render
     */
    async renderTextureGrid(textures) {
        if (!this.renderPipeline || !this.context || textures.length === 0) return;

        try {
            const textureCount = textures.length;
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
                const texture = textures[i];
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
            console.warn(`Failed to render WebGPU texture grid: ${error.message}`);
        }
    }

    /**
     * Clear the canvas
     */
    clear() {
        if (!this.context) return;

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
} 