// generateList.js
const fs = require('fs');
const path = require('path');

const frontDir = path.join(__dirname, 'front');
const files = fs.readdirSync(frontDir)
  .filter(f => f.toLowerCase().endsWith('.png'))
  .sort();

const list = files.map(file => {
  // strip extension, convert underscores to spaces and uppercase
  let name = path.basename(file, '.png')
                 .replace(/_/g, ' ')
                 .toUpperCase();
  return { file, name };
});

console.log(JSON.stringify(list, null, 2));
