import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const stage = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const palette = {
  stone: '#b8b6a0', stoneLight: '#dfd8bf', stoneDark: '#8c998f', foundation: '#63736e',
  earth: '#4c5f55', grass: '#71976c', grassLight: '#87a675', grassDark: '#648863',
  paving: '#bfbdab', pavingLight: '#cfccba', pavingDark: '#afaf9b',
  red: '#a43b30', redLight: '#bd5140', redDark: '#81362d', plaster: '#e1d4ac',
  wood: '#5e3d30', woodLight: '#937050', woodDark: '#48342a', gold: '#d4a648', goldLight: '#e8c36b', goldDark: '#ae853c',
  jade: '#356d6a', jadeLight: '#48817c', jadeDark: '#2b5555',
  leaf: '#356849', leafLight: '#4a8054', leafDark: '#28523c',
  water: '#508f92', waterLight: '#8db7ad', lantern: '#ed7342', dark: '#302e2b',
};
const buckets = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);
const scene = new THREE.Scene();
const world = new THREE.Group();
scene.add(world);
let seed = 5831;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function block(material, x, y, z, sx = 1, sy = 1, sz = 1) {
  if (!buckets.has(material)) buckets.set(material, []);
  buckets.get(material).push([x, y, z, sx, sy, sz]);
}
function variant(names) { return names[Math.floor(random() * names.length)]; }

// 地形和铺装保持块状边缘，建筑、景观与底座共用一套体素材质。
function makeTerrain() {
  block('earth', 0, -2.4, 0, 103, 5, 121);
  block('foundation', 0, -4.4, 0, 99, 1.5, 117);
  block('stoneDark', 0, -.25, 0, 104, .7, 122);
  for (let x = -50; x <= 50; x += 2) {
    for (let z = -58; z <= 58; z += 2) {
      const interior = Math.abs(x) < 45 && Math.abs(z) < 52;
      block(interior ? variant(['paving', 'paving', 'pavingLight', 'pavingDark']) : variant(['grass', 'grassLight', 'grassDark']), x, .18, z, 1.97, .36, 1.97);
    }
  }
  for (let x = -50; x <= 50; x += 3) {
    for (const z of [-60, 60]) {
      block(variant(['foundation', 'stoneDark', 'foundation']), x, -2.2, z, 2.96, 3.4 + random() * 1.4, 1.8);
      block('stoneLight', x, -.5, z, 2.96, .6, 2);
    }
  }
  for (let z = -57; z <= 57; z += 3) {
    for (const x of [-51, 51]) {
      block(variant(['foundation', 'stoneDark']), x, -2.3, z, 1.8, 3.4 + random() * 1.2, 2.96);
      block('stoneLight', x, -.5, z, 2, .6, 2.96);
    }
  }
  // 中轴道路及配殿横向支路。
  for (let z = -36; z <= 57; z += 2) {
    for (let x = -5; x <= 5; x += 2) block('stoneLight', x, .48, z, 1.94, .18, 1.94);
    for (const x of [-6.5, 6.5]) block('stoneDark', x, .5, z, .4, .2, 1.96);
  }
  for (let x = -39; x <= 39; x += 2) {
    for (const z of [-16, -14, -12, 24, 26, 28]) block('stoneLight', x, .47, z, 1.94, .18, 1.94);
  }
  for (const side of [-1, 1]) {
    for (const z of [5, 37]) {
      const x = side * 19;
      block('stoneDark', x, .47, z, 11, .8, z === 5 ? 17 : 11);
      block('grass', x, .82, z, 10.1, .5, z === 5 ? 16.1 : 10.1);
      if (z === 5) {
        for (const side of [-1, 1]) {
          block('stoneLight', x + side * 3.8, 1, z, .6, .4, 13.2);
          block('stoneLight', x, 1, z + side * 6.3, 7.6, .4, .6);
        }
        block('water', x, 1.05, z, 7, .25, 12);
        for (let i = 0; i < 7; i++) block('waterLight', x - 2 + random() * 4, 1.2, z - 4 + random() * 8, 1 + random() * 1.7, .035, .12);
      } else {
        pine(x, z, 1.1);
      }
    }
  }
}

