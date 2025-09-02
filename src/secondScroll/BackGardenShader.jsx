// BackGardenShader.jsx
export const vertexShader = `
  varying vec2 vUv;
  void main () {
    vUv = uv;
    // Fullscreen quad in clip space (your plane should be [-1..1] x [-1..1])
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = `
  precision highp float;

  uniform float     uOpacity;     // global alpha
  uniform float     uTime;        // seconds
  uniform vec2      uResolution;  // viewport px
  uniform vec2      uTile;        // repeats across screen (x,y)
  uniform vec3      uTint;        // line color
  uniform vec2      uOffset;      // px drift
  uniform sampler2D uTrailMap;    // R channel used as mask

  // Tunables
  uniform float uLineWidth;   // logical width of lines (0.001..0.03)
  uniform float uCurvature;   // how much the lines bend (0..1.5)
  uniform float uFlow;        // flow speed multiplier
  uniform float uBands;       // number of bands per tile (e.g. 18.0)

  varying vec2 vUv;

  // --- Hash / Noise (tiny & fast) ---
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    for(int i=0;i<4;i++){
      v += a * noise(p);
      p = mat2(1.6,1.2,-1.2,1.6) * p + 0.5;
      a *= 0.5;
    }
    return v;
  }

  // Anti-aliased line mask around y = f(x)
  float lineAA(float d, float w) {
    // d = signed distance to center line, w = half-width
    float aa = fwidth(d) * 0.75;
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
  }

  void main(){
    // Screen-space UV 0..1 with pixel offset, then tile
    vec2 uv = (gl_FragCoord.xy + uOffset) / uResolution;
    uv = fract(uv * uTile);

    // Build a wavy field so stripes bend organically
    float t = uTime * uFlow;
    vec2 q = uv * 3.0; // base frequency
    float field = fbm(q + vec2(0.0, t*0.15));
    float curl  = fbm(q * 0.5 + vec2(t*0.07, -t*0.05));

    // Make many evenly-spaced bands along x, then bend them with the field
    float bands = uBands;               // e.g. 18.0 lines per tile
    float x     = uv.x * bands;
    float bend  = (field * 2.0 - 1.0) * uCurvature; // -curv..+curv
    float yLine = fract(x + bend);      // 0..1 sawtooth -> repeating lines

    // Distance from current y to nearest line center at y = 0
    // Shift with curl so lines feel alive
    float d = (uv.y + curl*0.03) - yLine;
    // Wrap distance into [-0.5, 0.5] in the repeating space
    d = abs(d - round(d));

    // Anti-aliased line mask
    float lineMask = lineAA(d, uLineWidth);

    // Gentle extra modulation so some lines pulse
    float pulse = 0.6 + 0.4 * sin( (uv.x + uv.y)*10.0 + t*1.2 );

    // Trail mask (R channel)
    float trail = texture2D(uTrailMap, (gl_FragCoord.xy)/uResolution).r;

    // Final alpha and color
    float alpha = lineMask * pulse * trail * uOpacity;

    // Color: tint on lines, very dark background keeps it subtle
    vec3 bg   = vec3(0.02, 0.02, 0.04);
    vec3 col  = mix(bg, uTint, lineMask);

    gl_FragColor = vec4(col, alpha);
  }
`;
