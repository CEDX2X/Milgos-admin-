import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_LOGO = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&amp;family=Barlow+Condensed:wght@900&amp;family=Outfit:wght@900&amp;display=swap');
      .milgos-title {
        font-family: 'Barlow Condensed', 'Impact', 'Montserrat', 'Outfit', sans-serif;
        font-weight: 900;
        font-size: 80px;
        fill: #D8262C;
        letter-spacing: 3px;
        text-anchor: middle;
      }
      .milgos-sub {
        font-family: 'Montserrat', 'Outfit', sans-serif;
        font-weight: 900;
        font-size: 19px;
        fill: #D8262C;
        letter-spacing: 2px;
        text-anchor: middle;
      }
    </style>
    <clipPath id="circle-clip">
      <circle cx="256" cy="256" r="248" />
    </clipPath>
  </defs>

  <!-- Clean White Background -->
  <rect width="512" height="512" fill="#FFFFFF" rx="256" />

  <!-- Outer Circular Decorative Frame Group -->
  <g id="folk-frame">
    <!-- Outer Thin Ring -->
    <circle cx="256" cy="256" r="240" fill="none" stroke="#D8262C" stroke-width="4.5" />
    <!-- Inner Thin Ring -->
    <circle cx="256" cy="256" r="192" fill="none" stroke="#D8262C" stroke-width="3" />

    <!-- 36 Chevron & Folk Motifs around the circle (every 10 deg) -->
    ${Array.from({ length: 36 }).map((_, i) => {
      const angle = i * 10;
      return `
      <g transform="rotate(${angle} 256 256)">
        <!-- Outer Zigzag Apex -->
        <path d="M 256 16 L 246 36 L 251 36 L 256 29 L 261 36 L 266 36 Z" fill="#D8262C" />
        <!-- Middle Dot / Diamond -->
        <polygon points="256,43 253,48 256,53 259,48" fill="#D8262C" />
        <!-- Inner Small Triangle pointing outwards -->
        <polygon points="256,62 250,55 262,55" fill="#D8262C" />
      </g>`;
    }).join('')}
  </g>

  <!-- ROOSTER HEAD ILLUSTRATION (Vector Group centered) -->
  <g transform="translate(256, 220) scale(1.15)">
    <!-- Back Feather/Comb shadows -->
    <path d="M -45 -60 C -70 -75, -55 -115, -15 -95 C -10 -105, 10 -125, 30 -95 C 48 -115, 80 -98, 68 -65 C 85 -65, 88 -35, 62 -18 C 45 10, 15 15, -10 10 C -30 5, -45 -20, -45 -60 Z" 
          fill="#D8262C" stroke="#18181B" stroke-width="4.5" stroke-linejoin="round" />

    <!-- Front Comb Flares & Highlights -->
    <path d="M -15 -95 C 0 -115, 25 -118, 30 -90 C 45 -105, 75 -90, 65 -60 C 78 -58, 80 -38, 60 -20 C 48 -5, 20 0, -5 -5 C -25 -10, -35 -30, -38 -55 C -55 -70, -40 -100, -15 -95 Z" 
          fill="#E53935" />

    <!-- White Head & Neck Plumage -->
    <path d="M -50 -30 C -52 -5, -68 15, -72 38 C -62 32, -50 38, -50 55 C -38 42, -26 48, -32 70 C -15 52, -4 58, -10 80 C 8 58, 22 62, 28 80 C 38 58, 48 65, 42 42 C 50 32, 46 10, 42 -5 C 36 -22, 20 -38, 0 -38 C -22 -38, -38 -38, -50 -30 Z" 
          fill="#FFFFFF" stroke="#18181B" stroke-width="4.5" stroke-linejoin="round" />

    <!-- Head Feather Lines / Tufts Detail -->
    <path d="M -42 12 C -32 28, -36 50, -45 55" fill="none" stroke="#18181B" stroke-width="3.5" stroke-linecap="round" />
    <path d="M -18 22 C -12 38, -18 60, -22 70" fill="none" stroke="#18181B" stroke-width="3.5" stroke-linecap="round" />
    <path d="M 12 22 C 18 38, 12 60, 6 70" fill="none" stroke="#18181B" stroke-width="3.5" stroke-linecap="round" />

    <!-- Red Ear Lobe / Cheek Flare -->
    <path d="M -16 -18 C -28 -22, -38 -12, -32 5 C -26 18, -10 18, -5 0 Z" 
          fill="#D8262C" stroke="#18181B" stroke-width="3.5" />

    <!-- Eye Group -->
    <ellipse cx="6" cy="-14" rx="8" ry="10" fill="#FBBF24" stroke="#18181B" stroke-width="3" />
    <ellipse cx="7" cy="-14" rx="4.5" ry="6.5" fill="#18181B" />
    <circle cx="8.5" cy="-16.5" r="2" fill="#FFFFFF" />
    <!-- Brow Slash -->
    <path d="M -6 -24 C 6 -29, 20 -22, 24 -16" fill="none" stroke="#18181B" stroke-width="4.5" stroke-linecap="round" />

    <!-- Red Wattles (Barbillons) -->
    <path d="M 10 12 C 10 32, 22 52, 34 48 C 45 44, 42 20, 32 8 C 26 2, 18 2, 10 12 Z" 
          fill="#D8262C" stroke="#18181B" stroke-width="4.5" stroke-linejoin="round" />
    <path d="M 16 16 C 20 30, 28 42, 34 38" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" />

    <!-- Golden Sharp Beak -->
    <path d="M 24 -16 C 42 -16, 64 -5, 68 12 C 54 14, 34 12, 22 6 Z" 
          fill="#F59E0B" stroke="#18181B" stroke-width="4.5" stroke-linejoin="round" />
    <path d="M 24 6 C 38 12, 52 14, 60 13 C 48 20, 34 20, 22 13 Z" 
          fill="#D97706" stroke="#18181B" stroke-width="4" stroke-linejoin="round" />
    <!-- Beak Nostril -->
    <ellipse cx="33" cy="-7" rx="3" ry="1.8" fill="#18181B" transform="rotate(-12 33 -7)" />
  </g>

  <!-- BRAND NAME & SUBTITLE TEXT -->
  <g transform="translate(256, 380)">
    <text x="0" y="0" class="milgos-title">MILGO'S</text>
    <text x="0" y="28" class="milgos-sub">FIRED UP CHICKEN</text>
  </g>
