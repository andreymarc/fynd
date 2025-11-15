#!/usr/bin/env node

/**
 * Simple script to generate PWA icons from a source image
 * Usage: node scripts/generate-icons.js [source-image] [output-dir]
 * 
 * Requires: sharp (npm install -D sharp)
 * Or use an online tool: https://realfavicongenerator.net/
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = process.argv[2] || 'public/logo.jpg';
const outputDir = process.argv[3] || 'public/icons';

console.log('📱 PWA Icon Generator');
console.log('====================');
console.log(`Source: ${sourceImage}`);
console.log(`Output: ${outputDir}`);
console.log('');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('❌ Sharp not found. Install it with: npm install -D sharp');
  console.log('');
  console.log('Alternatively, use an online tool:');
  console.log('1. Visit https://realfavicongenerator.net/');
  console.log('2. Upload your logo.jpg');
  console.log('3. Download the generated icons');
  console.log('4. Place them in public/icons/');
  process.exit(1);
}

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate icons
async function generateIcons() {
  try {
    if (!fs.existsSync(sourceImage)) {
      console.log(`❌ Source image not found: ${sourceImage}`);
      process.exit(1);
    }

    console.log('Generating icons...');
    
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputPath}`);
    }
    
    console.log('');
    console.log('✅ All icons generated successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the icons in public/icons/');
    console.log('2. Rebuild: npm run build');
    console.log('3. Test PWA installation on your device');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

