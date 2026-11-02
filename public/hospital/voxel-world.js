import * as THREE from 'three';

const textureCache = new Map();
const materialCache = new Map();
const boxGeoCache = new Map();

export function getBoxGeo(w, h, d) {
  const key = `${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)}`;
  if (!boxGeoCache.has(key)) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const norm = geo.attributes.normal;
    const colors = new Float32Array(norm.count * 3);
    // Authentic Minecraft directional face shading: Top=1.0, Z=0.88, X=0.73, Bottom=0.58
    for (let i = 0; i < norm.count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const shade = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.58 : Math.abs(nx) > 0.5 ? 0.74 : 0.88;
      // Convert sRGB shade to linear for Three.js attribute
      const lin = Math.pow(shade, 2.2);
      colors[i * 3] = lin;
      colors[i * 3 + 1] = lin;
      colors[i * 3 + 2] = lin;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    boxGeoCache.set(key, geo);
  }
  return boxGeoCache.get(key);
}

// Creates a crisp 16x16 (or custom size) pixel-art texture with NearestFilter
export function makePixelTexture(key, drawFn, size = 16) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function shadeHex(hex, factor) {
  const c = new THREE.Color(hex);
  c.r = THREE.MathUtils.clamp(c.r * factor, 0, 1);
  c.g = THREE.MathUtils.clamp(c.g * factor, 0, 1);
  c.b = THREE.MathUtils.clamp(c.b * factor, 0, 1);
  return '#' + c.getHexString();
}

