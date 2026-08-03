const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(url, key);

async function inspectImage() {
  const { data, error } = await supabase.from('units').select('card_design').eq('id', 1).single();
  if (error) {
    console.error('Error fetching unit:', error);
    return;
  }
  
  if (!data || !data.card_design) {
    console.log('No card design for unit 1');
    return;
  }
  
  const base64Data = data.card_design.split(';base64,')[1] || data.card_design;
  const buffer = Buffer.from(base64Data, 'base64');
  
  new PNG().parse(buffer, function(err, png) {
    if (err) {
      console.error('Error parsing PNG:', err);
      return;
    }
    
    console.log(`Uploaded design image dimensions: ${png.width}x${png.height}`);
    
    // Let's analyze the right edge of this uploaded image
    let whiteOrTransparentCount = 0;
    for (let y = 0; y < png.height; y++) {
      const idx = (png.width * y + (png.width - 1)) << 2;
      const r = png.data[idx];
      const g = png.data[idx+1];
      const b = png.data[idx+2];
      const a = png.data[idx+3];
      
      const isWhite = r > 240 && g > 240 && b > 240;
      const isTransparent = a < 10;
      
      if (isWhite || isTransparent) {
        whiteOrTransparentCount++;
      }
    }
    
    console.log(`Rightmost column has ${whiteOrTransparentCount} white/transparent pixels out of ${png.height}`);
    
    // Check pixel values at different rows on the right edge
    const positions = [0, Math.floor(png.height/4), Math.floor(png.height/2), Math.floor(png.height*3/4), png.height - 1];
    positions.forEach(y => {
      const idx = (png.width * y + (png.width - 1)) << 2;
      console.log(`At Y=${y}, right edge pixel: RGBA(${png.data[idx]}, ${png.data[idx+1]}, ${png.data[idx+2]}, ${png.data[idx+3]})`);
    });
  });
}

inspectImage();
