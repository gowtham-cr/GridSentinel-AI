/** Shared GLSL helpers: hash, value noise, fbm, rotation. */
export const noiseGLSL = /* glsl */ `
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1.0,0.0)), u.x),
             mix(hash21(i+vec2(0.0,1.0)), hash21(i+vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = m*p; a *= 0.5; }
  return v;
}
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
`;

/** Soft round sprite for gl_PointCoord. */
export const softPointGLSL = /* glsl */ `
float softPoint(){
  float d = length(gl_PointCoord - 0.5);
  float s = 1.0 - smoothstep(0.0, 0.5, d);
  return s*s*s;
}
`;