// Crisp voxel block texture presets (16x16 pixel art)
export function getBlockTexture(kind, baseHex = '#ffffff', accentHex = '#cbd5e1') {
  const key = `block:${kind}:${baseHex}:${accentHex}`;
  return makePixelTexture(key, (ctx, s) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, s, s);

    if (kind === 'quartz') {
      // Crisp quartz block with subtle pixel bevel
      ctx.fillStyle = shadeHex(baseHex, 1.06);
      ctx.fillRect(0, 0, s, 1);
      ctx.fillRect(0, 0, 1, s);
      ctx.fillStyle = shadeHex(baseHex, 0.91);
      ctx.fillRect(0, s - 1, s, 1);
      ctx.fillRect(s - 1, 0, 1, s);
      ctx.fillStyle = shadeHex(baseHex, 0.96);
      ctx.fillRect(2, 2, 1, 1);
      ctx.fillRect(12, 5, 1, 1);
      ctx.fillRect(5, 11, 1, 1);
    } else if (kind === 'tiles') {
      // 2x2 checkered hospital floor tiles
      const half = s / 2;
      ctx.fillStyle = accentHex;
      ctx.fillRect(half, 0, half, half);
      ctx.fillRect(0, half, half, half);
      ctx.fillStyle = shadeHex(baseHex, 0.88);
      ctx.fillRect(0, half - 1, s, 1);
      ctx.fillRect(half - 1, 0, 1, s);
    } else if (kind === 'planks') {
      // Crisp Minecraft wood planks
      for (let y = 0; y < s; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? baseHex : shadeHex(baseHex, 0.94);
        ctx.fillRect(0, y, s, 3);
        ctx.fillStyle = shadeHex(baseHex, 0.82);
        ctx.fillRect(0, y + 3, s, 1);
        const joint = (y * 3 + 5) % s;
        ctx.fillRect(joint, y, 1, 3);
      }
    } else if (kind === 'bricks') {
      for (let y = 0; y < s; y += 4) {
        ctx.fillStyle = shadeHex(baseHex, 0.82);
        ctx.fillRect(0, y + 3, s, 1);
        const offset = (y / 4) % 2 === 0 ? 0 : 4;
        for (let x = offset; x < s; x += 8) {
          ctx.fillRect(x, y, 1, 3);
        }
      }
    } else if (kind === 'glass') {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = baseHex;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(1, 1, s - 2, s - 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = accentHex;
      ctx.fillRect(0, 0, s, 1);
      ctx.fillRect(0, s - 1, s, 1);
      ctx.fillRect(0, 0, 1, s);
      ctx.fillRect(s - 1, 0, 1, s);
      // Crisp diagonal glass streak pixels
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(2, 4, 2, 1);
      ctx.fillRect(11, 11, 2, 1);
      ctx.globalAlpha = 1;
    } else if (kind === 'lantern') {
      ctx.fillStyle = '#e0f7fa';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#4dd0e1';
      ctx.fillRect(0, 0, s, 2);
      ctx.fillRect(0, s - 2, s, 2);
      ctx.fillRect(0, 0, 2, s);
      ctx.fillRect(s - 2, 0, 2, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, s - 8, s - 8);
    } else if (kind === 'bookshelf') {
      ctx.fillStyle = '#b8864c';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#785127';
      ctx.fillRect(0, 0, s, 2);
      ctx.fillRect(0, 7, s, 2);
      ctx.fillRect(0, 14, s, 2);
      const colors = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#9b5de5', '#06d6a0'];
      for (let row = 0; row < 2; row++) {
        const y = row === 0 ? 2 : 9;
        for (let x = 1; x < 15; x += 2) {
          ctx.fillStyle = colors[(x + row * 3) % colors.length];
          ctx.fillRect(x, y, 2, 5);
        }
      }
    } else if (kind === 'grass') {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const n = ((x * 37 + y * 13) % 7) - 3;
          ctx.fillStyle = shadeHex(baseHex, 1 + n * 0.025);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (kind === 'leaves') {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const dark = (x + y * 2) % 3 === 0;
          ctx.fillStyle = dark ? shadeHex(baseHex, 0.82) : shadeHex(baseHex, 1.06);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

export function getVoxelMaterial({
  color = '#ffffff',
  pattern = 'quartz',
  accent = '#cbd5e1',
  emissive = null,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1
} = {}) {
  const key = `${color}|${pattern}|${accent}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}`;
  if (materialCache.has(key)) return materialCache.get(key);

  if (pattern === 'glass' || transparent) {
    const map = pattern === 'glass' ? getBlockTexture('glass', color, accent) : null;
    const mat = new THREE.MeshLambertMaterial({
      color: pattern === 'glass' ? '#ffffff' : color,
      map,
      transparent: true,
      opacity: pattern === 'glass' ? 0.9 : opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    materialCache.set(key, mat);
    return mat;
  }

  const map = pattern ? getBlockTexture(pattern, color, accent) : null;
  const mat = new THREE.MeshLambertMaterial({
    color: map ? '#ffffff' : color,
    map,
    vertexColors: true,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity
  });
  materialCache.set(key, mat);
  return mat;
}

export function addVoxelBox(parent, w, h, d, x, y, z, matOptions = {}) {
  const opts = typeof matOptions === 'string' ? { color: matOptions } : matOptions;
  const mesh = new THREE.Mesh(getBoxGeo(w, h, d), getVoxelMaterial(opts));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Configures crisp Minecraft daylight + indoor hospital illumination on any scene
export function setupCrispMinecraftLighting(scene, { skyColor = '#87cefa' } = {}) {
  scene.background = new THREE.Color(skyColor);

  const oldLights = [];
  scene.traverse(obj => {
    if (obj.isLight) oldLights.push(obj);
  });
  oldLights.forEach(l => l.parent?.remove(l));

  // Crisp sky/ground hemisphere light
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9dc183, 1.35);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  // Main sun directional light (gives top=1.0, front=0.88, side=0.72 face contrast)
  const sun = new THREE.DirectionalLight(0xfffdf5, 1.25);
  sun.position.set(24, 48, -32);
  scene.add(sun);

  // Warm indoor bounce directional light from front-left so interiors are bright & crisp
  const fill = new THREE.DirectionalLight(0xeef7ff, 0.65);
  fill.position.set(-20, 22, -18);
  scene.add(fill);

  // Back rim light so south-facing surfaces also read clearly
  const back = new THREE.DirectionalLight(0xdbeafe, 0.45);
  back.position.set(10, 28, 35);
  scene.add(back);
}

// Role palettes for crisp Minecraft hospital characters
const ROLE_STYLES = {
  'doctor-chief': {
    skin: '#f4c29f',
    hair: '#2b1e16',
    eyes: '#1d4ed8',
    coat: '#f8fafc',
    shirt: '#0284c7',
    tie: '#dc2626',
    pants: '#1e293b',
    shoes: '#0f172a',
    stethoscope: true,
    badgeColor: '#ef4444',
    hairStyle: 'parted',
    prop: 'clipboard'
  },
  'white-staff': {
    skin: '#f1bfa0',
    hair: '#3f2e21',
    eyes: '#0f766e',
    coat: '#ffffff',
    shirt: '#0ea5e9',
    tie: '#2563eb',
    pants: '#1e3a5f',
    shoes: '#111827',
    stethoscope: true,
    badgeColor: '#0284c7',
    hairStyle: 'parted',
    prop: 'clipboard'
  },
  'room-nurse': {
    skin: '#f5cba7',
    hair: '#5c3317',
    eyes: '#047857',
    coat: '#0d9488',
    shirt: '#ccfbf1',
    tie: null,
    pants: '#0f766e',
    shoes: '#f8fafc',
    stethoscope: true,
    badgeColor: '#f59e0b',
    nurseCap: true,
    hairStyle: 'long',
    prop: 'tray'
  },
  'red-staff': {
    skin: '#e0a97f',
    hair: '#1c1917',
    eyes: '#1e293b',
    coat: '#dc2626',
    shirt: '#fef08a',
    tie: null,
    pants: '#1e293b',
    shoes: '#090d16',
    stethoscope: false,
    badgeColor: '#facc15',
    reflectiveStripe: true,
    hairStyle: 'short',
    prop: 'scanner'
  },
  'pharmacist': {
    skin: '#ecc19c',
    hair: '#4a3525',
    eyes: '#065f46',
    coat: '#f8fafc',
    shirt: '#10b981',
    tie: '#047857',
    pants: '#1f2937',
    shoes: '#111827',
    stethoscope: false,
    badgeColor: '#10b981',
    glasses: true,
    hairStyle: 'parted',
    prop: 'vial'
  },
  'surgeon': {
    skin: '#edb88b',
    hair: '#27272a',
    eyes: '#0369a1',
    coat: '#0891b2',
    shirt: '#67e8f9',
    tie: null,
    pants: '#0e7490',
    shoes: '#f1f5f9',
    stethoscope: true,
    scrubCap: '#06b6d4',
     surgicalMask: true,
    badgeColor: '#22d3ee',
    hairStyle: 'short',
    prop: 'clipboard'
  },
  'steve': {
    skin: '#f3c19d',
    hair: '#6b4423',
    eyes: '#2563eb',
    coat: '#38bdf8',
    shirt: '#bae6fd',
    tie: null,
    pants: '#0284c7',
    shoes: '#e2e8f0',
    stethoscope: false,
    patientGown: true,
    hairStyle: 'short',
    prop: null
  },
  'visitor-blue': {
    skin: '#f3c6a5',
    hair: '#292524',
    eyes: '#1d4ed8',
    coat: '#3b82f6',
    shirt: '#eff6ff',
    tie: null,
    pants: '#1e293b',
    shoes: '#334155',
    hairStyle: 'parted',
    prop: 'mug'
  },
  'visitor-amber': {
    skin: '#d99b72',
    hair: '#1c1917',
    eyes: '#451a03',
    coat: '#f59e0b',
    shirt: '#fef3c7',
    tie: null,
    pants: '#374151',
    shoes: '#111827',
    hairStyle: 'long',
    prop: null
  }
};

function makeFaceMaterials(style) {
  const faceKey = `face:${JSON.stringify(style)}`;
  const frontTex = makePixelTexture(faceKey + ':front', ctx => {
    ctx.fillStyle = style.skin;
    ctx.fillRect(0, 0, 8, 8);
    // Hair top
    ctx.fillStyle = style.hair;
    ctx.fillRect(0, 0, 8, 2);
    if (style.hairStyle === 'parted') {
      ctx.fillRect(0, 2, 2, 1);
      ctx.fillRect(6, 2, 1, 1);
    } else if (style.hairStyle === 'long') {
      ctx.fillRect(0, 2, 1, 3);
      ctx.fillRect(7, 2, 1, 3);
    }
    // Scrub cap
    if (style.scrubCap) {
      ctx.fillStyle = style.scrubCap;
      ctx.fillRect(0, 0, 8, 2);
      ctx.fillStyle = shadeHex(style.scrubCap, 0.85);
      ctx.fillRect(0, 2, 8, 1);
    }
    // Eyes (Minecraft 2x1 eyes with white sclera + colored iris)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 3, 2, 1);
    ctx.fillRect(5, 3, 2, 1);
    ctx.fillStyle = style.eyes || '#1d4ed8';
    ctx.fillRect(2, 3, 1, 1);
    ctx.fillRect(5, 3, 1, 1);
    // Eyebrows
    ctx.fillStyle = shadeHex(style.hair, 0.9);
    ctx.fillRect(1, 2, 2, 1);
    ctx.fillRect(5, 2, 2, 1);

    if (style.glasses) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 3, 1, 1);
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(7, 3, 1, 1);
    }

    if (style.surgicalMask) {
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(1, 5, 6, 3);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(1, 6, 6, 1);
    } else {
      // Nose & friendly mouth
      ctx.fillStyle = shadeHex(style.skin, 0.88);
      ctx.fillRect(3, 4, 2, 1);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(3, 6, 2, 1);
    }
  }, 8);

  const sideTex = makePixelTexture(faceKey + ':side', ctx => {
    ctx.fillStyle = style.skin;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = style.hair;
    ctx.fillRect(0, 0, 8, 3);
    ctx.fillRect(0, 3, 3, 3);
    if (style.scrubCap) {
      ctx.fillStyle = style.scrubCap;
      ctx.fillRect(0, 0, 8, 3);
    }
  }, 8);

  const backTex = makePixelTexture(faceKey + ':back', ctx => {
    ctx.fillStyle = style.skin;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = style.hair;
    ctx.fillRect(0, 0, 8, style.hairStyle === 'long' ? 7 : 5);
    if (style.scrubCap) {
      ctx.fillStyle = style.scrubCap;
      ctx.fillRect(0, 0, 8, 4);
    }
  }, 8);

  const topTex = makePixelTexture(faceKey + ':top', ctx => {
    ctx.fillStyle = style.scrubCap || style.hair;
    ctx.fillRect(0, 0, 8, 8);
  }, 8);

  const bottomTex = makePixelTexture(faceKey + ':bottom', ctx => {
    ctx.fillStyle = shadeHex(style.skin, 0.85);
    ctx.fillRect(0, 0, 8, 8);
  }, 8);

  // BoxGeometry material order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
  return [
    new THREE.MeshLambertMaterial({ map: sideTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: sideTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: topTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: bottomTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: frontTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: backTex, vertexColors: true })
  ];
}

function makeTorsoMaterials(style) {
  const key = `torso:${JSON.stringify(style)}`;
  const frontTex = makePixelTexture(key + ':front', ctx => {
    ctx.fillStyle = style.coat;
    ctx.fillRect(0, 0, 8, 12);

    if (style.patientGown) {
      // Sky blue hospital gown with crisp white collar and tie dots
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(2, 0, 4, 2);
      ctx.fillStyle = '#0284c7';
      for (let y = 2; y < 11; y += 3) {
        for (let x = 1; x < 7; x += 3) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 10, 8, 2);
      return;
    }

    // Inner scrub / shirt V-neck
    ctx.fillStyle = style.shirt;
    ctx.fillRect(2, 0, 4, 5);
    if (style.tie) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 0, 4, 9);
      ctx.fillStyle = style.tie;
      ctx.fillRect(3, 1, 2, 7);
    }
    // Coat lapels
    ctx.fillStyle = shadeHex(style.coat, 0.9);
    ctx.fillRect(2, 1, 1, 8);
    ctx.fillRect(5, 1, 1, 8);

    // Reflective stripe for paramedic
    if (style.reflectiveStripe) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 4, 8, 2);
      ctx.fillRect(0, 9, 8, 1);
    }

    // ID Badge / Pocket on chest
    if (style.badgeColor) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 2, 2, 2);
      ctx.fillStyle = style.badgeColor;
      ctx.fillRect(5, 2, 2, 1);
    }

    // Stethoscope pixel art
    if (style.stethoscope) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(1, 0, 1, 5);
      ctx.fillRect(6, 0, 1, 4);
      ctx.fillRect(2, 5, 1, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(2, 7, 2, 2);
      ctx.fillRect(6, 4, 2, 2);
    }
  }, 12);

  const backTex = makePixelTexture(key + ':back', ctx => {
    ctx.fillStyle = style.coat;
    ctx.fillRect(0, 0, 8, 12);
    ctx.fillStyle = shadeHex(style.coat, 0.92);
    ctx.fillRect(3, 1, 2, 10);
    if (style.reflectiveStripe) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 4, 8, 2);
      ctx.fillRect(2, 2, 4, 6);
    }
  }, 12);

  const sideMat = new THREE.MeshLambertMaterial({ color: shadeHex(style.coat, 0.95), vertexColors: true });
  const topMat = new THREE.MeshLambertMaterial({ color: style.shirt, vertexColors: true });
  return [
    sideMat,
    sideMat,
    topMat,
    sideMat,
    new THREE.MeshLambertMaterial({ map: frontTex, vertexColors: true }),
    new THREE.MeshLambertMaterial({ map: backTex, vertexColors: true })
  ];
}

