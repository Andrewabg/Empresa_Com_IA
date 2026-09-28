'use client'

import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl'
import { useReducedMotion } from '@/lib/motion'



export type OrbState = 'idle' | 'listening' | 'thinking' | 'acting' | 'searching'

export interface VoiceOrbProps {
  
  amplitude?: number
  
  state?: OrbState
  className?: string
}

const vert =  `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`




const frag =  `
  precision highp float;

  uniform float iTime;
  uniform vec3  iResolution;
  uniform float uReact;   // voice energy 0..~1.5 (drives ripples / turbulence / brightness)
  uniform float uBright;  // per-state brightness multiplier
  uniform float rot;      // slow rotation
  uniform vec3  bg;       // page background (#0A0B0D)
  varying vec2 vUv;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
    vec4 n = h*h*h*h * vec4(dot(d0,hash33(i)), dot(d1,hash33(i+i1)), dot(d2,hash33(i+i2)), dot(d3,hash33(i+1.0)));
    return dot(vec4(31.316), n);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * snoise3(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  const vec3 AQUA   = vec3(0.157, 0.878, 0.784); // #28E0C8
  const vec3 VIOLET = vec3(0.486, 0.361, 1.000); // #7C5CFF
  const vec3 CORE   = vec3(0.62, 0.42, 1.00);    // núcleo violeta-magenta quente

  void main() {
    vec2 frag = vUv * iResolution.xy;
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (frag - center) / size * 2.0;

    float len = length(uv);
    float R = 0.62;

    // Campo ROTACIONADO só pro plasma/varredura — a LUZ fica fixa na tela, então o
    // brilho glossy não gira junto (lê como plasma girando dentro de uma casca).
    float sr = sin(rot), cr = cos(rot);
    vec2 ruv = vec2(cr * uv.x - sr * uv.y, sr * uv.x + cr * uv.y);

    // Esfera fake-3D: altura z>0 dentro do disco → normal de esfera na tela, dá VOLUME.
    float z = sqrt(max(R * R - len * len, 0.0)) / R;   // 1 no centro -> 0 na borda
    vec3 N = normalize(vec3(uv / R, z + 0.001));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.85));        // luz-chave: cima-esquerda
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);

    float ndl  = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 90.0);       // glint glossy PEQUENO (não um borrão branco)
    // IMPORTANTE: FORA da esfera z=0 → pow(1.0-0.0, 3.0)=1.0; sem máscara o fresnel
    // pinta o QUADRO inteiro (o "fundo teal" bugado). Mascaramos pra valer só dentro
    // da silhueta (com AA na borda).
    float inside = 1.0 - smoothstep(R - 0.012, R + 0.012, len);
    float fres = pow(1.0 - z, 3.0) * inside;           // rim fresnel FINO na silhueta

    // Interior vivo: fbm com domain-warp (no campo rotacionado).
    vec3 pp = vec3(ruv * 1.7, iTime * 0.28);
    float warp = fbm(pp + vec3(fbm(pp) * 0.7));
    float energy = warp * 0.5 + 0.5;                   // 0..1

    // Máscaras: disco com borda mais NÍTIDA, núcleo quente, halo externo APERTADO.
    float disk = smoothstep(R, R * 0.95, len);         // 1 dentro -> 0 fora
    float core = pow(smoothstep(R * 0.62, 0.0, len), 2.0);
    float halo = exp(-max(len - R, 0.0) * 7.0);

    // Ripples de voz emanando (só com uReact).
    float ripple = sin(len * 18.0 - iTime * 3.2) * 0.5 + 0.5;
    ripple *= smoothstep(R * 1.1, R * 0.25, len);
    ripple *= uReact;

    // ── Cor: corpo PROFUNDO e saturado (não um marble pastel) ──────────────
    // borda = teal/indigo fundo · meio = teal · núcleo = violeta-magenta quente.
    float radial = clamp(1.0 - len / R, 0.0, 1.0);     // 1 no centro -> 0 na borda
    float ang = atan(ruv.y, ruv.x);
    float sweep = sin(ang + iTime * 0.4) * 0.5 + 0.5;
    float mixv = clamp(0.18 + radial * 0.52 + energy * 0.18 + sweep * 0.08, 0.0, 1.0);
    vec3 col = mix(AQUA, VIOLET, mixv);
    col = mix(col, CORE, core * 0.75);                 // coração quente bem no centro

    // ── Emissivo: BRILHA do centro e escurece pra borda (orb VIVA, não bola
    // fosca iluminada). ndl entra só como leve modelagem direcional. ─────────
    float glow   = pow(smoothstep(R, R * 0.04, len), 1.5); // 1 centro -> 0 borda
    float shade  = 0.72 + 0.28 * ndl;                      // forma sutil, sem achatar
    float plasma = 0.62 + 0.38 * energy;
    float coreGlow = pow(smoothstep(R * 0.5, 0.0, len), 2.2); // núcleo quente apertado

    float bodyLum = disk * glow * shade * plasma;
    float intensity = bodyLum * 1.25 + coreGlow * 0.7 + fres * 1.15 + ripple * 0.5;
    intensity *= uBright * (1.0 + uReact * 0.6);

    // Aprofunda a borda: longe do centro a cor cai pra um teal/indigo escuro,
    // deixando o rim fresnel e o núcleo "estourarem" por contraste.
    col = mix(col * 0.42, col, glow);

    vec3 finalCol = col * intensity;
    finalCol += vec3(0.85, 0.95, 1.0) * spec * disk * (0.5 * uBright);            // glint pequeno e frio
    finalCol += mix(AQUA, VIOLET, 0.55) * halo * (0.22 + uReact * 0.5) * uBright; // halo de marca

    // Tone-map com MENOS exposição → preserva saturação (menos lavado).
    finalCol = vec3(1.0) - exp(-finalCol * 1.05);

    // Dither sutil mata o banding.
    finalCol += hash33(vec3(frag, iTime)).x * (1.0 / 255.0);

    float alpha = clamp(disk * (0.5 + bodyLum) + fres * 1.1 + halo * 0.55 + ripple * 0.4, 0.0, 1.0);

    // Saída premultiplicada (mesma convenção do orb original que renderizava certo).
    gl_FragColor = vec4(finalCol * alpha, alpha);
  }
`

