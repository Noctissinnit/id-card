const fs = require('fs');
const PNG = require('pngjs').PNG;

const filePath = 'd:/Projek/idcard/id-card/public/id-card-template.png';
fs.createReadStream(filePath)
  .pipe(new PNG())
  .on('parsed', function() {
    console.log(`Image size: ${this.width}x${this.height}`);
    
    // Check rightmost 5 columns (from x = width - 5 to width - 1)
    // for any white or transparent pixels in the middle rows (Y = 100 to 800)
    let whiteOrTransparentCount = 0;
    for (let y = 100; y < 800; y++) {
      for (let x = this.width - 5; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx+1];
        const b = this.data[idx+2];
        const a = this.data[idx+3];
        
        // If white (all channels > 240) or transparent (a < 100)
        if ((r > 240 && g > 240 && b > 240) || a < 100) {
          whiteOrTransparentCount++;
          console.log(`White/Transparent pixel found at X=${x}, Y=${y}: RGBA(${r}, ${g}, ${b}, ${a})`);
          if (whiteOrTransparentCount >= 10) {
            console.log('Truncating further logs...');
            return;
          }
        }
      }
    }
    
    console.log(`Total white/transparent pixels found on the rightmost 5 columns (Y=100-800): ${whiteOrTransparentCount}`);
  });