// 屋面逐块抬升；边沿和角部额外上翘，保留飞檐的轮廓。
function roof(cx, cz, y, width, depth, style = 'hip', tone = 'jade', slope = .57) {
  const hw = width / 2, hd = depth / 2;
  const nx = Math.round(width), nz = Math.round(depth);
  const colors = [tone, `${tone}Light`, tone, `${tone}Dark`];
  const heightAt = (x, z) => {
    const dx = hw - Math.abs(x), dz = hd - Math.abs(z);
    let rise;
    if (style === 'pyramid') rise = Math.min(dx, dz) * .84;
    else if (style === 'gable') rise = Math.min(dz, dx + hd * .57) * slope;
    else rise = Math.min(dx, dz) * slope;
    const edge = Math.max(Math.abs(x) / hw, Math.abs(z) / hd);
    const corner = (Math.abs(x) / hw) * (Math.abs(z) / hd);
    return y + Math.max(0, rise) + .28 * edge ** 9 + 2.5 * corner ** 7;
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = -hw + (i + .5) * width / nx;
      const z = -hd + (j + .5) * depth / nz;
      block(variant(colors), cx + x, heightAt(x, z), cz + z, width / nx * .985, .67, depth / nz * .985);
      if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) {
        block(tone === 'gold' ? 'goldLight' : 'jadeLight', cx + x, heightAt(x, z) - .55, cz + z, width / nx, .32, depth / nz);
      }
    }
  }
  if (style === 'pyramid') {
    const peak = y + Math.min(hw, hd) * .84;
    block('gold', cx, peak + 1.1, cz, 1.15, 1.8, 1.15);
    block('goldLight', cx, peak + 2.2, cz, .65, .65, .65);
  } else {
    const ridge = style === 'gable' ? width - depth * .7 : width - depth;
    const top = y + hd * slope;
    for (let x = -ridge / 2; x <= ridge / 2; x++) block(tone === 'gold' ? 'goldLight' : 'jadeLight', cx + x, top + .55, cz, .98, .9, .95);
    for (const sign of [-1, 1]) {
      const x = cx + sign * (ridge / 2 + .5);
      block('gold', x, top + 1, cz, 1.3, 1.5, .8);
      block('goldLight', x + sign * .5, top + 1.8, cz, .75, .7, .8);
    }
    if (style === 'gable') {
      for (const sign of [-1, 1]) {
        for (let z = -hd + 2; z < hd - 1; z++) {
          const h = Math.max(0, (hd - Math.abs(z)) * slope - .8);
          if (h > 0) block('woodLight', cx + sign * (hw - 2.8), y + h / 2, cz + z, .45, h, .94);
        }
      }
    }
  }
  // 四个角的宝兽为抽象体素造型。
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (hw - .5), z = sz * (hd - .5);
    const h = heightAt(x, z);
    block('gold', cx + x, h + .7, cz + z, .7, 1, .7);
    block('goldLight', cx + x, h + 1.4, cz + z - sz * .3, .65, .6, .8);
  }
}

function platform(cx, cz, width, depth, level = 2) {
  block('stoneDark', cx, level / 2 + .3, cz, width + 2, level, depth + 2);
  block('stoneLight', cx, level + .45, cz, width + 3, .6, depth + 3);
  block('stone', cx, level + .8, cz, width + 2.5, .2, depth + 2.5);
  const count = Math.ceil(level / .45) + 1;
  for (let step = 0; step < count; step++) {
    block('stoneLight', cx, .6 + step * .4, cz + depth / 2 + count - step * .85, Math.min(width * .5, 12), .8, 1.5);
  }
  for (const sx of [-1, 1]) {
    for (let z = -depth / 2; z <= depth / 2; z += 2.7) {
      block('stoneLight', cx + sx * (width / 2 + .6), level + 1.8, cz + z, .5, 1.9, .5);
      block('stone', cx + sx * (width / 2 + .6), level + 2.8, cz + z, .8, .5, .8);
    }
    block('stoneLight', cx + sx * (width / 2 + .6), level + 2, cz, .35, .4, depth);
    block('stoneLight', cx + sx * (width / 2 + .6), level + 1.25, cz, .35, .3, depth);
  }
  return level + .9;
}

function column(x, z, bottom, height) {
  block('stone', x, bottom + .25, z, 1.5, .5, 1.5);
  for (let y = .75; y < height; y++) block('redLight', x, bottom + y, z, .85, 1.02, .85);
  const top = bottom + height;
  block('goldDark', x, top - .45, z, 1, .4, 1);
  // 斗、拱和昂，以逐层挑出的方木表现承檐结构。
  block('woodLight', x, top + .2, z, 1.3, .6, 1.3);
  block('redDark', x, top + .7, z, 2.6, .5, .7);
  block('woodLight', x, top + 1.15, z, .7, .5, 2.7);
  block('goldDark', x, top + 1.55, z, 3.3, .35, .75);
}

