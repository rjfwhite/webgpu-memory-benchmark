// WebGPU Shaders
export const WEBGPU_VERTEX_SHADER = `
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
`;

export const WEBGPU_FRAGMENT_SHADER = `
    @group(0) @binding(0) var textureSampler: sampler;
    @group(0) @binding(1) var textureData: texture_2d<f32>;

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        return textureSample(textureData, textureSampler, input.texCoord);
    }
`;

export const WEBGPU_SHADER_CODE = WEBGPU_VERTEX_SHADER + WEBGPU_FRAGMENT_SHADER;

// WebGL2 Shaders
export const WEBGL2_VERTEX_SHADER = `#version 300 es
    in vec4 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    uniform vec2 u_viewport;
    uniform vec2 u_offset;
    
    void main() {
        // Scale the quad by viewport size and translate to correct grid position
        vec2 scaledPos = a_position.xy * u_viewport + u_offset * 2.0 - 1.0 + u_viewport;
        gl_Position = vec4(scaledPos, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

export const WEBGL2_FRAGMENT_SHADER = `#version 300 es
    precision mediump float;
    in vec2 v_texCoord;
    out vec4 fragColor;
    uniform sampler2D u_texture;
    
    void main() {
        fragColor = texture(u_texture, v_texCoord);
    }
`; 