</svg>`;

async function generateAssets() {
  const publicDir = path.join(process.cwd(), 'public');
  const distDir = path.join(process.cwd(), 'dist');

  // 1. Write public/logo.svg
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), SVG_LOGO.trim());
  console.log('Saved public/logo.svg');

  const svgBuffer = Buffer.from(SVG_LOGO);

  // 2. Generate PNG sizes
  const targets = [
    { name: 'logo.png', size: 512 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.png', size: 64 }
  ];

  for (const t of targets) {
    const pngBuf = await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png({ quality: 100 })
      .toBuffer();

    fs.writeFileSync(path.join(publicDir, t.name), pngBuf);
    console.log(`Generated public/${t.name} (${t.size}x${t.size})`);

    // If dist folder exists, sync it
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, t.name), pngBuf);
    }
  }

  // 3. Generate OG image (1200x630 with clean banner)
  const ogSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#FFFFFF" />
    <g transform="translate(100, 65)">
      ${SVG_LOGO.replace('<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">', '<g>').replace('</svg>', '</g>')}
    </g>
    <g transform="translate(680, 260)">
      <text x="0" y="0" font-family="'Impact', 'Montserrat', sans-serif" font-weight="900" font-size="76" fill="#D8262C" letter-spacing="3">MILGO'S</text>
      <text x="0" y="55" font-family="'Montserrat', sans-serif" font-weight="800" font-size="28" fill="#18181B" letter-spacing="4">FIRED UP CHICKEN</text>
      <rect x="0" y="80" width="160" height="6" fill="#D8262C" rx="3" />
      <text x="0" y="130" font-family="'Montserrat', sans-serif" font-weight="600" font-size="24" fill="#64748B">Système de Caisse POS &amp; Gestion de Commandes</text>
    </g>
  </svg>`;

  const ogBuf = await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogBuf);
  console.log('Generated public/og-image.png');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'og-image.png'), ogBuf);
  }

  console.log('All branding assets generated successfully!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
