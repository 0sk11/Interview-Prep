const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dsa_tracker_data.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const companyMap = {
  'two-sum': 'Amazon, Meta, Google',
  'contains-duplicate': 'Apple, Amazon',
  'valid-anagram': 'Uber, Meta',
  'group-anagrams': 'Amazon, Microsoft',
  'top-k-frequent-elements': 'Meta, Amazon, Google',
  'product-of-array-except-self': 'Amazon, Apple',
  'longest-consecutive-sequence': 'Google, Meta',
  'valid-palindrome': 'Meta, Spotify',
  '3sum': 'Meta, Amazon',
  'container-with-most-water': 'Google, Amazon',
  'sliding-window-maximum': 'Amazon, Google, Uber',
  'binary-search': 'Google, Microsoft'
};

data.problems = data.problems.map(p => {
  if (companyMap[p.slug]) {
    p.company = companyMap[p.slug];
  }
  return p;
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Patched companies!');