function lattice(x, y, z, width = 2.6, height = 3.4) {
  block('wood', x, y, z, width, height, .36);
  block('dark', x, y, z + .2, width - .35, height - .35, .1);
  for (let dx = -width / 2 + .4; dx <= width / 2; dx += .6) block('woodLight', x + dx, y, z + .3, .14, height - .35, .13);
  for (let dy = -height / 2 + .4; dy < height / 2; dy += .65) block('woodLight', x, y + dy, z + .31, width - .35, .14, .13);
}

function lantern(x, y, z) {
  block('wood', x, y + 1.05, z, .13, 1.2, .13);
  block('goldDark', x, y + .45, z, 1.3, .25, 1.3);
  block('lantern', x, y - .25, z, 1.2, 1.2, 1.2);
  block('redLight', x, y - .25, z, .8, 1.5, 1.35);
  block('goldLight', x, y - 1, z, 1.1, .23, 1.1);
  block('gold', x, y - 1.45, z, .22, .75, .22);
}

function plaque(text, x, y, z, width = 5.4) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#263b37'; ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#dfb967'; ctx.lineWidth = 9; ctx.strokeRect(7, 7, 498, 146);
  ctx.fillStyle = '#f4d38d'; ctx.font = 'bold 82px KaiTi, STKaiti, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 3.2), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(x, y, z); world.add(mesh);
  block('woodLight', x, y, z - .14, width + .3, width / 3.2 + .3, .3);
}

function hall({ name, x, z, width, depth, height, level = 2, tone = 'jade', style = 'gable', grand = false, gate = false }) {
  const base = platform(x, z, width, depth, level);
  const halfW = width / 2 - 1.5, halfD = depth / 2 - 1.5;
  if (!gate) {
    block('red', x, base + height / 2, z - halfD + .5, width - 3, height, 1);
    for (const side of [-1, 1]) {
      block('red', x + side * (halfW - .5), base + height / 2, z, 1, height, depth - 3);
      block('plaster', x + side * (halfW - 1.05), base + 1.2, z, .12, 1.7, depth - 5);
    }
    for (let dx = -halfW + 2; dx <= halfW - 1; dx += 4.2) {
      block('red', x + dx, base + height / 2, z + halfD - 1.6, 4.15, height - .4, .6);
      if (Math.abs(dx) > 2.2) lattice(x + dx, base + 3.1, z + halfD - 1.25);
    }
    block('wood', x, base + 2.5, z + halfD - 1.15, 3.2, 5, .5);
    for (const side of [-1, 1]) {
      block('redDark', x + side * .8, base + 2.5, z + halfD - .84, 1.4, 4.8, .2);
      for (let y = 1; y < 4.8; y += .65) for (let dx = .3; dx < 1.4; dx += .45) block('gold', x + side * dx, base + y, z + halfD - .7, .13, .13, .16);
    }
  } else {
    for (const side of [-1, 1]) {
      block('red', x + side * 7.2, base + height / 2, z, 4.5, height, depth - 3);
      lattice(x + side * 7.2, base + 3, z + halfD + .05, 2.4, 3.5);
    }
    block('redDark', x, base + height - 1, z, width - 3, 2, depth - 3);
  }
  const bays = grand ? 6 : 4;
  for (let i = 0; i <= bays; i++) {
    for (const side of [-1, 1]) column(x - halfW + i * 2 * halfW / bays, z + side * halfD, base, height);
  }
  for (const side of [-1, 1]) {
    block('woodLight', x, base + height + 1.5, z + side * halfD, width - 1, .6, .8);
    block('redDark', x + side * halfW, base + height + 1.5, z, .8, .6, depth - 1);
    lantern(x + side * (grand ? 8 : 5), base + height - 1.5, z + halfD + .4);
  }
  const roofY = base + height + 2;
  roof(x, z, roofY, width + 5, depth + 5, style, tone);
  if (grand) {
    const upperY = roofY + 6.4;
    block('redDark', x, upperY - .5, z, width - 6, 4.5, depth - 7);
    for (let dx = -12; dx <= 12; dx += 4) for (const sz of [-1, 1]) {
      lattice(x + dx, upperY, z + sz * (depth / 2 - 3.45), 2.2, 2.1);
      column(x + dx, z + sz * (depth / 2 - 3), upperY - 2.5, 3.4);
    }
    roof(x, z, upperY + 3, width + 1, depth + 1, 'hip', tone, .64);
  }
  plaque(name, x, base + height - .45, z + halfD + .6, grand ? 7 : 5);
}