function attachHeldProp(propKind, lowerArm) {
  if (!propKind) return null;
  const propGroup = new THREE.Group();
  propGroup.name = 'held-voxel-prop';
  propGroup.position.set(0, -0.28, 0.14);

  if (propKind === 'clipboard') {
    // Crisp wooden medical clipboard with paper & red cross header
    addVoxelBox(propGroup, 0.22, 0.03, 0.28, 0, 0, 0.08, { color: '#92400e', pattern: null });
    addVoxelBox(propGroup, 0.18, 0.036, 0.23, 0, 0.005, 0.08, { color: '#f8fafc', pattern: null });
    addVoxelBox(propGroup, 0.08, 0.045, 0.04, 0, 0.01, -0.03, { color: '#94a3b8', pattern: null });
    addVoxelBox(propGroup, 0.12, 0.04, 0.03, 0, 0.008, 0.02, { color: '#ef4444', pattern: null });
    addVoxelBox(propGroup, 0.12, 0.04, 0.02, 0, 0.008, 0.08, { color: '#334155', pattern: null });
    addVoxelBox(propGroup, 0.10, 0.04, 0.02, -0.01, 0.008, 0.13, { color: '#64748b', pattern: null });
  } else if (propKind === 'tray') {
    // Stainless steel medical tray with pill bottle and syringe
    addVoxelBox(propGroup, 0.26, 0.03, 0.22, 0, 0, 0.08, { color: '#cbd5e1', pattern: null });
    addVoxelBox(propGroup, 0.06, 0.11, 0.06, -0.06, 0.06, 0.07, { color: '#f97316', pattern: null });
    addVoxelBox(propGroup, 0.065, 0.03, 0.065, -0.06, 0.12, 0.07, { color: '#ffffff', pattern: null });
    addVoxelBox(propGroup, 0.05, 0.09, 0.05, 0.05, 0.05, 0.08, { color: '#06b6d4', pattern: null });
  } else if (propKind === 'vial') {
    // Glowing emerald/cyan medicine potion bottle
    addVoxelBox(propGroup, 0.10, 0.14, 0.10, 0, 0.02, 0.06, { color: '#10b981', emissive: '#059669', emissiveIntensity: 0.35, pattern: null });
    addVoxelBox(propGroup, 0.06, 0.05, 0.06, 0, 0.11, 0.06, { color: '#d97706', pattern: null });
  } else if (propKind === 'scanner') {
    // Handheld diagnostic vitals scanner with glowing cyan screen
    addVoxelBox(propGroup, 0.12, 0.05, 0.20, 0, 0, 0.06, { color: '#1e293b', pattern: null });
    addVoxelBox(propGroup, 0.09, 0.056, 0.11, 0, 0.004, 0.07, { color: '#22d3ee', emissive: '#06b6d4', emissiveIntensity: 0.6, pattern: null });
  } else if (propKind === 'mug') {
    addVoxelBox(propGroup, 0.09, 0.11, 0.09, 0, 0.02, 0.05, { color: '#f8fafc', pattern: null });
    addVoxelBox(propGroup, 0.092, 0.04, 0.092, 0, 0.02, 0.05, { color: '#ef4444', pattern: null });
  }

  lowerArm.add(propGroup);
  return propGroup;
}

