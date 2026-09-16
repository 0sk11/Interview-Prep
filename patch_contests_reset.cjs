const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dsa_tracker_data.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const today = new Date().toISOString().split('T')[0];

data.contests = [{
  id: 1,
  date: today,
  name: 'Initial Rating',
  before: 1512,
  after: 1512,
  penalty: 0,
  notes: ''
}];

if (data.settings) {
  data.settings.currentRating = 1512;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Contests reset to initial state.');
