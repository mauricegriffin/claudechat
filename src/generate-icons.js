// Simple script to generate placeholder PWA icons
// Run with: node src/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// Create a simple SVG icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1976d2"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.3}px" font-weight="bold">CC</text>
</svg>
`;

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');

// Generate SVG icons
sizes.forEach(size => {
  const svgContent = createSVG(size);
  const fileName = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, fileName), svgContent);
  console.log(`Generated ${fileName}`);
});

// Create safari pinned tab icon
const safariIcon = `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path fill="#000" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#000" font-family="Arial, sans-serif" font-size="8px" font-weight="bold">C</text>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg'), safariIcon);

console.log('Icon generation complete! Note: For production, replace these with proper PNG icons.');