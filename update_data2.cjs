const fs = require('fs');

function slugify(name) {
    let s = name.toLowerCase();
    s = s.replace(/&/g, 'and').replace(/\+/g, '-plus-');
    s = s.replace(/[^a-z0-9]+/g, '-');
    s = s.replace(/^-|-$/g, '');
    return s;
}

const topicsDict = {
"Arrays":["Two Sum","Contains Duplicate","Valid Anagram","Group Anagrams","Top K Frequent Elements","Product of Array Except Self","Majority Element","Find All Numbers Disappeared","First Missing Positive","Longest Consecutive Sequence","Roman to Integer","Integer to Roman","Sort Colors","Merge Sorted Array","Intersection of Two Arrays","Subarray Sum Equals K","Continuous Subarray Sum","Degree of an Array","Find Pivot Index","Missing Number","Maximum Product Subarray","Set Matrix Zeroes","Spiral Matrix","Rotate Array","Find Duplicate Number"],
"Two Pointers":["Valid Palindrome","Two Sum II","3Sum","Container With Most Water","Move Zeroes","Remove Duplicates from Sorted Array","Squares of a Sorted Array","Longest Substring Without Repeating Characters","Longest Repeating Character Replacement","Permutation in String","Minimum Window Substring","Sliding Window Maximum","Max Consecutive Ones III","Fruit Into Baskets","Subarrays with K Different Integers","Binary Subarrays With Sum","Minimum Size Subarray Sum","Backspace String Compare","Trapping Rain Water","Boats to Save People","Sort Array By Parity","Is Subsequence","Reverse String","Reverse Vowels","Append Characters to String"],
"Binary Search":["Binary Search","Search Insert Position","Search in Rotated Sorted Array","Find Minimum in Rotated Sorted Array","First Bad Version","Guess Number Higher or Lower","Find Peak Element","Peak Index in Mountain Array","Search a 2D Matrix","Search a 2D Matrix II","Koko Eating Bananas","Capacity To Ship Packages Within D Days","Split Array Largest Sum","Aggressive Cows Pattern","Minimum Speed to Arrive on Time","Successful Pairs","Median of Two Sorted Arrays","Find First and Last Position","Time Based Key Value Store","Snapshot Array","Single Element in Sorted Array","Find Right Interval","Maximum Value at Given Index","Minimize Maximum of Array","Nth Magical Number"],
"Prefix Sum":["Running Sum","Range Sum Query","Subarray Sum Equals K","Continuous Subarray Sum","Maximum Size Subarray Sum Equals K","Corporate Flight Bookings","Car Pooling","Range Addition","Difference Between Ones and Zeros","Find Pivot Index","Product Except Self","Count Vowel Strings in Ranges","Shifting Letters","Grid Game","Make Sum Divisible by P","Maximum Average Subarray","Count Nice Subarrays","Minimum Operations to Reduce X","Subarray Product Less Than K","Longest Well Performing Interval","Maximum Score of Good Subarray","Count Number of Nice Subarrays","Ways to Split Array","Difference Array Template","Stamping the Grid"],
"Greedy":["Assign Cookies","Jump Game","Jump Game II","Gas Station","Partition Labels","Boats to Save People","Non-overlapping Intervals","Minimum Number of Arrows","Task Scheduler","Candy","Maximum Units on Truck","Lemonade Change","Can Place Flowers","Bag of Tokens","Wiggle Subsequence","Best Time to Buy and Sell Stock II","Maximum Ice Cream Bars","Reorganize String","Queue Reconstruction","Remove K Digits","Course Schedule III","Furthest Building","IPO","Minimum Cost to Connect Sticks","Put Marbles in Bags"],
"Trees":["Binary Tree Inorder Traversal","Maximum Depth of Binary Tree","Same Tree","Symmetric Tree","Invert Binary Tree","Diameter of Binary Tree","Balanced Binary Tree","Path Sum","Path Sum II","Binary Tree Level Order Traversal","Binary Tree Zigzag Level Order Traversal","Lowest Common Ancestor of a Binary Tree","Validate Binary Search Tree","Kth Smallest Element in a BST","Construct Binary Tree from Preorder and Inorder Traversal","Serialize and Deserialize Binary Tree","Binary Tree Right Side View","Count Complete Tree Nodes","House Robber III","Binary Tree Maximum Path Sum","Cousins in Binary Tree","Even Odd Tree","Add One Row to Tree","Sum Root to Leaf Numbers","Pseudo-Palindromic Paths in a Binary Tree"],
"Heaps":["Kth Largest Element in an Array","Top K Frequent Elements","Last Stone Weight","Find Median from Data Stream","Merge K Sorted Lists","K Closest Points to Origin","Meeting Rooms II","Task Scheduler","IPO","Smallest Range Covering Elements from K Lists","Seat Reservation Manager","Total Cost to Hire K Workers","Furthest Building You Can Reach","Minimum Cost to Connect Sticks","Take Gifts From the Richest Pile","Maximum Product After K Increments","Find K Pairs with Smallest Sums","Ugly Number II","Kth Smallest Element in a Sorted Matrix","Reorganize String","Sort Characters By Frequency","Sliding Window Median","Maximum Performance of a Team","Single-Threaded CPU","Minimum Number of Refueling Stops"],
"Graphs":["Number of Islands","Max Area of Island","Flood Fill","Rotting Oranges","Clone Graph","Course Schedule","Course Schedule II","Pacific Atlantic Water Flow","Surrounded Regions","Walls and Gates","Word Ladder","Open the Lock","Shortest Path in Binary Matrix","Network Delay Time","Cheapest Flights Within K Stops","Path With Minimum Effort","Redundant Connection","Number of Connected Components in an Undirected Graph","Accounts Merge","Most Stones Removed with Same Row or Column","Min Cost to Connect All Points","Evaluate Division","Detonate the Maximum Bombs","Find Eventual Safe States","Alien Dictionary"],
"Dynamic Programming":["Climbing Stairs","Min Cost Climbing Stairs","House Robber","House Robber II","Maximum Subarray","Coin Change","Combination Sum IV","Longest Increasing Subsequence","Longest Common Subsequence","Edit Distance","Decode Ways","Partition Equal Subset Sum","Target Sum","Perfect Squares","Unique Paths","Unique Paths II","Triangle","Minimum Path Sum","Word Break","Palindromic Substrings","Longest Palindromic Subsequence","Best Time to Buy and Sell Stock with Cooldown","Delete and Earn","Stone Game","Distinct Subsequences"],
"Bit Manipulation":["Single Number","Single Number II","Missing Number","Counting Bits","Reverse Bits","Number of 1 Bits","Power of Two","Power of Four","Bitwise AND of Numbers Range","Sum of Two Integers","Maximum XOR of Two Numbers in an Array","Subsets","Gray Code","Minimum Bit Flips to Convert Number","XOR Queries of a Subarray","Neighboring Bitwise XOR","Decode XORed Array","Find the Original Array of Prefix XOR","Minimum Operations to Make Integer Zero","Wonderful Substrings","Pseudo-Palindromic Paths in a Binary Tree","Longest Nice Subarray","Maximum OR","Smallest Subarrays With Maximum Bitwise OR","Count Triplets That Can Form Two Arrays of Equal XOR"]
};

