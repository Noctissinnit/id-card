const fs = require('fs');
const PNG = require('pngjs').PNG;

const filePath = 'd:/Projek/idcard/id-card/public/id-card-template.png';
fs.createReadStream(filePath)
  .pipe(new PNG())
  .on('parsed', function() {
    console.log(`Image size: ${this.width}x${this.height}`);
    
    // Count how many rows at the bottom are pure white (or very close to white)
    // We check columns from x = 10 to width - 10
    let whiteRowsCount = 0;
    for (let y = this.height - 1; y >= 0; y--) {
      let isRowWhite = true;
      for (let x = 10; x < this.width - 10; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx+1];
        const b = this.data[idx+2];
        const a = this.data[idx+3];
        
        // If not white or is transparent
        if (r < 240 || g < 240 || b < 240 || a < 10) {
          isRowWhite = false;
          break;
        }
      }
      
      if (isRowWhite) {
        whiteRowsCount++;
      } else {
        break; // Stop at the first non-white row from the bottom
      }
    }
    
    console.log(`The template image itself has ${whiteRowsCount} rows of pure white at the bottom (out of ${this.height} total height)`);
    console.log(`Percentage of white space at the bottom of the file: ${(whiteRowsCount / this.height * 100).toFixed(2)}%`);
  });
