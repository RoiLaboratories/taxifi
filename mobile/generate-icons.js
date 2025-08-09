const sharp = require('sharp');
const path = require('path');

// Source logo path with space-safe handling
const sourceLogo = path.join(__dirname, 'src', 'assets', 'images', 'taxifi logo.png');
const assetsDir = path.join(__dirname, 'assets');

async function generateIcons() {
  try {
    // Generate app icon (1024x1024)
    await sharp(sourceLogo)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(assetsDir, 'icon.png'));

    // Generate adaptive icon (1024x1024 with padding)
    await sharp(sourceLogo)
      .resize(768, 768, { // Smaller to allow for padding
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 128,
        bottom: 128,
        left: 128,
        right: 128,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));

    // Generate favicon (48x48)
    await sharp(sourceLogo)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(assetsDir, 'favicon.png'));

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