let pid = 1;
const problems = [];
for (const [topic, problemList] of Object.entries(topicsDict)) {
    problemList.forEach((p, index) => {
        problems.push({
            id: pid++,
            topic: topic,
            problem: p,
            slug: slugify(p),
            difficulty: "Medium",
            roi: "★★★☆☆",
            company: "General",
            targetMin: 20,
            status: "Not Started",
            attempts: 0,
            actualMin: null,
            firstSolve: null,
            r3: null,
            r7: null,
            r21: null,
            r45: null,
            explain: 0,
            mistakeTag: '',
            notes: ''
        });
    });
}

const newFileContent = `
export const topics = [
  "Arrays", "Two Pointers", "Binary Search", "Prefix Sum", 
  "Greedy", "Trees", "Heaps", "Graphs", 
  "Dynamic Programming", "Bit Manipulation"
];

export const initialProblems = ${JSON.stringify(problems, null, 2)};

export const patternBible = [
  { pattern: "Sliding Window", cue: "Longest/Shortest subarray", template: "expand/shrink", mistake: "forget shrink" },
  { pattern: "Binary Search on Answer", cue: "minimize/maximize", template: "while(low<high)", mistake: "mid update" },
  { pattern: "Prefix Sum", cue: "subarray sum", template: "hash map", mistake: "missing sum=0" },
  { pattern: "DFS", cue: "tree height/path", template: "postorder", mistake: "global state" },
  { pattern: "BFS", cue: "shortest path", template: "queue", mistake: "late visited" },
  { pattern: "Heap", cue: "top-k/stream", template: "priority_queue", mistake: "wrong heap" },
  { pattern: "Union Find", cue: "connectivity", template: "parent/rank", mistake: "no compression" },
  { pattern: "DP", cue: "optimal substructure", template: "state transition", mistake: "bad state" }
];

export const companyFocus = [
  { company: "Amazon", topics: "Arrays, Trees, Graphs", problems: "Two Sum; Number of Islands; Diameter; Coin Change" },
  { company: "Google", topics: "Binary Search, Graphs, DP", problems: "Koko; LCA; LIS; Cheapest Flights" },
  { company: "Meta", topics: "Arrays, Trees", problems: "3Sum; House Robber; LCA" },
  { company: "Microsoft", topics: "Trees, Graphs", problems: "Number of Islands; Course Schedule" },
  { company: "Uber", topics: "Graphs, Heaps", problems: "Network Delay; K Closest Points" },
  { company: "Atlassian", topics: "Hash Maps, Graphs", problems: "Course Schedule; Top K Frequent" }
];

export const roadmap = [
  { month: 1, focus: "Arrays + Two Pointers", goal: "Speed" },
  { month: 2, focus: "Binary Search + Prefix Sum", goal: "Pattern recognition" },
  { month: 3, focus: "Trees + Heaps", goal: "Implementation" },
  { month: 4, focus: "Graphs + DP", goal: "Interview mediums" },
  { month: 5, focus: "Mixed + Company prep", goal: "Mock interviews" },
  { month: 6, focus: "Revision + Contests", goal: "1800-ready" }
];
`;

fs.writeFileSync('src/data/initialData.js', newFileContent.trim());
console.log('Updated initialData.js with 250 problems');
