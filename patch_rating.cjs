const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dsa_tracker_data.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

if (data.settings) {
  data.settings.currentRating = 1512;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Reset rating to 1512 in dsa_tracker_data.json');
