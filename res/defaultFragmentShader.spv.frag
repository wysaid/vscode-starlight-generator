#version 310 es
precision highp float;
precision highp int;

layout(location = 2) uniform float intensity;

// 扩展功能: 直接获取 Framebuffer 当前像素值, 详见 https://git.corp.kuaishou.com/facemagic/starlight/-/blob/develop/docs/GetLastFragColor.md
// 如无需使用, 删除此行以及用到了 cgeLastFragColor 的相关代码即可
layout(binding = 3) uniform vec4 cgeLastFragColor;
layout(binding = 1) uniform sampler2D textureMix;
layout(location = 0) in highp vec2 texCoord;
layout(location = 0) out highp vec4 fragColor;

void main()
{
    vec4 colorMix = texture(textureMix, texCoord);
    fragColor = mix(cgeLastFragColor, colorMix, intensity);
}
