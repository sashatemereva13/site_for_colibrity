export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform float uOpacity;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uMouse;
  varying vec2 vUv;

  const vec3 outlineColor = vec3(0.9);
  const vec3 glowTint = vec3(1.0, 0.5, 0.2);
  const int COUNT = 6;

vec2 positions[COUNT] = vec2[](
  vec2(0.2, 0.4),  // far left
  vec2(0.8, 0.4),  // far right
  vec2(0.5, 0.5),  // center
  vec2(0.3, 0.8),  // upper left
  vec2(0.7, 0.8),  // upper right
  vec2(0.5, 0.2)   // bottom center
);



  float getPetals(int i) {
    if (i == 0) return 6.0;
    if (i == 1) return 7.0;
    if (i == 2) return 5.0;
    if (i == 3) return 8.0;
    if (i == 4) return 6.0;
    return 9.0;
  }

  float flowerOutline(float dist, float angle, float petals, float radius, float thickness) {
    float petalShape = abs(sin(petals * angle + uScroll * 6.0));
    float r = radius * mix(1.0, petalShape, 0.6);
    return smoothstep(r - thickness, r, dist) - smoothstep(r, r + thickness, dist);
  }

  void main() {
    vec2 uv = vUv;
    float radius = 0.18;
    float thickness = 0.008;
    float visibility = smoothstep(0.2, 0.01, distance(uv, uMouse));

    vec3 base = vec3(0);
    vec3 glowColor = vec3(0);
    float total = 0.0;

    for (int i = 0; i < COUNT; i++) {
      vec2 center = positions[i];
      float petals = getPetals(i);

      vec2 toUV = uv - center;
      float angle = atan(toUV.y, toUV.x);
      float dist = length(toUV);

      float f = flowerOutline(dist, angle, petals, radius, thickness) * visibility;
      float g = smoothstep(0.12, 0.0, dist) * visibility;

      total += f;
      base += outlineColor * f;
      glowColor += glowTint * g;
    }

    vec3 finalColor = base + glowColor;
    gl_FragColor = vec4(finalColor, total * uOpacity);
  }
`;
