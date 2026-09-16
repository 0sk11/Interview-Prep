const fs = require('fs');
const https = require('https');

const API_URL = 'https://leetcode.com/api/problems/algorithms/';
const DATA_FILE = 'dsa_tracker_data.json';
const INITIAL_DATA_FILE = 'src/data/initialData.js';
const levels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Manual mapping for tricky problem names that fuzzy matching misses
const manualMap = {
  'Find Duplicate Number': 'find-the-duplicate-number',
  'Peak Index in Mountain Array': 'peak-index-in-a-mountain-array',
  'Aggressive Cows Pattern': 'magnetic-force-between-two-balls',
  'Single Element in Sorted Array': 'single-element-in-a-sorted-array',
  'Maximum Value at Given Index': 'maximum-value-at-a-given-index-in-a-bounded-array',
  'Product Except Self': 'product-of-array-except-self',
  'Count Nice Subarrays': 'count-number-of-nice-subarrays',
  'Maximum Score of Good Subarray': 'maximum-score-of-a-good-subarray',
  'Maximum Units on Truck': 'maximum-units-on-a-truck',
  'Level Order Traversal': 'binary-tree-level-order-traversal',
  'Zigzag Level Order': 'binary-tree-zigzag-level-order-traversal',
  'Validate BST': 'validate-binary-search-tree',
  'Kth Smallest in BST': 'kth-smallest-element-in-a-bst',
  'Construct Tree Pre+In': 'construct-binary-tree-from-preorder-and-inorder-traversal',
  'Serialize & Deserialize': 'serialize-and-deserialize-binary-tree',
  'Right Side View': 'binary-tree-right-side-view',
  'Count Complete Nodes': 'count-complete-tree-nodes',
  'Maximum Path Sum': 'binary-tree-maximum-path-sum',
  'Total Cost to Hire Workers': 'total-cost-to-hire-k-workers',
  'Kth Smallest in Matrix': 'kth-smallest-element-in-a-sorted-matrix',
  'Max Performance of Team': 'maximum-performance-of-a-team',
  'Minimum Refueling Stops': 'minimum-number-of-refueling-stops',
  'Connected Components': 'number-of-connected-components-in-an-undirected-graph',
  'Min Cost to Connect Points': 'min-cost-to-connect-all-points',
  'Detonate Maximum Bombs': 'detonate-the-maximum-bombs',
  'Eventual Safe States': 'find-eventual-safe-states',
  'Stock with Cooldown': 'best-time-to-buy-and-sell-stock-with-cooldown',
  'Bitwise AND of Range': 'bitwise-and-of-numbers-range',
  'Prefix XOR': 'find-the-original-array-of-prefix-xor',
  'Minimum Operations to Zero': 'minimum-operations-to-reduce-x-to-zero',
  'Wonderful Substrings': 'number-of-wonderful-substrings',
  'Smallest Subarrays OR': 'smallest-subarrays-with-maximum-bitwise-or',
  'Count XOR Triplets': 'count-triplets-that-can-form-two-arrays-of-equal-xor',
  'Djikstra Problem ': 'network-delay-time'
};

