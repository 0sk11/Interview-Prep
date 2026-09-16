const fs = require('fs');

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

let content = fs.readFileSync('src/data/initialData.js', 'utf8');

const match = content.match(/export const initialProblems = (\[[\s\S]*?\]);/);
if (match) {
  let probs = eval(match[1]); 
  probs = probs.map(p => {
    if (!p.suggestedSolution) p.suggestedSolution = template;
    return p;
  });
  content = content.replace(match[1], JSON.stringify(probs, null, 2));
  fs.writeFileSync('src/data/initialData.js', content);
  console.log('Updated initialData.js');
}
