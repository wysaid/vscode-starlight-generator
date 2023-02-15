#version 310 es
precision highp float;
precision highp int;

layout(location = 2) float intensity;

layout(binding = 0) uniform sampler2D textureInput;
layout(binding = 1) uniform sampler2D textureMix;
layout(location = 0) in highp vec2 texCoord;
layout(location = 0) out highp vec4 fragColor;

void main()
{
    vec4 colorInput = texture(textureInput, texCoord);
    vec4 colorMix = texture(textureMix, texCoord);
    fragColor = mix(colorInput, colorMix, intensity);
}
