import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Generate SVG string for Milgos logo
export function generateMilgosLogoSVG(width, height, isSquare = true) {
  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = (size / 2) * 0.94;
  
  // Red color palette
  const redPrimary = '#C7242A';
  const redDark = '#A3181D';
  const redLight = '#E0363C';
  const yellowBeak = '#F59E0B';
  const yellowBeakDark = '#D97706';
  const darkOutline = '#1A1A1A';

  // Generate the circular tribal geometric pattern around the rim
  const numTeeth = 36;
  const outerBorderItems = [];
  for (let i = 0; i < numTeeth; i++) {
    const angle = (i * 360) / numTeeth;
    const rad = (angle * Math.PI) / 180;
    
    // Pattern elements: alternating chevrons and diamonds
    const rOuter = radius * 0.96;
    const rMid = radius * 0.88;
    const rInner = radius * 0.80;

    outerBorderItems.push(`
      <g transform="rotate(${angle} ${cx} ${cy})">
        <!-- Chevron Outer -->
        <path d="M ${cx} ${cy - rOuter} L ${cx - radius * 0.04} ${cy - rMid} L ${cx - radius * 0.02} ${cy - rMid} L ${cx} ${cy - rOuter * 0.94} L ${cx + radius * 0.02} ${cy - rMid} L ${cx + radius * 0.04} ${cy - rMid} Z" fill="${redPrimary}" />
        <!-- Small triangle inner -->
        <polygon points="${cx},${cy - rInner} ${cx - radius * 0.025},${cy - rMid * 0.95} ${cx + radius * 0.025},${cy - rMid * 0.95}" fill="${redPrimary}" />
        <!-- Accent dot -->
        <circle cx="${cx}" cy="${cy - rMid * 1.05}" r="${radius * 0.012}" fill="${redPrimary}" />
      </g>
    `);
  }

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&amp;family=Outfit:wght@800;900&amp;family=Barlow+Condensed:wght@800;900&amp;display=swap');
        .milgos-title {
          font-family: 'Barlow Condensed', 'Impact', 'Outfit', sans-serif;
          font-weight: 900;
          font-size: ${size * 0.165}px;
          fill: ${redPrimary};
          letter-spacing: 2px;
          text-anchor: middle;
        }
        .milgos-sub {
          font-family: 'Montserrat', 'Outfit', sans-serif;
          font-weight: 800;
          font-size: ${size * 0.038}px;
          fill: ${redPrimary};
          letter-spacing: 2.5px;
          text-anchor: middle;
        }
      </style>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15" />
      </filter>
    </defs>

    <!-- White Background -->
    <rect width="${width}" height="${height}" fill="#FFFFFF" />

    <!-- Outer Circular Badge Frame -->
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#FFFFFF" stroke="${redPrimary}" stroke-width="${size * 0.012}" />
    <circle cx="${cx}" cy="${cy}" r="${radius * 0.77}" fill="#FFFFFF" stroke="${redPrimary}" stroke-width="${size * 0.008}" />

    <!-- Geometric Folk Border -->
    <g>
      ${outerBorderItems.join('')}
    </g>

    <!-- ROOSTER HEAD ILLUSTRATION (Vector Group) -->
    <g transform="translate(${cx}, ${cy - size * 0.06}) scale(${size / 400})">
      
      <!-- Comb (Crête rouge) -->
      <!-- Back Comb Petal -->
      <path d="M -42 -45 C -65 -65, -45 -110, -10 -90 C -5 -98, 15 -115, 30 -85 C 45 -105, 75 -90, 65 -60 C 80 -60, 85 -35, 60 -20 C 50 5, 20 10, -5 5 C -25 0, -40 -20, -42 -45 Z" 
            fill="${redPrimary}" stroke="${darkOutline}" stroke-width="4" stroke-linejoin="round" />
      
      <!-- Comb inner shadow detail -->
      <path d="M -30 -50 C -45 -70, -30 -95, -5 -80 C 10 -95, 30 -90, 40 -70 C 55 -75, 65 -55, 50 -35 C 40 -15, 15 -5, -15 -15 Z" 
            fill="${redLight}" opacity="0.4" />

      <!-- Neck & Head Feathers (Plumage Blanc) -->
      <path d="M -45 -25 C -45 -5, -60 15, -65 35 C -55 30, -45 35, -45 50 C -35 40, -25 45, -30 65 C -15 50, -5 55, -10 75 C 5 55, 20 60, 25 75 C 35 55, 45 60, 40 40 C 48 30, 45 10, 40 -5 C 35 -20, 20 -35, 0 -35 C -20 -35, -35 -35, -45 -25 Z" 
            fill="#FFFFFF" stroke="${darkOutline}" stroke-width="4" stroke-linejoin="round" />

      <!-- Head Feather Shading / Contour lines -->
      <path d="M -35 10 C -25 25, -30 45, -40 50" fill="none" stroke="${darkOutline}" stroke-width="3" stroke-linecap="round" />
      <path d="M -15 20 C -10 35, -15 55, -20 65" fill="none" stroke="${darkOutline}" stroke-width="3" stroke-linecap="round" />
      <path d="M 10 20 C 15 35, 10 55, 5 65" fill="none" stroke="${darkOutline}" stroke-width="3" stroke-linecap="round" />
      <path d="M -40 -10 C -30 -5, -15 -10, -5 -5" fill="none" stroke="${darkOutline}" stroke-width="3" stroke-linecap="round" />

      <!-- Red Ear / Side Feather Flare -->
      <path d="M -15 -15 C -25 -20, -35 -10, -30 5 C -25 15, -10 15, -5 0 Z" 
            fill="${redPrimary}" stroke="${darkOutline}" stroke-width="3" />

      <!-- Eye Area -->
      <ellipse cx="5" cy="-12" rx="7" ry="9" fill="${darkOutline}" />
      <circle cx="7" cy="-14" r="2.5" fill="#FFFFFF" />
      <!-- Brow -->
      <path d="M -5 -22 C 5 -26, 18 -20, 22 -15" fill="none" stroke="${darkOutline}" stroke-width="4" stroke-linecap="round" />

      <!-- Red Wattle (Barbillons sous le bec) -->
      <path d="M 10 12 C 10 30, 20 48, 30 45 C 40 42, 38 20, 30 10 C 25 5, 18 5, 10 12 Z" 
            fill="${redPrimary}" stroke="${darkOutline}" stroke-width="4" />
      <path d="M 15 16 C 18 28, 25 38, 30 35" fill="none" stroke="${redLight}" stroke-width="2.5" stroke-linecap="round" />

      <!-- Golden Beak (Bec Jaune) -->
      <path d="M 22 -15 C 38 -15, 58 -5, 62 10 C 50 12, 32 10, 20 5 Z" 
            fill="${yellowBeak}" stroke="${darkOutline}" stroke-width="4" stroke-linejoin="round" />
      <path d="M 22 5 C 35 10, 48 12, 55 11 C 45 18, 32 18, 20 12 Z" 
            fill="${yellowBeakDark}" stroke="${darkOutline}" stroke-width="3.5" stroke-linejoin="round" />
      <!-- Nostril -->
      <ellipse cx="30" cy="-6" rx="2.5" ry="1.5" fill="${darkOutline}" transform="rotate(-10 30 -6)" />
    </g>

    <!-- MILGO'S BRAND TEXT -->
    <g transform="translate(${cx}, ${cy + size * 0.23})">
      <text x="0" y="0" class="milgos-title">MILGO'S</text>
      <!-- Subtitle -->
      <text x="0" y="${size * 0.055}" class="milgos-sub">FIRED UP CHICKEN</text>
    </g>

  </svg>
  `;
}

async function buildAssets() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Assets to generate
  const targets = [
    { name: 'og-image.png', width: 1200, height: 630, isSquare: false },
    { name: 'icon-512.png', width: 512, height: 512, isSquare: true },
    { name: 'icon-192.png', width: 192, height: 192, isSquare: true },
    { name: 'apple-touch-icon.png', width: 180, height: 180, isSquare: true },
    { name: 'favicon.png', width: 64, height: 64, isSquare: true },
    { name: 'logo.png', width: 512, height: 512, isSquare: true },
  ];

  for (const t of targets) {
    const svg = generateMilgosLogoSVG(t.width, t.height, t.isSquare);
    const outputPath = path.join(publicDir, t.name);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${t.name} (${t.width}x${t.height})`);
  }

  // Also write SVG logo
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), generateMilgosLogoSVG(512, 512, true));
  console.log('Generated: logo.svg');
}

buildAssets().catch(console.error);