// Builds a complete, crisp Minecraft humanoid character matching the exact 11-joint hierarchy
// expected by motion-player.js:
// ['root','torso','head','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftThigh','leftShin','rightThigh','rightShin']
export function buildMinecraftCharacterTemplate(roleKey = 'white-staff') {
  const style = ROLE_STYLES[roleKey] || ROLE_STYLES['white-staff'];

  const actor = new THREE.Group();
  actor.name = `${roleKey}-voxel-actor`;

  const root = new THREE.Group();
  root.name = 'root';
  root.position.set(0, 0.63, 0);
  actor.add(root);

  const torso = new THREE.Group();
  torso.name = 'torso';
  root.add(torso);

  // Torso mesh (0.42 x 0.63 x 0.21, bottom at 0, top at 0.63)
  const torsoMesh = new THREE.Mesh(getBoxGeo(0.42, 0.63, 0.21), makeTorsoMaterials(style));
  torsoMesh.position.set(0, 0.315, 0);
  torso.add(torsoMesh);

  // 3D Lab coat / scrub hem overlay for extra voxel depth
  if (!style.patientGown) {
    addVoxelBox(torso, 0.44, 0.18, 0.225, 0, 0.11, 0, { color: style.coat, pattern: null });
  }

  // Head joint at y = 0.63
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.63, 0);
  torso.add(head);

  const headMesh = new THREE.Mesh(getBoxGeo(0.42, 0.42, 0.42), makeFaceMaterials(style));
  headMesh.position.set(0, 0.21, 0);
  head.add(headMesh);

  // 3D Hair / Nurse Cap / Scrub Cap outer voxel layer
  if (style.nurseCap) {
    addVoxelBox(head, 0.32, 0.10, 0.22, 0, 0.46, 0.04, { color: '#ffffff', pattern: null });
    addVoxelBox(head, 0.08, 0.07, 0.02, 0, 0.46, 0.155, { color: '#ef4444', pattern: null });
  } else if (style.scrubCap) {
    addVoxelBox(head, 0.44, 0.12, 0.44, 0, 0.39, 0, { color: style.scrubCap, pattern: null });
  } else {
    addVoxelBox(head, 0.44, 0.09, 0.44, 0, 0.40, 0, { color: style.hair, pattern: null });
  }

  // Arms
  const upperArmMat = getVoxelMaterial({ color: style.coat, pattern: null });
  const skinMat = getVoxelMaterial({ color: style.skin, pattern: null });

  const leftUpperArm = new THREE.Group();
  leftUpperArm.name = 'leftUpperArm';
  leftUpperArm.position.set(0.315, 0.63, 0);
  torso.add(leftUpperArm);
  const luaMesh = new THREE.Mesh(getBoxGeo(0.21, 0.315, 0.21), upperArmMat);
  luaMesh.position.set(0, -0.1575, 0);
  leftUpperArm.add(luaMesh);

  const leftLowerArm = new THREE.Group();
  leftLowerArm.name = 'leftLowerArm';
  leftLowerArm.position.set(0, -0.315, 0);
  leftUpperArm.add(leftLowerArm);
  const llaMesh = new THREE.Mesh(getBoxGeo(0.20, 0.315, 0.20), skinMat);
  llaMesh.position.set(0, -0.1575, 0);
  leftLowerArm.add(llaMesh);

  const rightUpperArm = new THREE.Group();
  rightUpperArm.name = 'rightUpperArm';
  rightUpperArm.position.set(-0.315, 0.63, 0);
  torso.add(rightUpperArm);
  const ruaMesh = new THREE.Mesh(getBoxGeo(0.21, 0.315, 0.21), upperArmMat);
  ruaMesh.position.set(0, -0.1575, 0);
  rightUpperArm.add(ruaMesh);

  const rightLowerArm = new THREE.Group();
  rightLowerArm.name = 'rightLowerArm';
  rightLowerArm.position.set(0, -0.315, 0);
  rightUpperArm.add(rightLowerArm);
  const rlaMesh = new THREE.Mesh(getBoxGeo(0.20, 0.315, 0.20), skinMat);
  rlaMesh.position.set(0, -0.1575, 0);
  rightLowerArm.add(rlaMesh);

  if (style.prop) {
    attachHeldProp(style.prop, rightLowerArm);
  }

  // Legs
  const thighMat = getVoxelMaterial({ color: style.patientGown ? style.skin : style.pants, pattern: null });
  const shinMat = getVoxelMaterial({ color: style. pants, pattern: null });
  const shoeMat = getVoxelMaterial({ color: style.shoes, pattern: null });

  const leftThigh = new THREE.Group();
  leftThigh.name = 'leftThigh';
  leftThigh.position.set(0.105, 0, 0);
  root.add(leftThigh);
  const ltMesh = new THREE.Mesh(getBoxGeo(0.21, 0.315, 0.21), thighMat);
  ltMesh.position.set(0, -0.1575, 0);
  leftThigh.add(ltMesh);

  const leftShin = new THREE.Group();
  leftShin.name = 'leftShin';
  leftShin.position.set(0, -0.315, 0);
  leftThigh.add(leftShin);
  const lsMesh = new THREE.Mesh(getBoxGeo(0.205, 0.235, 0.205), style.patientGown ? skinMat : shinMat);
  lsMesh.position.set(0, -0.1175, 0);
  leftShin.add(lsMesh);
  const lShoe = new THREE.Mesh(getBoxGeo(0.21, 0.08, 0.23), shoeMat);
  lShoe.position.set(0, -0.275, 0.01);
  leftShin.add(lShoe);

  const rightThigh = new THREE.Group();
  rightThigh.name = 'rightThigh';
  rightThigh.position.set(-0.105, 0, 0);
  root.add(rightThigh);
  const rtMesh = new THREE.Mesh(getBoxGeo(0.21, 0.315, 0.21), thighMat);
  rtMesh.position.set(0, -0.1575, 0);
  rightThigh.add(rtMesh);

  const rightShin = new THREE.Group();
  rightShin.name = 'rightShin';
  rightShin.position.set(0, -0.315, 0);
  rightThigh.add(rightShin);
  const rsMesh = new THREE.Mesh(getBoxGeo(0.205, 0.235, 0.205), style.patientGown ? skinMat : shinMat);
  rsMesh.position.set(0, -0.1175, 0);
  rightShin.add(rsMesh);
  const rShoe = new THREE.Mesh(getBoxGeo(0.21, 0.08, 0.23), shoeMat);
  rShoe.position.set(0, -0.275, 0.01);
  rightShin.add(rShoe);

  return actor;
}

