#version 310 es
precision highp float;
layout(location = 0) in vec2 position;
layout(location = 0) out vec2 texCoord;
void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
    texCoord = (position * 0.5) + 0.5;
}