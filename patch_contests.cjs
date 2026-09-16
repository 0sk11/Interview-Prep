const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'dsa_tracker_data.json');
const rawData = fs.readFileSync(dataFile, 'utf8');
const data = JSON.parse(rawData);

const newContests = [
  { id: 2, date: "2026-09-02", name: "Weekly Contest 402", before: 1512, after: 1550, penalty: 1, notes: "Solved 2 questions smoothly." },
  { id: 3, date: "2026-09-09", name: "Weekly Contest 403", before: 1550, after: 1592, penalty: 0, notes: "Solved 3 questions! Missed Q4 by a few edge cases." },
  { id: 4, date: "2026-09-16", name: "Biweekly Contest 129", before: 1592, after: 1610, penalty: 2, notes: "Tough DP problem." },
  { id: 5, date: "2026-09-23", name: "Weekly Contest 404", before: 1610, after: 1645, penalty: 0, notes: "Solid performance on graphs." },
  { id: 6, date: "2026-09-30", name: "Weekly Contest 405", before: 1645, after: 1690, penalty: 1, notes: "Almost got all 4!" },
  { id: 7, date: "2026-10-07", name: "Biweekly Contest 130", before: 1690, after: 1725, penalty: 0, notes: "Crossed 1700 milestone." },
  { id: 8, date: "2026-10-14", name: "Weekly Contest 406", before: 1725, after: 1740, penalty: 2, notes: "Slightly slow on Q3." },
  { id: 9, date: "2026-10-21", name: "Weekly Contest 407", before: 1740, after: 1782, penalty: 0, notes: "Solved 3 extremely fast." },
  { id: 10, date: "2026-10-28", name: "Biweekly Contest 131", before: 1782, after: 1801, penalty: 1, notes: "Hit 1800! Knight badge unlocked!" }
];

data.contests = [data.contests[0], ...newContests];
data.settings.currentRating = 1801;

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log("Contests patched successfully. Current rating: 1801");