// Builds a crisp Minecraft voxel tree (Oak or Birch)
export function buildVoxelTree(parent, x, y, z, birch = false) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const trunkColor = birch ? '#e2dfd7' : '#6b4423';
  addVoxelBox(g, 0.55, 2.2, 0.55, 0, 1.1, 0, { color: trunkColor, pattern: 'planks' });
  const leafColor = birch ? '#4ade80' : '#22c55e';
  addVoxelBox(g, 2.1, 1.1, 2.1, 0, 2.35, 0, { color: leafColor, pattern: 'leaves' });
  addVoxelBox(g, 1.5, 0.9, 1.5, 0, 3.15, 0, { color: shadeHex(leafColor, 1.08), pattern: 'leaves' });
  addVoxelBox(g, 0.85, 0.6, 0.85, 0, 3.75, 0, { color: shadeHex(leafColor, 1.15), pattern: 'leaves' });
  return g;
}

// Builds a crisp Minecraft Emergency Ambulance with animated flashing beacons
export function buildVoxelAmbulance(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);

  // Wheels
  for (const dx of [-1.1, 1.1]) {
    for (const dz of [-0.78, 0.78]) {
      addVoxelBox(g, 0.55, 0.55, 0.24, dx, 0.28, dz, { color: '#111827', pattern: null });
      addVoxelBox(g, 0.28, 0.28, 0.26, dx, 0.28, dz, { color: '#cbd5e1', pattern: null });
    }
  }
  // Chassis & white body
  addVoxelBox(g, 3.6, 0.25, 1.65, 0, 0.45, 0, { color: '#334155', pattern: null });
  addVoxelBox(g, 2.45, 1.65, 1.68, -0.55, 1.4, 0, { color: '#ffffff', pattern: 'quartz' });
  // Red emergency stripe & cross
  addVoxelBox(g, 2.48, 0.34, 1.70, -0.55, 1.15, 0, { color: '#ef4444', pattern: null });
  addVoxelBox(g, 0.52, 0.16, 1.72, -0.65, 1.68, 0, { color: '#ef4444', pattern: null });
  addVoxelBox(g, 0.16, 0.52, 1.72, -0.65, 1.68, 0, { color: '#ef4444', pattern: null });

  // Front cab & windshield
  addVoxelBox(g, 1.15, 1.25, 1.62, 1.22, 1.2, 0, { color: '#f8fafc', pattern: 'quartz' });
  addVoxelBox(g, 0.15, 0.58, 1.42, 1.76, 1.38, 0, { color: '#38bdf8', pattern: 'glass', accent: '#0284c7' });
  // Headlights
  addVoxelBox(g, 0.08, 0.22, 0.28, 1.81, 0.82, -0.52, { color: '#fef08a', emissive: '#facc15', emissiveIntensity: 0.9, pattern: null });
  addVoxelBox(g, 0.08, 0.22, 0.28, 1.81, 0.82, 0.52, { color: '#fef08a', emissive: '#facc15', emissiveIntensity: 0.9, pattern: null });

  // Flashing roof emergency lightbar
  const beaconRed = addVoxelBox(g, 0.38, 0.22, 0.55, 0.4, 2.32, -0.35, {
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.9,
    pattern: null
  });
  const beaconBlue = addVoxelBox(g, 0.38, 0.22, 0.55, 0.4, 2.32, 0.35, {
    color: '#3b82f6',
    emissive: '#2563eb',
    emissiveIntensity: 0.9,
    pattern: null
  });

  return { group: g, beaconRed, beaconBlue };
}

