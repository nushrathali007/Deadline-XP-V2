import * as THREE from 'three';
import {SoftwareRenderer} from './software-renderer.js';
import {createRig,transitionMotion,plantFeet,ease,mixAngle} from './motion-player.js';
import {wardFloors,journeyForRound,ROOM_OFFSET,STOREY_HEIGHT} from './lift-journey.js';
import {
  addVoxelBox,
  buildMinecraftCharacterTemplate,
  buildVoxelAmbulance,
  buildVoxelHelicopter,
  buildVoxelTree,
  setupCrispMinecraftLighting,
  shadeHex
} from './voxel-world.js';

export function clipHospital(root) {
  return root;
}

export function createHospitalTower({
  scene,
  patientLayer,
  templates,
  motion,
  extra,
  container,
  software,
  onChange
}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setupCrispMinecraftLighting(scene, { skyColor: '#7ec8ff' });

  // Build crisp Minecraft Hospital Campus & Ground Lobby
  const campus = new THREE.Group();
  campus.name = 'minecraft-hospital-campus';
  scene.add(campus);

  // Lush Minecraft Grass Ground & Cobblestone Driveway
  addVoxelBox(campus, 64, 0.5, 56, 1.5, -0.26, -4, { color: '#4ade80', pattern: 'grass' });
  // Asphalt / Stone Ambulance Road & Drop-off Bay
  addVoxelBox(campus, 34, 0.08, 7.5, 1.5, 0.02, -13.2, { color: '#334155', pattern: 'bricks' });
  // White road dashes
  for (let x = -12; x <= 14; x += 4) {
    addVoxelBox(campus, 1.8, 0.09, 0.22, x, 0.03, -13.2, { color: '#f8fafc', pattern: null });
  }
  // Quartz pedestrian walkway to main entrance
  addVoxelBox(campus, 8.5, 0.10, 6.5, 0.5, 0.04, -6.5, { color: '#e2e8f0', pattern: 'tiles', accent: '#cbd5e1' });

  // Outdoor Trees & Planters
  buildVoxelTree(campus, -12.5, 0, -8.5, false);
  buildVoxelTree(campus, -14.0, 0, 1.5, true);
  buildVoxelTree(campus, 14.2, 0, -8.0, true);
  buildVoxelTree(campus, 15.0, 0, 2.2, false);

  // Working Voxel Ambulance parked at Emergency Bay
  const ambulance = buildVoxelAmbulance(campus, -5.8, 0.05, -12.2);

  // Ground Floor Lobby Building (x = -8.5..10.6, y = 0..4, z = -10.8..5.6)
  const lobby = new THREE.Group();
  lobby.name = 'original-hospital-lobby';
  campus.add(lobby);

  // Lobby checkered floor
  addVoxelBox(lobby, 19.2, 0.28, 16.4, 1.05, 0.14, -2.6, {
    color: '#f8fafc',
    pattern: 'tiles',
    accent: '#cbd5e1'
  });
  // Lobby ceiling slab
  addVoxelBox(lobby, 19.4, 0.22, 16.6, 1.05, 3.88, -2.6, { color: '#e2e8f0', pattern: 'quartz' });
  // Back wall & West wall
  addVoxelBox(lobby, 19.2, 3.8, 0.28, 1.05, 1.95, 5.5, { color: '#f1f5f9', pattern: 'quartz' });
  addVoxelBox(lobby, 0.28, 3.8, 16.4, -8.4, 1.95, -2.6, { color: '#f1f5f9', pattern: 'quartz' });
  addVoxelBox(lobby, 0.28, 3.8, 16.4, 10.5, 1.95, -2.6, { color: '#f1f5f9', pattern: 'quartz' });
  // Emerald & Sky accent wainscoting stripe in lobby
  addVoxelBox(lobby, 18.9, 0.28, 0.06, 1.05, 1.15, 5.34, { color: '#0ea5e9', pattern: null });
  addVoxelBox(lobby, 0.06, 0.28, 16.1, -8.24, 1.15, -2.6, { color: '#10b981', pattern: null });

  // Reception & Triage Desk in Lobby Center
  addVoxelBox(lobby, 4.2, 1.05, 1.1, -2.2, 0.78, 1.2, { color: '#0284c7', pattern: 'quartz' });
  addVoxelBox(lobby, 4.4, 0.12, 1.25, -2.2, 1.35, 1.2, { color: '#ffffff', pattern: null });
  // Dual triage computer monitors
  for (const dx of [-3.1, -1.3]) {
    addVoxelBox(lobby, 0.55, 0.42, 0.08, dx, 1.68, 1.05, { color: '#1e293b', pattern: null });
    addVoxelBox(lobby, 0.48, 0.34, 0.09, dx, 1.68, 1.04, {
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.55,
      pattern: null
    });
  }

  // Lobby Waiting Sofas (matching coordinates in people.json so seated NPCs sit flush!)
  function addLobbySofa(x, z, w, d, color = '#0284c7') {
    addVoxelBox(lobby, w, 0.36, d, x, 0.46, z, { color, pattern: null });
    addVoxelBox(lobby, w, 0.48, 0.22, x, 0.82, z + (d > w ? 0 : 0.28), { color: shadeHex(color, 0.88), pattern: null });
  }
  addLobbySofa(5.8, -9.37, 1.6, 0.85, '#0ea5e9');
  addLobbySofa(-1.06, 3.69, 1.8, 0.85, '#10b981');
  addLobbySofa(-1.06, -8.56, 1.8, 0.85, '#0284c7');
  addLobbySofa(-1.06, -5.73, 1.8, 0.85, '#0ea5e9');
  addLobbySofa(-4.72, 0.68, 1.6, 0.85, '#3b82f6');
  addLobbySofa(-2.43, -2.39, 0.85, 0.85, '#f59e0b');
  addLobbySofa(5.32, -2.58, 0.85, 0.85, '#10b981');

  // 24H Pharmacy Counter & Medicine Shelves (x = 8.1, z = -1.5)
  addVoxelBox(lobby, 0.9, 1.05, 3.8, 7.35, 0.78, -1.5, { color: '#10b981', pattern: 'quartz' });
  addVoxelBox(lobby, 1.05, 0.12, 3.95, 7.35, 1.35, -1.5, { color: '#ffffff', pattern: null });
  addVoxelBox(lobby, 0.45, 2.4, 3.6, 9.85, 1.5, -1.5, { color: '#b8864c', pattern: 'bookshelf' });

  // Left Wing Multi-Storey Hospital Facade (x = -8.4..3.0, y = 4..32)
  const westWing = new THREE.Group();
  westWing.name = 'minecraft-west-wing';
  campus.add(westWing);
  for (let f = 1; f <= 7; f++) {
    const fy = f * STOREY_HEIGHT;
    // Floor slab & white quartz facade
    addVoxelBox(westWing, 11.4, 0.24, 6.2, -2.7, fy, 2.5, { color: '#cbd5e1', pattern: 'quartz' });
    addVoxelBox(westWing, 11.2, 3.76, 5.8, -2.7, fy + 1.9, 2.6, { color: '#f8fafc', pattern: 'quartz' });
    // Accent horizontal band per floor
    const bandColor = f === 7 ? '#ef4444' : f % 2 === 0 ? '#0ea5e9' : '#10b981';
    addVoxelBox(westWing, 11.35, 0.26, 5.9, -2.7, fy + 0.35, 2.6, { color: bandColor, pattern: null });
    // Crisp Minecraft Hospital Windows across the front facade
    for (const wx of [-6.6, -4.0, -1.4, 1.1]) {
      addVoxelBox(westWing, 1.65, 2.1, 0.12, wx, fy + 2.05, -0.32, {
        color: '#38bdf8',
        pattern: 'glass',
        accent: '#0284c7'
      });
      // Glowing warm interior light behind window
      addVoxelBox(westWing, 1.4, 0.12, 0.3, wx, fy + 2.95, 0.1, {
        color: '#fef9c3',
        emissive: '#fde047',
        emissiveIntensity: 0.65,
        pattern: 'lantern'
      });
    }
  }
  // Roof parapet & Iconic Giant Minecraft Red Cross Emblem on West Wing
  addVoxelBox(westWing, 11.6, 0.45, 6.4, -2.7, 32.2, 2.5, { color: '#334155', pattern: 'quartz' });
  // Helipad 'H' on Roof (y = 32.45)
  addVoxelBox(westWing, 4.8, 0.08, 4.8, -2.7, 32.46, 2.5, { color: '#475569', pattern: null });
  addVoxelBox(westWing, 0.45, 0.10, 2.6, -3.7, 32.50, 2.5, { color: '#facc15', pattern: null });
  addVoxelBox(westWing, 0.45, 0.10, 2.6, -1.7, 32.50, 2.5, { color: '#facc15', pattern: null });
  addVoxelBox(westWing, 2.0, 0.10, 0.45, -2.7, 32.50, 2.5, { color: '#facc15', pattern: null });
  const helicopter = buildVoxelHelicopter(westWing, -2.7, 32.52, 2.5);

  // Giant Red Cross Emblem mounted on upper facade
  addVoxelBox(westWing, 2.6, 2.6, 0.18, -2.7, 29.8, -0.42, { color: '#ffffff', pattern: 'quartz' });
  addVoxelBox(westWing, 1.8, 0.62, 0.24, -2.7, 29.8, -0.46, {
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.4,
    pattern: null
  });
  addVoxelBox(westWing, 0.62, 1.8, 0.24, -2.7, 29.8, -0.46, {
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.4,
    pattern: null
  });

  // Floor 7 — Patient Room 07 Voxel Architecture (inside patientLayer at y = ROOM_OFFSET)
  const room7 = new THREE.Group();
  room7.name = 'original-glass-room-floor-seven';
  patientLayer.add(room7);
  patientLayer.position.y = ROOM_OFFSET;

  // Room 07 Checkered Floor (local y = 3.625 so world y = 28.0)
  const rFloorY = 3.625;
  addVoxelBox(room7, 4.65, 0.22, 5.65, 8.23, rFloorY - 0.11, 2.7, {
    color: '#f8fafc',
    pattern: 'tiles',
    accent: '#bae6fd'
  });
  // Room 07 Back Wall (z = 5.45) & Right Wall (x = 10.5)
  addVoxelBox(room7, 4.65, 3.8, 0.18, 8.23, rFloorY + 1.9, 5.45, { color: '#f8fafc', pattern: 'quartz' });
  addVoxelBox(room7, 0.18, 3.8, 5.65, 10.5, rFloorY + 1.9, 2.7, { color: '#f8fafc', pattern: 'quartz' });
  // Crisp sky-teal hospital wall bumper rail & headboard panel
  addVoxelBox(room7, 4.5, 0.28, 0.05, 8.23, rFloorY + 1.1, 5.34, { color: '#0ea5e9', pattern: null });
  addVoxelBox(room7, 0.05, 0.28, 5.4, 10.39, rFloorY + 1.1, 2.7, { color: '#0ea5e9', pattern: null });
  // Medical Gas Outlet Panel (O2, Vacuum, Air voxel valves) on back/side wall
  addVoxelBox(room7, 0.95, 0.42, 0.08, 8.28, rFloorY + 1.65, 5.33, { color: '#cbd5e1', pattern: null });
  addVoxelBox(room7, 0.14, 0.18, 0.12, 8.0, rFloorY + 1.65, 5.31, { color: '#22c55e', pattern: null });
  addVoxelBox(room7, 0.14, 0.18, 0.12, 8.28, rFloorY + 1.65, 5.31, { color: '#eab308', pattern: null });
  addVoxelBox(room7, 0.14, 0.18, 0.12, 8.56, rFloorY + 1.65, 5.31, { color: '#0ea5e9', pattern: null });
  // Room 07 Ceiling & Sea Lantern Fixtures
  addVoxelBox(room7, 4.65, 0.18, 5.65, 8.23, rFloorY + 3.85, 2.7, { color: '#e2e8f0', pattern: 'quartz' });
  addVoxelBox(room7, 1.6, 0.08, 0.65, 8.23, rFloorY + 3.74, 2.6, {
    color: '#e0f7fa',
    emissive: '#38bdf8',
    emissiveIntensity: 0.45,
    pattern: 'lantern'
  });
  // Front Glass Wall for "Through the glass" camera view (z = 0.02)
  addVoxelBox(room7, 4.5, 2.6, 0.04, 8.25, rFloorY + 2.35, 0.02, {
    color: '#7dd3fc',
    pattern: 'glass',
    accent: '#0284c7'
  });
  addVoxelBox(room7, 4.5, 0.95, 0.14, 8.25, rFloorY + 0.48, 0.02, { color: '#e2e8f0', pattern: 'quartz' });
  // Medicine Cabinet & Potted Plant in Room 07 corner
  addVoxelBox(room7, 0.85, 1.05, 0.52, 6.65, rFloorY + 0.52, 4.95, { color: '#ffffff', pattern: 'quartz' });
  addVoxelBox(room7, 0.72, 0.32, 0.04, 6.65, rFloorY + 0.76, 4.68, { color: '#0ea5e9', pattern: null });
  addVoxelBox(room7, 0.72, 0.32, 0.04, 6.65, rFloorY + 0.34, 4.68, { color: '#0ea5e9', pattern: null });
  // Visitor Chair in Room 07 (at z = 4.25 where patient sits in Stage 2)
  addVoxelBox(room7, 0.72, 0.14, 0.68, 8.28, rFloorY + 0.44, 4.25, { color: '#0284c7', pattern: null });
  addVoxelBox(room7, 0.72, 0.68, 0.14, 8.28, rFloorY + 0.82, 4.54, { color: '#0369a1', pattern: null });

  const root = new THREE.Group();
  root.name = 'seven-floor-hospital-wing';
  scene.add(root);

  const residents = [];
  const animatedMachines = [];
  const floorGroups = [];
  const signTextures = new Set();
  const shaftLights = [];

  function box(parent, w, h, d, color, x, y, z, transparent = false, pattern = null) {
    return addVoxelBox(parent, w, h, d, x, y, z, {
      color,
      pattern: transparent ? 'glass' : pattern,
      accent: shadeHex(color, 0.82),
      transparent,
      opacity: transparent ? 0.24 : 1
    });
  }

  function sign(parent, text, x, y, z, w = 2.8, h = 0.55, rotation = Math.PI, sub = '', accent = '#0ea5e9') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    function draw(label, detail = sub) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 768, 192);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 760, 184);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 22, 192);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = `bold ${label.length > 23 ? 38 : label.length > 16 ? 46 : 56}px monospace`;
      ctx.fillText(label.toUpperCase(), 392, detail ? 88 : 116, 700);
      if (detail) {
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(detail.toUpperCase(), 392, 148, 700);
      }
      texture.needsUpdate = true;
    }
    draw(text);
    texture.userData.wardSign = true;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    parent.add(mesh);
    signTextures.add(texture);
    return { draw, texture };
  }

  function plant(parent, x, z) {
    box(parent, 0.42, 0.44, 0.42, '#b45309', x, 0.22, z);
    box(parent, 0.14, 0.75, 0.14, '#78350f', x, 0.78, z);
    for (const [dx, dy, dz] of [
      [0, 1.28, 0],
      [-0.24, 1.08, 0.08],
      [0.24, 1.04, -0.12]
    ]) {
      addVoxelBox(parent, 0.52, 0.48, 0.52, x + dx, dy, z + dz, { color: '#22c55e', pattern: 'leaves' });
    }
  }

  function chair(parent, x, z, color, turn = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = turn;
    parent.add(g);
    box(g, 0.72, 0.18, 0.72, color, 0, 0.46, 0);
    box(g, 0.72, 0.76, 0.15, shadeHex(color, 0.88), 0, 0.9, 0.32);
    for (const dx of [-0.27, 0.27]) {
      box(g, 0.1, 0.48, 0.1, '#334155', dx, 0.23, -0.22);
      box(g, 0.1, 0.48, 0.1, '#334155', dx, 0.23, 0.25);
      box(g, 0.12, 0.12, 0.68, '#e2e8f0', dx, 0.74, 0);
    }
    return g;
  }

  function cabinet(parent, x, z, accent) {
    box(parent, 0.9, 0.94, 0.55, '#f8fafc', x, 0.47, z, false, 'quartz');
    box(parent, 0.95, 0.08, 0.6, '#cbd5e1', x, 0.97, z);
    for (const y of [0.28, 0.66]) {
      box(parent, 0.75, 0.27, 0.03, accent, x, y, z - 0.29);
      box(parent, 0.25, 0.04, 0.04, '#ffffff', x, y, z - 0.315);
    }
  }

  function bed(parent, x, z, accent) {
    box(parent, 1.08, 0.28, 2.05, '#f8fafc', x, 0.5, z, false, 'quartz');
    box(parent, 1.02, 0.14, 1.92, accent, x, 0.71, z);
    box(parent, 0.82, 0.15, 0.42, '#ffffff', x, 0.85, z + 0.65);
    box(parent, 1.15, 0.45, 0.1, '#cbd5e1', x, 0.88, z + 0.98);
    // Red cross on headboard
    box(parent, 0.28, 0.1, 0.12, '#ef4444', x, 0.92, z + 0.97);
    box(parent, 0.1, 0.28, 0.12, '#ef4444', x, 0.92, z + 0.97);
    for (const dx of [-0.44, 0.44]) {
      for (const dz of [-0.82, 0.82]) {
        box(parent, 0.1, 0.4, 0.1, '#475569', x + dx, 0.2, z + dz);
      }
    }
  }

  function screen(parent, x, z, accent) {
    box(parent, 0.12, 1.3, 0.12, '#64748b', x, 0.65, z);
    box(parent, 0.7, 0.52, 0.14, '#0f172a', x, 1.4, z);
    const s = sign(parent, 'HR 78 · 98%', x, 1.4, z - 0.08, 0.58, 0.36, Math.PI, 'NORMAL SINUS', accent);
    return s;
  }

  function cart(parent, x, z, accent) {
    box(parent, 0.72, 0.9, 0.55, accent, x, 0.55, z);
    box(parent, 0.82, 0.08, 0.63, '#f8fafc', x, 1.04, z);
    for (const dx of [-0.26, 0.26]) {
      for (const dz of [-0.2, 0.2]) {
        box(parent, 0.14, 0.14, 0.14, '#1e293b', x + dx, 0.1, z + dz);
      }
    }
    box(parent, 0.16, 0.32, 0.14, '#ffffff', x - 0.18, 1.23, z);
    box(parent, 0.19, 0.22, 0.16, '#38bdf8', x + 0.15, 1.18, z);
  }

  // Helper to spawn a crisp voxel character rig for any role
  function spawnCharacter(roleKey) {
    const customTemplate = buildMinecraftCharacterTemplate(roleKey);
    return createRig(customTemplate);
  }

  function buildWard(profile) {
    const group = new THREE.Group();
    group.position.y = profile.floor * STOREY_HEIGHT;
    group.name = `floor-${profile.floor}-${profile.name}`;
    root.add(group);
    floorGroups.push(group);

    // Structural slab + Crisp checkered department floor tiles
    box(group, 4.65, 0.18, 5.65, '#334155', 8.23, -0.09, 2.7, false, 'quartz');
    addVoxelBox(group, 4.45, 0.06, 5.45, 8.23, 0.035, 2.7, {
      color: '#ffffff',
      pattern: 'tiles',
      accent: profile.floorColor
    });

    // Crisp White Quartz Back & Side Walls with Department Accent Band
    box(group, 4.6, 3.7, 0.15, profile.wall, 8.23, 1.85, 5.45, false, 'quartz');
    box(group, 0.15, 3.7, 5.6, profile.wall, 10.5, 1.85, 2.7, false, 'quartz');
    box(group, 0.04, 0.32, 5.3, profile.accent, 10.4, 1.1, 2.7);
    box(group, 4.4, 0.32, 0.06, profile.accent, 8.23, 1.1, 5.35);

    sign(group, profile.name, 10.39, 2.5, 2.7, 2.6, 0.65, -Math.PI / 2, `FLOOR ${profile.floor}`, profile.accent);
    box(group, 4.65, 0.15, 5.65, '#e2e8f0', 8.23, 3.84, 2.7, false, 'quartz');

    // Front cutaway frame & clear glass railing
    box(group, 0.16, 3.7, 0.16, '#1e293b', 6.0, 1.85, 0.02);
    box(group, 0.16, 3.7, 0.16, '#1e293b', 10.5, 1.85, 0.02);
    box(group, 4.5, 0.12, 0.12, profile.accent, 8.25, 1.0, 0.03);
    box(group, 4.5, 2.5, 0.03, '#7dd3fc', 8.25, 2.35, 0.02, true);

    // Sea Lantern ceiling light
    addVoxelBox(group, 1.5, 0.08, 0.6, 8.2, 3.72, 2.6, {
      color: '#e0f7fa',
      emissive: '#38bdf8',
      emissiveIntensity: 0.45,
      pattern: 'lantern'
    });

    sign(group, profile.name, 8.2, 3.13, -0.09, 3.9, 0.54, Math.PI, `FLOOR ${profile.floor}`, profile.accent);
    sign(group, profile.name, 6.09, 2.95, 2.7, 2.8, 0.55, -Math.PI / 2, `WARD 0${profile.floor}`, profile.accent);

    // Specialty-specific working machines & multi-character activities!
    if (profile.kind === 'lounge') {
      // Psychiatry & Consultation Lounge: Bookshelves, Voxel Aquarium with swimming fish, 2 characters talking
      for (const [x, z, turn] of [
        [7.1, 3.8, Math.PI],
        [9.25, 3.8, Math.PI],
        [9.25, 1.5, 0]
      ]) {
        chair(group, x, z, profile.accent, turn);
      }
      addVoxelBox(group, 1.6, 1.9, 0.45, 9.5, 0.95, 5.05, { color: '#b8864c', pattern: 'bookshelf' });
      // Voxel Aquarium with animated fish
      box(group, 1.1, 0.65, 0.55, '#1e293b', 8.15, 0.35, 2.6);
      box(group, 1.04, 0.55, 0.5, '#38bdf8', 8.15, 0.88, 2.6, true);
      const fish = box(group, 0.18, 0.12, 0.08, '#f97316', 8.15, 0.88, 2.6);
      animatedMachines.push(t => {
        fish.position.x = 8.15 + Math.sin(t * 2.2) * 0.32;
        fish.rotation.y = Math.cos(t * 2.2) >= 0 ? 0 : Math.PI;
      });
      plant(group, 6.55, 4.8);
      sign(group, 'PSYCHIATRY LOUNGE', 8.0, 2.35, 5.35, 2.5, 0.6, Math.PI, 'THERAPY IN SESSION', profile.accent);
    } else if (profile.kind === 'dialysis') {
      // Nephrology Dialysis Bay: Twin Dialysis Machines with spinning blood-pump rotors
      for (const z of [1.55, 4.0]) {
        chair(group, 8.35, z, profile.accent, -Math.PI / 2);
        box(group, 0.58, 1.55, 0.52, '#f8fafc', 9.65, 0.78, z, false, 'quartz');
        box(group, 0.46, 0.4, 0.04, '#0284c7', 9.65, 1.2, z - 0.27);
        const rotor = box(group, 0.24, 0.24, 0.08, '#ef4444', 9.65, 0.78, z - 0.28);
        animatedMachines.push(t => {
          rotor.rotation.z = t * 4.5;
        });
      }
      sign(group, 'DIALYSIS UNIT', 8.15, 2.45, 5.35, 2.4, 0.55, Math.PI, 'ACTIVE FILTRATION', profile.accent);
    } else if (profile.kind === 'pediatric') {
      // Pediatrics Ward: Colorful play blocks, bouncing toy, crib, nurse & child patient
      bed(group, 9.25, 3.5, profile.accent);
      chair(group, 6.8, 4.6, '#10b981', Math.PI);
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#10b981'];
      colors.forEach((c, i) => {
        const blk = box(group, 0.42, 0.42, 0.42, c, 6.6 + i * 0.5, 0.25, 1.1);
        if (i === 1) {
          animatedMachines.push(t => {
            blk.position.y = 0.25 + Math.abs(Math.sin(t * 3 + i)) * 0.22;
          });
        }
      });
      plant(group, 10.0, 4.9);
      sign(group, 'PEDIATRIC WARD', 8.1, 2.35, 5.35, 2.5, 0.6, Math.PI, 'CHILDREN & INFANTS', profile.accent);
    } else if (profile.kind === 'exam') {
      // Neurology Ward: Working Voxel MRI / CT Scanner with sweeping glowing blue scan ring!
      box(group, 1.55, 1.75, 0.95, '#f8fafc', 8.85, 0.9, 3.6, false, 'quartz');
      box(group, 0.95, 0.95, 1.0, '#1e293b', 8.85, 0.95, 3.6);
      box(group, 0.75, 0.45, 2.2, '#0ea5e9', 8.85, 0.35, 2.8);
      const scanRing = addVoxelBox(group, 1.02, 1.02, 0.14, 8.85, 0.95, 3.2, {
        color: '#38bdf8',
        emissive: '#06b6d4',
        emissiveIntensity: 0.85,
        pattern: null
      });
      animatedMachines.push(t => {
        scanRing.position.z = 3.6 + Math.sin(t * 2.4) * 0.42;
      });
      cabinet(group, 6.8, 4.9, profile.accent);
      sign(group, 'NEURO MRI SCAN', 8.2, 2.4, 5.35, 2.4, 0.6, Math.PI, 'MAGNETIC IMAGING', profile.accent);
    } else if (profile.kind === 'cardiac') {
      // Cardiology Ward: Bed + Live ECG Monitor + Stress-Test Treadmill
      bed(group, 9.25, 3.5, profile.accent);
      screen(group, 8.2, 4.6, profile.accent);
      cart(group, 6.8, 4.6, profile.accent);
      // Voxel Treadmill at front-left of ward
      box(group, 0.85, 0.14, 1.65, '#1e293b', 7.1, 0.12, 2.1);
      box(group, 0.85, 1.15, 0.14, '#475569', 7.1, 0.65, 1.35);
      box(group, 0.65, 0.32, 0.18, '#0f172a', 7.1, 1.25, 1.35);
      sign(group, 'CARDIOLOGY ICU', 8.2, 2.4, 5.35, 2.5, 0.6, Math.PI, 'TELEMETRY & ECG', profile.accent);
    } else {
      // Pulmonology, Emergency, Gastroenterology: Bed, Ventilator Bellows, Surgical Light, Crash Cart
      const left = profile.layout === 2;
      bed(group, left ? 7.1 : 9.2, 3.4, profile.accent);
      cabinet(group, left ? 9.7 : 6.7, 4.9, profile.accent);
      cart(group, left ? 9.2 : 6.8, 1.3, profile.accent);
      screen(group, left ? 8.1 : 8.2, 4.5, profile.accent);
      // Animated Ventilator Bellows unit
      box(group, 0.48, 1.45, 0.48, '#e2e8f0', 7.55, 0.72, 4.8, false, 'quartz');
      const bellows = addVoxelBox(group, 0.32, 0.38, 0.32, 7.55, 1.62, 4.8, {
        color: '#06b6d4',
        emissive: '#0891b2',
        emissiveIntensity: 0.4,
        pattern: null
      });
      animatedMachines.push(t => {
        bellows.scale.y = 0.65 + Math.abs(Math.sin(t * 2.8)) * 0.55;
      });
      sign(group, profile.name, 8.2, 2.35, 5.35, 2.6, 0.6, Math.PI, `WARD 0${profile.floor}`, profile.accent);
    }

    // Populate each ward with 2 active Minecraft characters (a Doctor/Nurse + a Patient/Colleague)
    const seated = profile.kind === 'lounge' || profile.kind === 'dialysis';
    const primaryRole = seated
      ? 'steve'
      : profile.kind === 'emergency' || profile.kind === 'cardiac'
        ? 'red-staff'
        : profile.kind === 'exam' || profile.kind === 'respiratory'
          ? 'surgeon'
          : 'white-staff';
    const rig = spawnCharacter(primaryRole);
    group.add(rig.placement);
    residents.push({ rig, profile, seated, role: 'primary', phase: profile.floor * 0.91 });

    // Second active staff member on every floor (Nurse or Attending Doctor doing rounds)
    const secondaryRole = profile.floor % 2 === 0 ? 'room-nurse' : 'white-staff';
    const rig2 = spawnCharacter(secondaryRole);
    group.add(rig2.placement);
    residents.push({ rig: rig2, profile, seated: false, role: 'secondary', phase: profile.floor * 1.47 + 2.1 });

    return group;
  }

  let floorPlan = [];
  let caseId = null;
  let roundState = { floor: 0, won: false, lost: false, attempts: 0, remaining: 7 };
  let atFloor = 0;
  let shownFloor = 0;
  let view = 'lift';
  let travel = null;
  let open = 1;
  let clock = 0;
  let enteredAt = null;
  let lastNotice = '';

  const signs7 = new THREE.Group();
  signs7.position.y = 28;
  root.add(signs7);
  box(signs7, 0.18, 3.7, 0.18, '#1e293b', 5.9, 1.85, 0.02);
  box(signs7, 2.8, 0.18, 5.7, '#334155', 4.6, -0.09, 2.7, false, 'quartz');
  box(signs7, 2.8, 0.14, 5.7, '#475569', 4.6, 3.85, 2.7, false, 'quartz');
  const targetSign = sign(signs7, 'Patient ward', 8.2, 3.14, -0.09, 4.0, 0.6, Math.PI, 'FLOOR 7 · ROOM 07', '#ef4444');
  const landingSign = sign(signs7, 'Patient ward', 6.04, 2.97, 2.6, 2.8, 0.55, -Math.PI / 2, 'ROOM 07', '#ef4444');

  // Crisp Minecraft Glass & Redstone Elevator Cabin
  const cabin = new THREE.Group();
  cabin.name = 'doctor-lift-cabin';
  root.add(cabin);

  // Checkered Quartz & Slate cabin floor + steel base
  box(cabin, 2.72, 0.18, 2.88, '#1e293b', 4.55, -0.09, 2.6);
  addVoxelBox(cabin, 2.62, 0.08, 2.78, 4.55, 0.02, 2.6, {
    color: '#f8fafc',
    pattern: 'tiles',
    accent: '#94a3b8'
  });
  // Gold threshold plate at cabin entrance
  box(cabin, 0.14, 0.09, 2.52, '#eab308', 5.82, 0.03, 2.6);

  // Corner steel pillars of the cabin
  for (const cx of [3.24, 5.86]) {
    for (const cz of [1.22, 3.98]) {
      box(cabin, 0.14, 3.52, 0.14, '#0f172a', cx, 1.76, cz);
    }
  }
  // Panoramic Glass Side & Back Walls
  box(cabin, 2.66, 3.35, 0.08, '#38bdf8', 4.55, 1.72, 1.22, true);
  box(cabin, 2.66, 3.35, 0.08, '#38bdf8', 4.55, 1.72, 3.98, true);
  box(cabin, 0.08, 3.35, 2.72, '#38bdf8', 3.24, 1.72, 2.6, true);

  // Cabin Roof with glowing Sea Lantern light panel
  box(cabin, 2.74, 0.16, 2.9, '#1e293b', 4.55, 3.52, 2.6);
  addVoxelBox(cabin, 1.85, 0.08, 1.85, 4.55, 3.42, 2.6, {
    color: '#e0f7fa',
    emissive: '#38bdf8',
    emissiveIntensity: 0.65,
    pattern: 'lantern'
  });

  // Warm Gold / Brass Handrails inside cabin
  box(cabin, 2.52, 0.07, 0.07, '#f59e0b', 4.55, 1.05, 1.32);
  box(cabin, 2.52, 0.07, 0.07, '#f59e0b', 4.55, 1.05, 3.88);
  box(cabin, 0.07, 0.07, 2.48, '#f59e0b', 3.32, 1.05, 2.6);

  // Interior Elevator Floor Button Panel (G..7)
  box(cabin, 0.08, 0.95, 0.34, '#1e293b', 5.76, 1.48, 1.48);
  for (let b = 0; b < 8; b++) {
    const by = 1.12 + b * 0.1;
    addVoxelBox(cabin, 0.1, 0.06, 0.12, 5.74, by, 1.48, {
      color: b === 7 ? '#ef4444' : '#38bdf8',
      emissive: b === 7 ? '#ef4444' : '#0ea5e9',
      emissiveIntensity: 0.5,
      pattern: null
    });
  }

  // Center-Parting Framed Glass Sliding Doors
  const doorLeft = new THREE.Group();
  doorLeft.position.set(5.87, 1.5, 1.98);
  cabin.add(doorLeft);
  box(doorLeft, 0.08, 2.92, 1.24, '#cbd5e1', 0, 0, 0);
  box(doorLeft, 0.1, 1.95, 0.88, '#38bdf8', 0, 0.25, 0, true);
  box(doorLeft, 0.11, 2.92, 0.08, '#0284c7', 0, 0, 0.58);

  const doorRight = new THREE.Group();
  doorRight.position.set(5.87, 1.5, 3.22);
  cabin.add(doorRight);
  box(doorRight, 0.08, 2.92, 1.24, '#cbd5e1', 0, 0, 0);
  box(doorRight, 0.1, 1.95, 0.88, '#38bdf8', 0, 0.25, 0, true);
  box(doorRight, 0.11, 2.92, 0.08, '#0284c7', 0, 0, -0.58);

  const doors = [doorLeft, doorRight];

  const display = sign(cabin, 'LOBBY · G', 5.75, 3.18, 2.6, 1.75, 0.42, -Math.PI / 2, 'LIFT READY', '#10b981');

  // Chief Doctor inside the Lift (crisp Minecraft voxel doctor)
  const doctor = spawnCharacter('doctor-chief');
  doctor.placement.name = 'lift-doctor';
  scene.add(doctor.placement);
  let doctorYaw = Math.PI / 2;

  // Elevator Shaft Guide Rails, Hoist Cables, Moving Counterweight & Redstone Floor Lamps
  for (const x of [3.15, 5.96]) {
    for (const z of [1.18, 4.02]) {
      box(root, 0.14, 32.5, 0.14, '#1e293b', x, 16.25, z);
    }
  }
  // Hoist cables
  for (const z of [2.35, 2.85]) {
    box(root, 0.04, 32.2, 0.04, '#64748b', 4.55, 16.1, z);
  }
  // Moving Voxel Counterweight in shaft
  const counterweight = new THREE.Group();
  root.add(counterweight);
  box(counterweight, 0.22, 1.8, 1.2, '#334155', 3.35, 0, 2.6);
  box(counterweight, 0.24, 0.3, 1.24, '#eab308', 3.35, 0.6, 2.6);
  box(counterweight, 0.24, 0.3, 1.24, '#eab308', 3.35, -0.6, 2.6);

  // Redstone Floor Indicator Lamps along the elevator shaft at every storey (0..7)
  for (let f = 0; f <= 7; f++) {
    const fy = f * STOREY_HEIGHT + 3.2;
    const lamp = addVoxelBox(root, 0.22, 0.22, 0.22, 5.98, fy, 1.18, {
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.6,
      pattern: null
    });
    shaftLights.push({ floor: f, lamp });
  }

  const canvasCamera = new THREE.PerspectiveCamera(62, 1, 0.08, 180);
  let renderer;
  if (software) {
    renderer = new SoftwareRenderer();
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  container.append(renderer.domElement);
  container.dataset.loaded = 'true';

  const size = () => {
    if (!container.clientWidth || !container.clientHeight) return;
    canvasCamera.aspect = container.clientWidth / container.clientHeight;
    canvasCamera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  new ResizeObserver(size).observe(container);
  size();

  function notify() {
    const phase = travel ? 'travelling' : roundState.lost ? 'too-late' : roundState.won ? 'arrived' : 'waiting';
    const name = floorPlan[atFloor]?.name || 'Lobby & reception';
    const notice = [phase, atFloor, roundState.floor, view, shownFloor, caseId].join('|');
    if (notice === lastNotice) return;
    lastNotice = notice;
    container.dataset.floor = String(atFloor);
    container.dataset.destination = String(roundState.floor);
    container.dataset.phase = phase;
    container.dataset.view = view;
    container.dataset.ward = name;
    container.dataset.doctor = enteredAt === null ? 'in-lift' : 'at-patient';
    onChange?.({ ...roundState, atFloor, phase, view, shownFloor, ward: name, floors: floorPlan });
  }

  function setRound(question, round) {
    const next = journeyForRound(round);
    const changedCase = question.id !== caseId;
    if (changedCase) {
      caseId = question.id;
      floorPlan = wardFloors(question);
      for (const group of floorGroups) {
        root.remove(group);
        group.traverse(mesh => {
          const texture = mesh.material?.map;
          if (texture?.userData.wardSign) {
            signTextures.delete(texture);
            texture.dispose();
            mesh.material.dispose();
            mesh.geometry.dispose();
            texture.image.width = 1;
            texture.image.height = 1;
          }
        });
      }
      floorGroups.length = 0;
      residents.length = 0;
      animatedMachines.length = 0;
      floorPlan.slice(1, 7).forEach(buildWard);
      targetSign.draw(floorPlan[7].name, 'FLOOR 7 · ROOM 07');
      landingSign.draw(floorPlan[7].name, 'PATIENT SUITE 07');
      enteredAt = null;
      scene.updateMatrixWorld(true);
    }
    if (changedCase || (!roundState.attempts && next.attempts > 0 && roundState.floor === next.floor)) {
      atFloor = next.floor;
      travel = null;
      open = 1;
    }
    if (!changedCase && (next.floor !== roundState.floor || next.lost !== roundState.lost)) {
      if (next.floor !== atFloor) {
        travel = {
          from: cabin.position.y || 0.3125,
          to: next.floor * 4,
          start: performance.now(),
          duration: reduced ? 1 : 1500 + Math.abs(next.floor - atFloor) * 150,
          target: next.floor
        };
        open = 0;
      } else if (next.lost) {
        travel = null;
        open = 1;
      }
      view = 'lift';
      enteredAt = null;
    }
    roundState = next;
    if (changedCase) {
      atFloor = next.floor;
      cabin.position.y = atFloor ? atFloor * 4 : 0.3125;
      view = 'lift';
      open = 1;
      if (next.won) enteredAt = clock - 3;
    }
    const fLabel = atFloor ? `FLOOR ${atFloor}` : 'LOBBY · G';
    const wName = floorPlan[atFloor]?.name || 'Lobby & reception';
    display.draw(fLabel, wName);
    notify();
  }

  function setView(next, floor = atFloor) {
    view = next;
    shownFloor = floor;
    notify();
  }

  function update(now, dt) {
    clock += Math.min(dt, 0.1);

    // Animate rooftop helicopter rotor & emergency ambulance beacons
    helicopter.rotor.rotation.y = clock * 11.5;
    const flash = Math.sin(clock * 10) > 0;
    ambulance.beaconRed.material.emissiveIntensity = flash ? 1.1 : 0.15;
    ambulance.beaconBlue.material.emissiveIntensity = flash ? 0.15 : 1.1;

    // Run ward machine animations
    for (const fn of animatedMachines) fn(clock);

    if (travel) {
      const age = now - travel.start;
      const p = reduced ? 1 : Math.max(0, Math.min(1, (age - 250) / travel.duration));
      cabin.position.y = THREE.MathUtils.lerp(travel.from, travel.to, ease(p));
      open = age < 250 ? 1 - age / 250 : p >= 1 ? Math.min(1, (age - 250 - travel.duration) / 600) : 0;
      if (age >= travel.duration + 850 || reduced) {
        atFloor = travel.target;
        travel = null;
        open = 1;
        const fLabel = atFloor ? `FLOOR ${atFloor}` : 'LOBBY · G';
        display.draw(fLabel, floorPlan[atFloor]?.name || 'Lobby');
        if (roundState.won) enteredAt = clock;
        notify();
      }
    } else {
      cabin.position.y = atFloor ? atFloor * 4 : 0.3125;
    }

    // Update counterweight opposite to cabin height
    counterweight.position.y = 29.5 - cabin.position.y * 0.85;

    // Update shaft floor indicator lamps
    const currentApproxFloor = Math.round(cabin.position.y / 4);
    for (const item of shaftLights) {
      const active = item.floor === currentApproxFloor;
      item.lamp.scale.setScalar(active ? 1.35 : 1.0);
    }

    doors[0].position.z = 1.98 - open * 1.15;
    doors[1].position.z = 3.22 + open * 1.15;
    container.dataset.doors = open > 0.98 ? 'open' : open < 0.02 ? 'closed' : 'moving';
    container.dataset.liftHeight = cabin.position.y.toFixed(3);

    const exiting = enteredAt !== null && roundState.won;
    const walk = exiting ? Math.min(1, (clock - enteredAt) / 3.6) : 0;
    const route = [
      [4.55, 2.45],
      [6.5, 2.45],
      [6.5, 1.1],
      [7.4, 1.1]
    ];
    const segment = Math.min(2, Math.floor(walk * 3));
    const p = ease(walk * 3 - segment);
    const from = route[segment];
    const to = route[segment + 1];
    doctor.placement.position.set(
      THREE.MathUtils.lerp(from[0], to[0], p),
      cabin.position.y,
      THREE.MathUtils.lerp(from[1], to[1], p)
    );
    const desired =
      walk === 1 ? Math.atan2(8.28 - 7.4, 2.6 - 1.1) : Math.atan2(to[0] - from[0], to[1] - from[1]);
    doctorYaw = mixAngle(doctorYaw, desired, 1 - Math.exp(-dt * 7));
    doctor.placement.rotation.y = doctorYaw;

    if (exiting && walk < 1) {
      transitionMotion(doctor, motion, 'walk', (clock * 0.85) % motion.clips.walk.duration, clock, {
        blend: 0.3,
        rootScale: 0.2,
        neutralHeading: true
      });
    } else {
      transitionMotion(doctor, extra, 'talk', clock % extra.clips.talk.duration, clock, {
        blend: 0.5,
        rootScale: 0.08,
        neutralHeading: true
      });
    }
    plantFeet(doctor, cabin.position.y);
    container.dataset.doctor = exiting ? 'at-patient' : 'in-lift';

    // Animate all floor ward doctors, nurses & patients
    for (const person of residents) {
      const { rig, profile, seated, role, phase } = person;
      const t = clock + phase;
      if (role === 'primary' && seated) {
        const clip = profile.kind === 'lounge' ? 'sitTalk' : 'sitIdleB';
        transitionMotion(rig, extra, clip, t % extra.clips[clip].duration, clock, {
          rootScale: 0,
          neutralHeading: true
        });
        rig.placement.position.set(
          profile.kind === 'lounge' ? 7.1 : 8.35,
          0.46 - rig.hipY,
          profile.kind === 'lounge' ? 3.8 : 4.0
        );
        rig.placement.rotation.y = profile.kind === 'lounge' ? Math.PI : -Math.PI / 2;
      } else if (role === 'primary') {
        const moving = t % 12 < 5.5;
        const pW = (t % 12) / 5.5;
        rig.placement.position.set(7.2 + Math.sin(pW * Math.PI) * 0.85, 0, 1.55);
        rig.placement.rotation.y = moving ? Math.PI / 2 : 0;
        transitionMotion(
          rig,
          moving ? motion : extra,
          moving ? 'walk' : 'talk',
          t % (moving ? motion.clips.walk.duration : extra.clips.talk.duration),
          clock,
          { rootScale: 0.1, neutralHeading: true }
        );
        plantFeet(rig, profile.floor * 4);
      } else {
        // Secondary staff member (Nurse / Attending Doctor) checking beds & equipment
        const moving = (t + 3) % 10 < 4.5;
        const pW = ((t + 3) % 10) / 4.5;
        const zPos = 2.2 + Math.cos(pW * Math.PI) * 1.15;
        rig.placement.position.set(8.05, 0, zPos);
        rig.placement.rotation.y = moving ? (Math.sin(pW * Math.PI) >= 0 ? Math.PI : 0) : Math.PI / 2;
        transitionMotion(
          rig,
          moving ? motion : extra,
          moving ? 'walk' : 'bartender',
          t % (moving ? motion.clips.walk.duration : extra.clips.bartender.duration),
          clock,
          { rootScale: 0.1, neutralHeading: true }
        );
        plantFeet(rig, profile.floor * 4);
      }
    }
  }

  function render() {
    const y = cabin.position.y;
    if (view === 'tower') {
      canvasCamera.position.set(1.5, 17.5, -52);
      canvasCamera.lookAt(1.8, 15.5, 1.0);
      canvasCamera.fov = 42;
    } else if (view === 'floor') {
      const fy = shownFloor ? shownFloor * 4 : 0.3125;
      canvasCamera.position.set(7.6, fy + 2.35, -4.8);
      canvasCamera.lookAt(8.25, fy + 1.45, 2.7);
      canvasCamera.fov = 56;
    } else {
      canvasCamera.position.set(2.15, y + 1.92, -2.45);
      canvasCamera.lookAt(6.85, y + 1.42, 2.6);
      canvasCamera.fov = 60;
    }
    canvasCamera.updateProjectionMatrix();
    renderer.render(scene, canvasCamera);
  }

  return {
    setRound,
    setView,
    update,
    render,
    get travelling() {
      return !!travel;
    },
    get floors() {
      return floorPlan;
    }
  };
}