function tower(name, x, z, isBell) {
  const base = platform(x, z, 12, 12, 1.6);
  block('red', x, base + 3.3, z, 9.5, 6.6, 9.5);
  lattice(x, base + 3.2, z + 4.8, 3.7, 4.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) column(x + sx * 5, z + sz * 5, base, 6.7);
  roof(x, z, base + 8.7, 16, 16, 'pyramid', 'jade');
  const upper = base + 15;
  block('wood', x, upper, z, 8.5, .8, 8.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) column(x + sx * 3.5, z + sz * 3.5, upper, 5);
  if (isBell) {
    block('goldDark', x, upper + 3.1, z, 2.7, 3.3, 2.7);
    block('gold', x, upper + 1.5, z, 3.7, .8, 3.7);
    block('wood', x, upper + 4.9, z, .3, 1.2, .3);
  } else {
    block('redDark', x, upper + 2.4, z, 3.4, 3.2, 2.8);
    block('stoneLight', x, upper + 2.4, z + 1.48, 3, 2.7, .3);
    block('wood', x, upper + .5, z, 4, .7, 3);
  }
  for (const sx of [-1, 1]) {
    block('redDark', x + sx * 4, upper + 1.1, z, .3, .5, 8);
    block('gold', x, upper + 1.1, z + sx * 4, 8, .4, .3);
  }
  roof(x, z, upper + 7, 12, 12, 'pyramid', 'jade');
  plaque(name, x, base + 6.3, z + 5.6, 4.3);
}

function pine(x, z, scale = 1) {
  for (let h = 1; h < 9 * scale; h++) block('wood', x, h + .5, z, .9 * scale, 1.01, .9 * scale);
  const layers = [{ y: 6, r: 4 }, { y: 8, r: 3.6 }, { y: 10, r: 2.8 }, { y: 12, r: 1.8 }, { y: 13.2, r: .8 }];
  for (const layer of layers) {
    for (let dx = -layer.r; dx <= layer.r; dx += 1.3) {
      for (let dz = -layer.r; dz <= layer.r; dz += 1.3) {
        if (Math.abs(dx) + Math.abs(dz) > layer.r * 1.7 || random() < .06) continue;
        block(variant(['leaf', 'leafLight', 'leafDark']), x + dx * scale, layer.y * scale + random() * .35, z + dz * scale, 1.35 * scale, 1.6 * scale, 1.35 * scale);
      }
    }
  }
}

function stoneLion(x, z) {
  block('stoneDark', x, 1, z, 3.4, 1.4, 4);
  block('stoneLight', x, 1.8, z, 3.6, .45, 4.2);
  block('stone', x, 3, z, 1.8, 2.3, 2.7);
  block('stoneLight', x, 4.6, z + .7, 2.35, 2.1, 2);
  for (const s of [-1, 1]) {
    block('stone', x + s * .85, 2.6, z + 1, .75, 1.5, .9);
    block('stone', x + s * 1.1, 5.7, z + .7, .6, .6, .7);
    block('dark', x + s * .65, 4.9, z + 1.75, .25, .25, .13);
  }
  block('stoneLight', x, 4.1, z + 1.7, 1.5, .8, .85);
  block('stoneDark', x, 5.1, z - .3, 2.6, 2.2, 1);
  block('stone', x, 2.1, z + 2.1, 1.15, 1.1, 1.15);
}

function wall() {
  for (const sx of [-1, 1]) {
    block('stoneDark', sx * 46, 1.05, 0, 1.8, 1.4, 105);
    block('red', sx * 46, 3, 0, 1.4, 3, 105);
    for (let z = -52; z <= 52; z++) {
      block('jadeDark', sx * 46, 4.9, z, 2.6, .55, .98);
      block('jade', sx * 46, 5.35, z, 1.1, .5, .98);
    }
    for (let z = -52; z <= 52; z += 13) block('redDark', sx * 46, 2.8, z, 2.3, 4.8, 2.3);
  }
  for (const z of [-52, 52]) {
    for (let x = -46; x <= 46; x++) {
      if (z > 0 && Math.abs(x) < 12) continue;
      block('red', x, 2.8, z, 1, 3.8, 1.4);
      block('stoneDark', x, .85, z, 1, 1, 1.8);
      block('jadeDark', x, 4.9, z, .98, .5, 2.6);
      block('jade', x, 5.35, z, .98, .5, 1.1);
    }
  }
}