// Builds a rooftop Minecraft Medical Helicopter with animated rotor
export function buildVoxelHelicopter(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);

  // Skids
  for (const dz of [-0.65, 0.65]) {
    addVoxelBox(g, 2.2, 0.10, 0.12, 0, 0.05, dz, { color: '#334155', pattern: null });
    addVoxelBox(g, 0.12, 0.38, 0.10, -0.55, 0.24, dz, { color: '#475569', pattern: null });
    addVoxelBox(g, 0.12, 0.38, 0.10, 0.55, 0.24, dz, { color: '#475569', pattern: null });
  }
  // Fuselage
  addVoxelBox(g, 2.1, 1.15, 1.25, 0, 0.95, 0, { color: '#ffffff', pattern: 'quartz' });
  addVoxelBox(g, 2.14, 0.28, 1.28, 0, 0.72, 0, { color: '#ef4444', pattern: null });
  // Red Cross on side
  addVoxelBox(g, 0.42, 0.14, 1.30, -0.1, 1.12, 0, { color: '#ef4444', pattern: null });
  addVoxelBox(g, 0.14, 0.42, 1.30, -0.1, 1.12, 0, { color: '#ef4444', pattern: null });
  // Cockpit glass nose
  addVoxelBox(g, 0.65, 0.85, 1.12, 1.25, 0.92, 0, { color: '#38bdf8', pattern: 'glass', accent: '#0284c7' });
  // Tail boom
  addVoxelBox(g, 1.95, 0.36, 0.36, -1.85, 1.08, 0, { color: '#ef4444', pattern: null });
  addVoxelBox(g, 0.45, 0.78, 0.14, -2.72, 1.35, 0, { color: '#ffffff', pattern: null });

  // Spinning Main Rotor
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.68, 0);
  g.add(rotor);
  addVoxelBox(rotor, 0.24, 0.24, 0.24, 0, 0, 0, { color: '#1e293b', pattern: null });
  addVoxelBox(rotor, 4.4, 0.05, 0.24, 0, 0.08, 0, { color: '#0f172a', pattern: null });
  addVoxelBox(rotor, 0.24, 0.05, 4.4, 0, 0.08, 0, { color: '#0f172a', pattern: null });

  return { group: g, rotor };
}