https.get(API_URL, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        const parsed = JSON.parse(data);
        const slugMap = new Map();
        const normTitleMap = new Map();
        const allProblems = [];
        
        for (const item of parsed.stat_status_pairs) {
            const slug = item.stat.question__title_slug;
            const title = item.stat.question__title;
            const diff = levels[item.difficulty.level];
            
            slugMap.set(slug, diff);
            normTitleMap.set(normalize(title), {slug, diff, title});
            allProblems.push({slug, diff, title, norm: normalize(title)});
        }
        
        const trackerData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        let updatedCount = 0;
        const unmatched = [];
        
        for (const p of trackerData.problems) {
            let matchedDiff = null;
            let matchedSlug = null;
            
            const pSlugClean = p.slug.trim();
            const pNameClean = p.problem.trim();
            const normP = normalize(pNameClean);
            
            // 1. Manual map check first
            if (manualMap[pNameClean] && slugMap.has(manualMap[pNameClean])) {
                matchedSlug = manualMap[pNameClean];
                matchedDiff = slugMap.get(matchedSlug);
            } 
            // 2. Exact slug match
            else if (slugMap.has(pSlugClean)) {
                matchedSlug = pSlugClean;
                matchedDiff = slugMap.get(pSlugClean);
            } 
            // 3. Exact normalized title match
            else if (normTitleMap.has(normP)) {
                matchedSlug = normTitleMap.get(normP).slug;
                matchedDiff = normTitleMap.get(normP).diff;
            } 
            // 4. Fuzzy Substring match
            else {
                let bestMatch = null;
                for (const lc of allProblems) {
                    if (lc.norm.includes(normP) || normP.includes(lc.norm)) {
                        if (lc.norm.startsWith(normP) || normP.startsWith(lc.norm)) {
                            bestMatch = lc;
                            break;
                        }
                    }
                }
                if (bestMatch) {
                    matchedSlug = bestMatch.slug;
                    matchedDiff = bestMatch.diff;
                }
            }
            
            if (matchedDiff) {
                if (p.difficulty !== matchedDiff) {
                    p.difficulty = matchedDiff;
                    updatedCount++;
                }
                if (matchedSlug && p.slug !== matchedSlug) {
                    p.slug = matchedSlug;
                }
            } else {
                unmatched.push(p.problem);
            }
        }
        
        console.log(`Matched and updated ${updatedCount} difficulties/slugs.`);
        if (unmatched.length > 0) {
            console.log(`Unmatched (${unmatched.length}):`, unmatched);
        }
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(trackerData, null, 2));
        
        const newFileContent = `
export const topics = [
  "Arrays", "Two Pointers", "Binary Search", "Prefix Sum", 
  "Greedy", "Trees", "Heaps", "Graphs", 
  "Dynamic Programming", "Bit Manipulation"
];

export const initialProblems = ${JSON.stringify(trackerData.problems, null, 2)};

export const studyGuides = {
  dsa: {
    patternBible: [
      { pattern: "Sliding Window", cue: "Longest/Shortest subarray", template: "expand/shrink", mistake: "forget shrink" },
      { pattern: "Binary Search on Answer", cue: "minimize/maximize", template: "while(low<high)", mistake: "mid update" },
      { pattern: "Prefix Sum", cue: "subarray sum", template: "hash map", mistake: "missing sum=0" },
      { pattern: "DFS", cue: "tree height/path", template: "postorder", mistake: "global state" },
      { pattern: "BFS", cue: "shortest path", template: "queue", mistake: "late visited" },
      { pattern: "Heap", cue: "top-k/stream", template: "priority_queue", mistake: "wrong heap" },
      { pattern: "Union Find", cue: "connectivity", template: "parent/rank", mistake: "no compression" },
      { pattern: "DP", cue: "optimal substructure", template: "state transition", mistake: "bad state" }
    ],
    companyFocus: [
      { company: "Amazon", topics: "Arrays, Trees, Graphs", problems: "Two Sum; Number of Islands; Diameter; Coin Change" },
      { company: "Google", topics: "Binary Search, Graphs, DP", problems: "Koko; LCA; LIS; Cheapest Flights" },
      { company: "Meta", topics: "Arrays, Trees", problems: "3Sum; House Robber; LCA" },
      { company: "Microsoft", topics: "Trees, Graphs", problems: "Number of Islands; Course Schedule" },
      { company: "Uber", topics: "Graphs, Heaps", problems: "Network Delay; K Closest Points" },
      { company: "Atlassian", topics: "Hash Maps, Graphs", problems: "Course Schedule; Top K Frequent" }
    ],
    roadmap: [
      { month: 1, focus: "Arrays + Two Pointers", goal: "Speed" },
      { month: 2, focus: "Binary Search + Prefix Sum", goal: "Pattern recognition" },
      { month: 3, focus: "Trees + Heaps", goal: "Implementation" },
      { month: 4, focus: "Graphs + DP", goal: "Interview mediums" },
      { month: 5, focus: "Mixed + Company prep", goal: "Mock interviews" },
      { month: 6, focus: "Revision + Contests", goal: "1800-ready" }
    ]
  }
};
`;
        fs.writeFileSync(INITIAL_DATA_FILE, newFileContent.trim());
        console.log('Successfully synced tracker data back to initialData.js!');
    });
});
