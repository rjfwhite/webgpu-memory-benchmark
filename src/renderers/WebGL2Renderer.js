import { WEBGL2_VERTEX_SHADER, WEBGL2_FRAGMENT_SHADER } from '../utils/shaders.js';

/**
 * WebGL2 Renderer - handles all WebGL2 rendering operations
 */
export class WebGL2Renderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        this.program = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.positionAttributeLocation = null;
        this.texCoordAttributeLocation = null;
        this.viewportUniformLocation = null;
        this.offsetUniformLocation = null;
        this.textureUniformLocation = null;
        this.initialized = false;
    }

    /**
     * Initialize WebGL2 rendering context and shaders
     */
    async initialize() {
        if (this.initialized) return;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, WEBGL2_VERTEX_SHADER);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, WEBGL2_FRAGMENT_SHADER);
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

        this.initialized = true;
    }

    /**
     * Create and compile a shader
     */
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

    /**
     * Create and link a shader program
     */
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

    /**
     * Render a grid of textures
     * @param {Array} textures - Array of WebGL2 textures to render
     */
    renderTextureGrid(textures) {
        if (!this.program || textures.length === 0) return;

        try {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.useProgram(this.program);

            const textureCount = textures.length;
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
                const texture = textures[i];
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
            console.warn(`Failed to render WebGL2 texture grid: ${error.message}`);
        }
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.gl.clearColor(0.0, 0.0, 0.2, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
} 