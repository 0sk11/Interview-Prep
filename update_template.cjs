const fs = require('fs');
const path = require('path');
const dataFile = path.join(__dirname, 'dsa_tracker_data.json');

const template = `### Flow
[Describe the high level flow of the algorithm]

### Intuition
[Explain why this approach works]

### Brute Force
[Naive approach with time/space complexity]

### Optimal Solution
[Best approach with code and time/space complexity]

### Interview Tips
[Gotchas, edge cases, what the interviewer looks for]`;

if (fs.existsSync(dataFile)) {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  if (data.problems) {
    data.problems = data.problems.map(p => {
      if (!p.suggestedSolution) {
        p.suggestedSolution = template;
      }
      return p;
    });
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log('Updated dsa_tracker_data.json with templates');
  }
} else {
  console.log('dsa_tracker_data.json not found');
}
