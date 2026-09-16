const fs = require('fs');
const path = require('path');

// --- HLD THEORY ---
const hldFile = path.join(__dirname, 'hld_tracker_data.json');
let hldData = JSON.parse(fs.readFileSync(hldFile, 'utf8'));

const hldTheory = [
  { id: "hld-th1", problem: "Theory: CAP Theorem & PACELC", topic: "Core Concepts", difficulty: "Easy", status: "Not Started", roi: "★★★★★", slug: "cap-theorem", url: "https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users" },
  { id: "hld-th2", problem: "Theory: Consistent Hashing", topic: "Core Concepts", difficulty: "Medium", status: "Not Started", roi: "★★★★★", slug: "consistent-hashing", url: "https://bytebytego.com/courses/system-design-interview/design-consistent-hashing" },
  { id: "hld-th3", problem: "Theory: Database Sharding & Partitioning", topic: "Data Storage", difficulty: "Medium", status: "Not Started", roi: "★★★★★", slug: "db-sharding", url: "https://github.com/donnemartin/system-design-primer#sharding" },
  { id: "hld-th4", problem: "Theory: SQL vs NoSQL", topic: "Data Storage", difficulty: "Easy", status: "Not Started", roi: "★★★★★", slug: "sql-nosql", url: "https://github.com/donnemartin/system-design-primer#sql-or-nosql" },
  { id: "hld-th5", problem: "Theory: Load Balancing & Caching Strategies", topic: "Infrastructure", difficulty: "Medium", status: "Not Started", roi: "★★★★★", slug: "load-balancing", url: "https://github.com/donnemartin/system-design-primer#load-balancer" },
  { id: "hld-th6", problem: "Theory: Microservices vs Monolith", topic: "Core Concepts", difficulty: "Easy", status: "Not Started", roi: "★★★★☆", slug: "microservices", url: "https://github.com/donnemartin/system-design-primer#microservices" },
  { id: "hld-th7", problem: "Theory: Consensus Algorithms (Paxos/Raft)", topic: "Advanced Concepts", difficulty: "Hard", status: "Not Started", roi: "★★★☆☆", slug: "consensus", url: "https://raft.github.io/" }
];

hldData.problems = [...hldTheory, ...hldData.problems];
fs.writeFileSync(hldFile, JSON.stringify(hldData, null, 2));

// --- LLD THEORY ---
const lldFile = path.join(__dirname, 'lld_tracker_data.json');
let lldData = JSON.parse(fs.readFileSync(lldFile, 'utf8'));

const lldTheory = [
  { id: "lld-th1", problem: "Theory: S.O.L.I.D. Principles", topic: "Object-Oriented Design", difficulty: "Medium", status: "Not Started", roi: "★★★★★", slug: "solid-principles", url: "https://www.freecodecamp.org/news/solid-principles-explained-in-plain-english/" },
  { id: "lld-th2", problem: "Theory: Creational Patterns (Singleton, Factory, Builder)", topic: "Design Patterns", difficulty: "Medium", status: "Not Started", roi: "★★★★★", slug: "creational-patterns", url: "https://refactoring.guru/design-patterns/creational-patterns" },
  { id: "lld-th3", problem: "Theory: Structural Patterns (Adapter, Decorator, Facade, Proxy)", topic: "Design Patterns", difficulty: "Medium", status: "Not Started", roi: "★★★★☆", slug: "structural-patterns", url: "https://refactoring.guru/design-patterns/structural-patterns" },
  { id: "lld-th4", problem: "Theory: Behavioral Patterns (Observer, Strategy, Command, State)", topic: "Design Patterns", difficulty: "Hard", status: "Not Started", roi: "★★★★★", slug: "behavioral-patterns", url: "https://refactoring.guru/design-patterns/behavioral-patterns" },
  { id: "lld-th5", problem: "Theory: Dependency Injection & IoC", topic: "Object-Oriented Design", difficulty: "Medium", status: "Not Started", roi: "★★★★☆", slug: "dependency-injection", url: "https://www.freecodecamp.org/news/a-quick-intro-to-dependency-injection-what-it-is-and-when-to-use-it-7578c84fa88f/" },
  { id: "lld-th6", problem: "Theory: Concurrency & Multithreading Basics", topic: "Advanced LLD", difficulty: "Hard", status: "Not Started", roi: "★★★★☆", slug: "concurrency", url: "https://github.com/prasadgujar/low-level-design-primer" }
];

lldData.problems = [...lldTheory, ...lldData.problems];
fs.writeFileSync(lldFile, JSON.stringify(lldData, null, 2));

console.log("Successfully added theory topics to HLD and LLD!");