function hexToVec3(hex: string): Vec3 {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return new Vec3(r, g, b)
}

const BG = '#0A0B0D'


function targetsFor(state: OrbState, amp: number) {
  
  const a = Math.max(0, Math.min(1, amp))
  switch (state) {
    case 'listening':
      
      return { react: 0.4 + a * 1.4, bright: 1.05 + a * 0.5, scale: 1.0 + a * 0.1, timeScale: 1.0 + a * 0.8 }
    case 'searching':
      
      
      
      return { react: 0.55, bright: 1.05, scale: 1.0, timeScale: 1.7 }
    case 'thinking':
      
      return { react: 0.25, bright: 1.0, scale: 1.0, timeScale: 1.4 }
    case 'acting':
      
      return { react: 0.7, bright: 1.2, scale: 1.04, timeScale: 1.3 }
    case 'idle':
    default:
      
      return { react: 0.0, bright: 1.0, scale: 1.0, timeScale: 0.55 }
  }
}

export function VoiceOrb({ amplitude = 0, state = 'idle', className }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion() ?? false
  const ctnDom = useRef<HTMLDivElement>(null)

  
  const ampRef = useRef(amplitude)
  const stateRef = useRef<OrbState>(state)
  ampRef.current = amplitude
  stateRef.current = state

  useEffect(() => {
    const container = ctnDom.current
    if (!container) return

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    container.appendChild(gl.canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
        },
        uReact: { value: 0 },
        rot: { value: 0 },
        uBright: { value: 1.0 },
        bg: { value: hexToVec3(BG) },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    function resize() {
      if (!container) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(Math.max(1, width * dpr), Math.max(1, height * dpr))
      gl.canvas.style.width = width + 'px'
      gl.canvas.style.height = height + 'px'
      program.uniforms.iResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height,
      )
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    
    if (reducedMotion) {
      
      const tgt = targetsFor('idle', 0)
      program.uniforms.iTime.value = 1.5 
      program.uniforms.uReact.value = tgt.react
      program.uniforms.uBright.value = tgt.bright
      program.uniforms.rot.value = 0
      renderer.render({ scene: mesh })
      return () => {
        ro.disconnect()
        if (gl.canvas.parentNode === container) container.removeChild(gl.canvas)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    }

    
    let rafId = 0
    let lastTime = 0
    let timeAccum = 0 
    let currentRot = 0
    
    let curReact = 0
    let curBright = 1.0
    let curScale = 1.0
    const rotationSpeed = 0.18

    const update = (t: number) => {
      rafId = requestAnimationFrame(update)
      const dt = lastTime === 0 ? 0 : (t - lastTime) * 0.001
      lastTime = t

      const tgt = targetsFor(stateRef.current, ampRef.current)

      
      curReact += (tgt.react - curReact) * 0.12
      curBright += (tgt.bright - curBright) * 0.1
      curScale += (tgt.scale - curScale) * 0.12

      
      timeAccum += dt * tgt.timeScale

      
      const breath = 0.96 + 0.04 * Math.sin(timeAccum * 0.8)

      program.uniforms.iTime.value = timeAccum
      program.uniforms.uReact.value = curReact
      program.uniforms.uBright.value = curBright * breath

      
      currentRot += dt * rotationSpeed * tgt.timeScale
      program.uniforms.rot.value = currentRot

      
      gl.canvas.style.transform = `scale(${curScale.toFixed(4)})`

      renderer.render({ scene: mesh })
    }
    gl.canvas.style.transformOrigin = 'center center'
    gl.canvas.style.willChange = 'transform'
    rafId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [reducedMotion])

  
  
  
  const a = Math.max(0, Math.min(1, amplitude))
  const bloomOpacity = reducedMotion ? 0.55 : 0.42 + a * 0.4
  const bloomScale = reducedMotion ? 1 : 1 + a * 0.12

  return (
    <div
      className={className}
      aria-hidden
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: bloomOpacity,
          transform: `scale(${bloomScale})`,
          transformOrigin: 'center center',
          transition: reducedMotion ? 'none' : 'opacity 180ms ease, transform 180ms ease',
          background:
            'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--wave-from) 22%, transparent), transparent 60%),' +
            'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--wave-to) 20%, transparent), transparent 72%)',
          filter: 'blur(2px)',
        }}
      />
      {}
      <div
        ref={ctnDom}
        style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default VoiceOrb
