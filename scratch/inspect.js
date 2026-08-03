const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

console.log('URL:', url);
const supabase = createClient(url, key);

async function inspect() {
  const { data, error } = await supabase.from('units').select('*');
  if (error) {
    console.error('Error fetching units:', error);
  } else {
    console.log('Units count:', data.length);
    data.forEach(u => {
      console.log(`Unit ID ${u.id}: ${u.nama}`);
      console.log(' - layout_config:', u.layout_config);
      console.log(' - card_design length:', u.card_design ? u.card_design.length : null);
    });
  }
}

inspect();