function landscape() {
  for (const sx of [-1, 1]) {
    for (const z of [-45, -30, -12, 9, 45]) pine(sx * 40, z, z === -45 ? 1.2 : .82);
    pine(sx * 25, -45, .86);
    pine(sx * 9, -46, .65);
    for (const z of [18, -3, -21]) {
      block('stoneDark', sx * 9.5, 1.1, z, 2, 1.2, 2);
      block('stoneLight', sx * 9.5, 2.5, z, .75, 2, .75);
      block('stone', sx * 9.5, 3.8, z, 1.7, .7, 1.7);
      block('lantern', sx * 9.5, 4.35, z, .8, .5, .8);
      block('jade', sx * 9.5, 4.85, z, 2, .45, 2);
      block('jadeLight', sx * 9.5, 5.25, z, 1.2, .4, 1.2);
    }
    for (const z of [-4, 14]) {
      block('wood', sx * 31, 1.6, z, 7, .5, 1.7);
      for (const leg of [-1, 1]) block('woodDark', sx * 31 + leg * 2, 1, z, .5, 1.1, 1.3);
    }
    stoneLion(sx * 9, 49);
    stoneLion(sx * 11, -10);
  }
}

function buildWorld() {
  makeTerrain(); wall();
  hall({ name: '听云殿', x: 0, z: -30, width: 31, depth: 20, height: 8.5, level: 3.2, tone: 'gold', style: 'hip', grand: true });
  for (const sx of [-1, 1]) {
    hall({ name: sx < 0 ? '观澜阁' : '栖霞阁', x: sx * 31, z: -14, width: 17, depth: 16, height: 6.5, tone: 'jade', style: 'gable' });
    tower(sx < 0 ? '钟楼' : '鼓楼', sx * 31, 27, sx < 0);
  }
  hall({ name: '承风门', x: 0, z: 42, width: 22, depth: 11, height: 6, level: 1.2, style: 'gable', gate: true });
  landscape();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  let voxelCount = 0;
  for (const [name, cells] of buckets) {
    const material = new THREE.MeshStandardMaterial({ color: palette[name] ?? palette.wood, roughness: name.startsWith('water') ? .36 : .88, metalness: name.startsWith('gold') ? .12 : 0 });
    if (name === 'lantern') { material.emissive.set('#c75527'); material.emissiveIntensity = .45; }
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
    for (let i = 0; i < cells.length; i++) {
      const [x, y, z, sx, sy, sz] = cells[i];
      position.set(x, y, z); scale.set(sx, sy, sz);
      matrix.compose(position, rotation, scale); mesh.setMatrixAt(i, matrix);
    }
    mesh.castShadow = !name.startsWith('water'); mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); world.add(mesh); voxelCount += cells.length;
  }
  return voxelCount;
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  stage.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, .1, 1200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.minZoom = .65; controls.maxZoom = 3.7;
  controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI / 2 - .035;
  controls.autoRotateSpeed = .55;
  controls.target.set(0, 5, 0);
  const sun = new THREE.DirectionalLight('#ffe4b1', 3.4);
  sun.position.set(-70, 110, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 280 });
  sun.shadow.normalBias = .065; sun.shadow.bias = -.00025;
  sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  const sky = new THREE.HemisphereLight('#ddebec', '#52624e', 2.15); scene.add(sky);
  const fill = new THREE.DirectionalLight('#a6ced1', .6); fill.position.set(60, 40, -70); scene.add(fill);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: '#718e94', roughness: 1 }));
  backdrop.rotation.x = -Math.PI / 2; backdrop.position.y = -6; backdrop.receiveShadow = true; scene.add(backdrop);
  const voxelCount = buildWorld();
  stage.dataset.voxelCount = String(voxelCount);
  stage.dataset.buildingCount = '6';
  const stats = { voxelCount, materialBatches: buckets.size, buildingCount: 6, fps: 0, frameTimeMs: 0, drawCalls: 0, triangles: 0, lighting: 'morning', view: 'overview', ready: false };
  // 只读检查入口用于核验性能和场景数量，不在产品界面暴露实现细节。
  Object.defineProperty(window, '__sceneStats', { get: () => ({ ...stats }) });
  let dusk = false;
  function setLighting() {
    scene.background = new THREE.Color(dusk ? '#52677d' : '#718e94');
    backdrop.material.color.set(dusk ? '#52677d' : '#718e94');
    sky.color.set(dusk ? '#a1b9d5' : '#ddebec');
    sky.groundColor.set(dusk ? '#5d5264' : '#52624e');
    sky.intensity = dusk ? 1.45 : 2.15;
    sun.color.set(dusk ? '#ffa968' : '#ffe4b1'); sun.intensity = dusk ? 2.4 : 3.4;
    sun.position.set(dusk ? -100 : -70, dusk ? 48 : 110, 60);
    fill.intensity = dusk ? .8 : .6;
    renderer.toneMappingExposure = dusk ? 1.1 : 1.25;
    document.querySelector('#light-label').textContent = dusk ? '暮色' : '晨光';
    document.querySelector('.sun-mark').textContent = dusk ? '☾' : '☀';
    const button = document.querySelector('#lighting');
    button.querySelector('span').textContent = dusk ? '晨光' : '暮色';
    button.setAttribute('aria-label', dusk ? '切换至晨光' : '切换至暮色');
    stats.lighting = dusk ? 'dusk' : 'morning';
  }
  function markView(view) {
    for (const id of ['overview', 'axis', 'orbit']) {
      const button = document.querySelector(`#${id}`);
      button.classList.toggle('active', view === id);
      button.setAttribute('aria-pressed', String(view === id));
    }
    stats.view = view;
  }
  function frame(view = 'overview') {
    controls.autoRotate = false;
    controls.target.set(0, 5, 0); camera.zoom = 1;
    camera.position.set(...(view === 'axis' ? [0, 145, 185] : [145, 140, 185]));
    // 正交取景在竖屏时会变宽；后移相机，保证近裁剪面始终位于地面上方。
    camera.position.sub(controls.target).multiplyScalar(2).add(controls.target);
    camera.lookAt(controls.target); camera.updateMatrixWorld();
    const bounds = new THREE.Box3().setFromObject(world);
    const inverse = camera.matrixWorldInverse;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const p = new THREE.Vector3(x, y, z).applyMatrix4(inverse);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const aspect = stage.clientWidth / stage.clientHeight;
    const availableHeight = stage.clientHeight - (stage.clientWidth < 700 ? 180 : 148);
    const verticalFit = (maxY - minY) * stage.clientHeight / Math.max(availableHeight, 150);
    const height = Math.max(verticalFit, (maxX - minX) / aspect * 1.15);
    camera.left = -height * aspect / 2; camera.right = height * aspect / 2;
    camera.top = height / 2; camera.bottom = -height / 2;
    camera.updateProjectionMatrix(); controls.update(); markView(view);
  }
  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    const rotating = controls.autoRotate;
    frame(stats.view === 'axis' ? 'axis' : 'overview');
    if (rotating) { controls.autoRotate = true; markView('orbit'); }
  }
  function toggleOrbit() {
    controls.autoRotate = !controls.autoRotate;
    markView(controls.autoRotate ? 'orbit' : 'free');
  }
  document.querySelector('#overview').addEventListener('click', () => frame('overview'));
  document.querySelector('#axis').addEventListener('click', () => frame('axis'));
  document.querySelector('#orbit').addEventListener('click', toggleOrbit);
  document.querySelector('#reset').addEventListener('click', () => frame('overview'));
  document.querySelector('#lighting').addEventListener('click', () => { dusk = !dusk; setLighting(); });
  controls.addEventListener('start', () => { controls.autoRotate = false; markView('free'); });
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement && ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.code === 'KeyR') frame('overview');
    if (event.code === 'Space') { event.preventDefault(); toggleOrbit(); }
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); renderer.setAnimationLoop(null); document.querySelector('#error').hidden = false;
  });
  setLighting(); resize();
  let frames = 0, startTime = performance.now(), previous = startTime;
  renderer.setAnimationLoop((now) => {
    controls.update(Math.min((now - previous) / 1000, .1)); previous = now;
    renderer.render(scene, camera); frames++;
    if (!stats.ready) { stats.ready = true; loading.classList.add('ready'); loading.setAttribute('aria-hidden', 'true'); }
    const duration = now - startTime;
    if (duration >= 1000) {
      stats.fps = Math.round(frames * 1000 / duration);
      stats.frameTimeMs = Number((duration / frames).toFixed(2));
      stats.drawCalls = renderer.info.render.calls; stats.triangles = renderer.info.render.triangles;
      document.querySelector('#fps').textContent = stats.fps;
      frames = 0; startTime = now;
    }
  });
}

try { start(); }
catch (error) {
  console.error('场景初始化失败：', error);
  loading.style.display = 'none'; document.querySelector('#error').hidden = false;
}
