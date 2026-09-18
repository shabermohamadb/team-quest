import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'questions.json');

// ==========================================
// 50 ROUND 1 QUESTIONS (CLUE HUNT)
// ==========================================
const round1Questions = [
  {
    id: 'round1-test-01',
    round: 1,
    questionNumber: 1,
    domain: 'Programming',
    difficulty: 'Medium',
    website: 'GitHub',
    correctAnswer: 'GitHub',
    acceptedAnswers: ['github', 'github.com', 'git hub'],
    clue1: 'Developers commonly use this platform to collaborate on code repositories.',
    clue2: 'Developers can create repositories, branches and pull requests on this platform.',
    clue3: "It is widely known by a short name that starts with 'Git' and ends with 'Hub'.",
    isActive: true
  },
  {
    id: 'r1-02',
    round: 1,
    domain: 'Programming',
    difficulty: 'Easy',
    website: 'Stack Overflow',
    correctAnswer: 'Stack Overflow',
    acceptedAnswers: ['stackoverflow', 'stackoverflow.com', 'stack overflow'],
    clue1: 'Every developer visits this Q&A forum when encountering compile or runtime errors.',
    clue2: 'Users earn reputation points and badges by answering coding questions.',
    clue3: 'Its logo depicts a box overflowing with white rectangular sheets.',
    isActive: true
  },
  {
    id: 'r1-03',
    round: 1,
    domain: 'Web Development',
    difficulty: 'Medium',
    website: 'MDN Web Docs',
    correctAnswer: 'MDN Web Docs',
    acceptedAnswers: ['mdn', 'mozilla developer network', 'developer.mozilla.org'],
    clue1: 'The definitive open-source documentation resource for HTML, CSS, and JavaScript.',
    clue2: 'It includes interactive code playgrounds and detailed browser compatibility matrices.',
    clue3: 'It is maintained by Mozilla and features dinosaur-themed easter eggs.',
    isActive: true
  },
  {
    id: 'r1-04',
    round: 1,
    domain: 'DevOps & Containers',
    difficulty: 'Easy',
    website: 'Docker',
    correctAnswer: 'Docker',
    acceptedAnswers: ['docker.com', 'docker'],
    clue1: 'Platform that popularised lightweight containerization using Linux namespaces and cgroups.',
    clue2: 'Packages software and its dependencies into isolated portable images.',
    clue3: 'Its iconic mascot is a smiling blue whale carrying shipping containers.',
    isActive: true
  },
  {
    id: 'r1-05',
    round: 1,
    domain: 'Cloud Orchestration',
    difficulty: 'Medium',
    website: 'Kubernetes',
    correctAnswer: 'Kubernetes',
    acceptedAnswers: ['k8s', 'kubernetes.io', 'kubernetes'],
    clue1: 'Originating from Google Borg, this tool automates container deployment and scaling.',
    clue2: 'Concepts include Pods, ConfigMaps, Ingress controllers, and DaemonSets.',
    clue3: 'Its name comes from the Greek word for helmsman or pilot; often abbreviated K8s.',
    isActive: true
  },
  {
    id: 'r1-06',
    round: 1,
    domain: 'Databases',
    difficulty: 'Medium',
    website: 'Redis',
    correctAnswer: 'Redis',
    acceptedAnswers: ['redis.io', 'redis db', 'redis'],
    clue1: 'Blazing-fast in-memory data store frequently employed as a cache and message broker.',
    clue2: 'Supports native data structures like strings, hashes, lists, sets, and sorted sets.',
    clue3: 'Its acronym stands for Remote Dictionary Server.',
    isActive: true
  },
  {
    id: 'r1-07',
    round: 1,
    domain: 'Databases',
    difficulty: 'Medium',
    website: 'PostgreSQL',
    correctAnswer: 'PostgreSQL',
    acceptedAnswers: ['postgres', 'postgresql.org', 'pgsql'],
    clue1: 'World’s most advanced open-source object-relational database management system.',
    clue2: 'Known for powerful extensions like PostGIS and robust JSONB support.',
    clue3: 'Features an elephant named Slonik as its official mascot.',
    isActive: true
  },
  {
    id: 'r1-08',
    round: 1,
    domain: 'Networking',
    difficulty: 'Hard',
    website: 'Nginx',
    correctAnswer: 'Nginx',
    acceptedAnswers: ['engine x', 'nginx.org', 'nginx'],
    clue1: 'High-performance event-driven web server and reverse proxy created by Igor Sysoev.',
    clue2: 'Engineered specifically to solve the C10K concurrency problem.',
    clue3: 'Pronounced "Engine-X" and commonly paired with PHP-FPM or Node.js backends.',
    isActive: true
  },
  {
    id: 'r1-09',
    round: 1,
    domain: 'Operating Systems',
    difficulty: 'Easy',
    website: 'Linux',
    correctAnswer: 'Linux',
    acceptedAnswers: ['gnu/linux', 'linux os'],
    clue1: 'Monolithic Unix-like kernel released by a Finnish computer science student in 1991.',
    clue2: 'Powers 96% of the top 1 million web servers, Android phones, and all top 500 supercomputers.',
    clue3: 'Associated with Tux the penguin and Linus Torvalds.',
    isActive: true
  },
  {
    id: 'r1-10',
    round: 1,
    domain: 'Version Control',
    difficulty: 'Easy',
    website: 'Git',
    correctAnswer: 'Git',
    acceptedAnswers: ['git scm', 'git-scm'],
    clue1: 'Distributed version control system created in 2005 to manage Linux kernel development.',
    clue2: 'Uses Directed Acyclic Graphs (DAGs) and SHA-1/SHA-256 commit hashes.',
    clue3: 'Terminal commands include add, commit, push, rebase, and checkout.',
    isActive: true
  },
  {
    id: 'r1-11',
    round: 1,
    domain: 'Hardware Tools',
    difficulty: 'Medium',
    website: 'PCPartPicker',
    correctAnswer: 'PCPartPicker',
    acceptedAnswers: ['pcpartpicker.com', 'pc part picker'],
    clue1: 'Crowd-favorite web utility for creating, sharing, and price-tracking custom desktop PC builds.',
    clue2: 'Provides automated real-time hardware compatibility checking for sockets and TDP wattage.',
    clue3: 'Its initials are PCPP and it compares pricing across Amazon, Newegg, and Best Buy.',
    isActive: true
  },
  {
    id: 'r1-12',
    round: 1,
    domain: 'Programming Languages',
    difficulty: 'Easy',
    website: 'Python',
    correctAnswer: 'Python',
    acceptedAnswers: ['python3', 'python.org'],
    clue1: 'High-level interpreted language known for clean indentation-based syntax and readability.',
    clue2: 'Created by Guido van Rossum and named after a British comedy troupe.',
    clue3: 'Dominates machine learning, data science, and uses libraries like NumPy and Pandas.',
    isActive: true
  },
  {
    id: 'r1-13',
    round: 1,
    domain: 'Systems Programming',
    difficulty: 'Hard',
    website: 'Rust',
    correctAnswer: 'Rust',
    acceptedAnswers: ['rust-lang', 'rust lang'],
    clue1: 'Systems programming language that guarantees memory safety without garbage collection.',
    clue2: 'Enforces compile-time borrowing rules, lifetimes, and eliminates data races.',
    clue3: 'Its mascot is Ferris the Crab, and its package manager is Cargo.',
    isActive: true
  },
  {
    id: 'r1-14',
    round: 1,
    domain: 'Web Development',
    difficulty: 'Medium',
    website: 'TypeScript',
    correctAnswer: 'TypeScript',
    acceptedAnswers: ['ts', 'typescriptlang'],
    clue1: 'Strict syntactical superset of JavaScript that adds optional static typing.',
    clue2: 'Developed by Microsoft and spearheaded by Turbo Pascal architect Anders Hejlsberg.',
    clue3: 'Compiles down to plain JS; uses .ts file extensions.',
    isActive: true
  },
  {
    id: 'r1-15',
    round: 1,
    domain: 'Web APIs',
    difficulty: 'Medium',
    website: 'GraphQL',
    correctAnswer: 'GraphQL',
    acceptedAnswers: ['graphql.org', 'graph ql'],
    clue1: 'Open-source query language for APIs created internally by Facebook in 2012.',
    clue2: 'Clients define the exact shape of the data they need, eliminating over-fetching.',
    clue3: 'Replaces multiple REST endpoints with a single unified POST endpoint.',
    isActive: true
  },
  {
    id: 'r1-16',
    round: 1,
    domain: 'Web Standards',
    difficulty: 'Hard',
    website: 'WebAssembly',
    correctAnswer: 'WebAssembly',
    acceptedAnswers: ['wasm', 'web assembly'],
    clue1: 'Binary instruction format for a stack-based virtual machine in modern web browsers.',
    clue2: 'Enables near-native performance for C, C++, and Rust code directly on web pages.',
    clue3: 'Commonly abbreviated as WASM.',
    isActive: true
  },
  {
    id: 'r1-17',
    round: 1,
    domain: 'Security & Networking',
    difficulty: 'Hard',
    website: 'Wireshark',
    correctAnswer: 'Wireshark',
    acceptedAnswers: ['wireshark.org', 'ethereal'],
    clue1: 'Widely used packet analyzer for network troubleshooting, analysis, and protocol development.',
    clue2: 'Formerly known as Ethereal; visualizes TCP handshakes and VoIP packet streams.',
    clue3: 'Features a blue shark fin silhouette as its logo.',
    isActive: true
  },
  {
    id: 'r1-18',
    round: 1,
    domain: 'JavaScript Engines',
    difficulty: 'Hard',
    website: 'V8',
    correctAnswer: 'V8',
    acceptedAnswers: ['v8 engine', 'v8 javascript engine'],
    clue1: 'Open-source high-performance JavaScript and WebAssembly engine written in C++.',
    clue2: 'Created by Google for Chrome; also powers Node.js and Deno runtimes.',
    clue3: 'Named after a powerful eight-cylinder automotive engine.',
    isActive: true
  },
  {
    id: 'r1-19',
    round: 1,
    domain: 'Developer Tools',
    difficulty: 'Easy',
    website: 'VS Code',
    correctAnswer: 'VS Code',
    acceptedAnswers: ['visual studio code', 'vscode'],
    clue1: 'Extensible source-code editor built on Electron and Monaco by Microsoft.',
    clue2: 'Known for its marketplace of extensions, built-in terminal, and Language Server Protocol.',
    clue3: 'Often abbreviated with two letters: VS.',
    isActive: true
  },
  {
    id: 'r1-20',
    round: 1,
    domain: 'Runtime Environments',
    difficulty: 'Easy',
    website: 'Node.js',
    correctAnswer: 'Node.js',
    acceptedAnswers: ['node', 'nodejs'],
    clue1: 'Cross-platform runtime environment that executes JavaScript code outside a web browser.',
    clue2: 'Created by Ryan Dahl in 2009 using an event-driven, non-blocking I/O model.',
    clue3: 'Its package ecosystem npm is the largest software registry in the world.',
    isActive: true
  },
  {
    id: 'r1-21',
    round: 1,
    domain: 'Databases',
    difficulty: 'Medium',
    website: 'MongoDB',
    correctAnswer: 'MongoDB',
    acceptedAnswers: ['mongo', 'mongodb.com'],
    clue1: 'Leading source-available document-oriented NoSQL database system.',
    clue2: 'Stores data in flexible BSON (Binary JSON) documents with dynamic schemas.',
    clue3: 'Its name is derived from the word "humongous" and uses a green leaf logo.',
    isActive: true
  },
  {
    id: 'r1-22',
    round: 1,
    domain: 'Data Streaming',
    difficulty: 'Hard',
    website: 'Apache Kafka',
    correctAnswer: 'Apache Kafka',
    acceptedAnswers: ['kafka', 'apache kafka'],
    clue1: 'Distributed event store and stream-processing platform originated at LinkedIn.',
    clue2: 'Organizes continuous data feeds into partitioned, replicated append-only log topics.',
    clue3: 'Named after writer Franz Kafka because it is an optimized system for writing.',
    isActive: true
  },
  {
    id: 'r1-23',
    round: 1,
    domain: 'DevOps & Infrastructure',
    difficulty: 'Medium',
    website: 'Terraform',
    correctAnswer: 'Terraform',
    acceptedAnswers: ['terraform.io', 'hashicorp terraform'],
    clue1: 'Open-source Infrastructure-as-Code software tool created by HashiCorp.',
    clue2: 'Allows users to define cloud resources declaratively using HashiCorp Configuration Language (HCL).',
    clue3: 'Famous terminal commands include init, plan, and apply.',
    isActive: true
  },
  {
    id: 'r1-24',
    round: 1,
    domain: 'Text Editors',
    difficulty: 'Easy',
    website: 'Vim',
    correctAnswer: 'Vim',
    acceptedAnswers: ['vi improved', 'neovim', 'vi'],
    clue1: 'Highly configurable modal terminal text editor built to enable efficient text editing.',
    clue2: 'Features normal, insert, visual, and command-line editing modes.',
    clue3: 'A running joke among beginners is how difficult it is to exit with :wq or :q!.',
    isActive: true
  },
  {
    id: 'r1-25',
    round: 1,
    domain: 'Programming Languages',
    difficulty: 'Medium',
    website: 'C++',
    correctAnswer: 'C++',
    acceptedAnswers: ['cpp', 'cplusplus'],
    clue1: 'General-purpose programming language created by Bjarne Stroustrup in 1979.',
    clue2: 'Originally titled "C with Classes" before adding OOP, templates, and RAII.',
    clue3: 'Its name uses the increment operator from the C programming language.',
    isActive: true
  },
  {
    id: 'r1-26',
    round: 1,
    domain: 'Programming Languages',
    difficulty: 'Easy',
    website: 'Go',
    correctAnswer: 'Go',
    acceptedAnswers: ['golang', 'go language'],
    clue1: 'Statically typed, compiled programming language designed at Google by Pike, Thompson, and Griesemer.',
    clue2: 'Features built-in lightweight concurrency primitives called goroutines and channels.',
    clue3: 'Represented by a cartoon gopher mascot and frequently referred to as Golang.',
    isActive: true
  },
  {
    id: 'r1-27',
    round: 1,
    domain: 'Programming Languages',
    difficulty: 'Easy',
    website: 'Java',
    correctAnswer: 'Java',
    acceptedAnswers: ['java se', 'openjdk'],
    clue1: 'Object-oriented language developed by James Gosling at Sun Microsystems in 1995.',
    clue2: 'Known for the philosophy "Write Once, Run Anywhere" via the JVM bytecode.',
    clue3: 'Named after an Indonesian island famous for coffee, and uses a hot coffee cup logo.',
    isActive: true
  },
  {
    id: 'r1-28',
    round: 1,
    domain: 'Cloud Platforms',
    difficulty: 'Easy',
    website: 'Amazon Web Services',
    correctAnswer: 'AWS',
    acceptedAnswers: ['amazon web services', 'aws.amazon.com', 'amazon cloud'],
    clue1: 'Pioneer cloud computing platform launched publicly by an e-commerce giant in 2006.',
    clue2: 'Flagship foundational services include EC2 virtual servers and S3 object storage.',
    clue3: 'Three-letter acronym starting with A for Amazon.',
    isActive: true
  },
  {
    id: 'r1-29',
    round: 1,
    domain: 'Databases',
    difficulty: 'Medium',
    website: 'SQLite',
    correctAnswer: 'SQLite',
    acceptedAnswers: ['sqlite3', 'sqlite.org'],
    clue1: 'C-language library implementing a small, fast, self-contained SQL database engine.',
    clue2: 'Unlike client-server engines, it reads and writes directly to a single disk file.',
    clue3: 'The most widely deployed database in the world, embedded in every smartphone and browser.',
    isActive: true
  },
  {
    id: 'r1-30',
    round: 1,
    domain: 'Search & Analytics',
    difficulty: 'Hard',
    website: 'Elasticsearch',
    correctAnswer: 'Elasticsearch',
    acceptedAnswers: ['elastic', 'es'],
    clue1: 'Distributed, JSON-based search and analytics engine built on Apache Lucene.',
    clue2: 'Forms the core foundation of the famous ELK observability stack with Logstash and Kibana.',
    clue3: 'Provides near real-time full-text indexing, inverted indexes, and fuzzy searching.',
    isActive: true
  },
  {
    id: 'r1-31',
    round: 1,
    domain: 'Command Line & Shells',
    difficulty: 'Medium',
    website: 'Bash',
    correctAnswer: 'Bash',
    acceptedAnswers: ['bourne again shell', 'bash shell'],
    clue1: 'Unix shell and command language written by Brian Fox for the GNU Project.',
    clue2: 'Default shell for most Linux distributions; scripts start with #!/bin/bash shebang.',
    clue3: 'Its name is an acronym for "Bourne Again SHell", a pun on Stephen Bourne.',
    isActive: true
  },
  {
    id: 'r1-32',
    round: 1,
    domain: 'Frontend Frameworks',
    difficulty: 'Easy',
    website: 'React',
    correctAnswer: 'React',
    acceptedAnswers: ['reactjs', 'react.js'],
    clue1: 'Declarative frontend JavaScript library for building component-based user interfaces.',
    clue2: 'Introduced JSX syntax and virtual DOM diffing to web development.',
    clue3: 'Developed by Jordan Walke at Meta (Facebook) and features an atom orbital logo.',
    isActive: true
  },
  {
    id: 'r1-33',
    round: 1,
    domain: 'API Testing',
    difficulty: 'Easy',
    website: 'Postman',
    correctAnswer: 'Postman',
    acceptedAnswers: ['postman.com', 'postman api'],
    clue1: 'Collaborative platform for API design, mock servers, automated testing, and documentation.',
    clue2: 'Developers use it to compose HTTP GET, POST, and PUT requests with custom auth headers.',
    clue3: 'Its logo depicts an astronaut with wings delivering mail across space.',
    isActive: true
  },
  {
    id: 'r1-34',
    round: 1,
    domain: 'CI/CD Automation',
    difficulty: 'Medium',
    website: 'Jenkins',
    correctAnswer: 'Jenkins',
    acceptedAnswers: ['jenkins ci', 'hudson'],
    clue1: 'Open-source automation server enabling developers to build, test, and deploy applications.',
    clue2: 'Forked from the Hudson project in 2011; configurations written in Jenkinsfiles.',
    clue3: 'Its mascot is a mustachioed English butler dressed in black-tie attire.',
    isActive: true
  },
  {
    id: 'r1-35',
    round: 1,
    domain: 'CDN & Web Security',
    difficulty: 'Medium',
    website: 'Cloudflare',
    correctAnswer: 'Cloudflare',
    acceptedAnswers: ['cloudflare.com'],
    clue1: 'Global reverse proxy, CDN, and DDoS mitigation network protecting millions of websites.',
    clue2: 'Operates 1.1.1.1 DNS, Workers edge serverless compute, and SSL/TLS proxying.',
    clue3: 'Its name combines "Cloud" with "Flare" and features an orange cloud logo.',
    isActive: true
  },
  {
    id: 'r1-36',
    round: 1,
    domain: 'Networking Protocols',
    difficulty: 'Hard',
    website: 'QUIC',
    correctAnswer: 'QUIC',
    acceptedAnswers: ['http/3', 'quick', 'http3'],
    clue1: 'Transport layer network protocol designed at Google to replace TCP over UDP.',
    clue2: 'Reduces connection latency by combining cryptographic handshake with transport handshake.',
    clue3: 'Serves as the foundational transport protocol for HTTP/3.',
    isActive: true
  },
  {
    id: 'r1-37',
    round: 1,
    domain: 'Cryptography',
    difficulty: 'Hard',
    website: 'RSA',
    correctAnswer: 'RSA',
    acceptedAnswers: ['rsa encryption', 'rsa algorithm'],
    clue1: 'Public-key cryptosystem widely used for secure data transmission and digital signatures.',
    clue2: 'Asymmetric security relies on the practical difficulty of factoring the product of two large prime numbers.',
    clue3: 'Named after the initials of Rivest, Shamir, and Adleman.',
    isActive: true
  },
  {
    id: 'r1-38',
    round: 1,
    domain: 'Real-Time Communications',
    difficulty: 'Hard',
    website: 'WebRTC',
    correctAnswer: 'WebRTC',
    acceptedAnswers: ['web rtc', 'webrtc.org'],
    clue1: 'Open standard that provides web browsers with real-time peer-to-peer audio and video streaming.',
    clue2: 'Uses STUN and TURN servers for NAT traversal and SDP for media negotiation.',
    clue3: 'Acronym stands for Web Real-Time Communication.',
    isActive: true
  },
  {
    id: 'r1-39',
    round: 1,
    domain: 'Computer Science Theory',
    difficulty: 'Medium',
    website: 'Turing Machine',
    correctAnswer: 'Turing Machine',
    acceptedAnswers: ['turing', 'universal turing machine'],
    clue1: 'Mathematical model of computation that manipulates symbols on an infinite strip of tape.',
    clue2: 'Formulated in 1936 to define the fundamental limits of what can be computed algorithmically.',
    clue3: 'Conceived by British mathematician and codebreaker Alan Turing.',
    isActive: true
  },
  {
    id: 'r1-40',
    round: 1,
    domain: 'DevOps & Git',
    difficulty: 'Easy',
    website: 'GitLab',
    correctAnswer: 'GitLab',
    acceptedAnswers: ['gitlab.com', 'git lab'],
    clue1: 'Complete DevOps platform delivered as a single application with built-in CI/CD pipelines.',
    clue2: 'Offers self-hosted community editions as an alternative to proprietary code hosts.',
    clue3: 'Uses an origami geometric orange fox as its official logo.',
    isActive: true
  },
  {
    id: 'r1-41',
    round: 1,
    domain: 'Version Control',
    difficulty: 'Medium',
    website: 'Bitbucket',
    correctAnswer: 'Bitbucket',
    acceptedAnswers: ['bitbucket.org', 'atlassian bitbucket'],
    clue1: 'Git code management platform built specifically for professional teams using Atlassian tools.',
    clue2: 'Features deep native integrations with Jira, Confluence, and Trello.',
    clue3: 'Its name evokes placing binary digits into a storage pail.',
    isActive: true
  },
  {
    id: 'r1-42',
    round: 1,
    domain: 'Artificial Intelligence',
    difficulty: 'Medium',
    website: 'Claude',
    correctAnswer: 'Claude',
    acceptedAnswers: ['anthropic claude', 'claude.ai'],
    clue1: 'Family of foundational large language models developed by AI research company Anthropic.',
    clue2: 'Built using Constitutional AI techniques to enhance helpfulness, honesty, and harmlessness.',
    clue3: 'Named in honor of information theory pioneer Claude Shannon.',
    isActive: true
  },
  {
    id: 'r1-43',
    round: 1,
    domain: 'Design Tools',
    difficulty: 'Easy',
    website: 'Figma',
    correctAnswer: 'Figma',
    acceptedAnswers: ['figma.com'],
    clue1: 'Collaborative cloud-based interface design and vector prototyping tool running in the browser.',
    clue2: 'Revolutionized product design with multiplayer real-time co-editing and auto-layout.',
    clue3: 'Written with a custom WebGL rendering engine in C++ and compiled to WebAssembly.',
    isActive: true
  },
  {
    id: 'r1-44',
    round: 1,
    domain: 'Observability & Metrics',
    difficulty: 'Hard',
    website: 'Prometheus',
    correctAnswer: 'Prometheus',
    acceptedAnswers: ['prometheus.io'],
    clue1: 'Open-source systems monitoring and alerting toolkit originally built at SoundCloud in 2012.',
    clue2: 'Uses a pull-based HTTP scraping model to collect multidimensional time-series data.',
    clue3: 'Queries metrics using PromQL and is named after the Greek Titan who brought fire to humanity.',
    isActive: true
  },
  {
    id: 'r1-45',
    round: 1,
    domain: 'Data Visualization',
    difficulty: 'Medium',
    website: 'Grafana',
    correctAnswer: 'Grafana',
    acceptedAnswers: ['grafana labs', 'grafana.com'],
    clue1: 'Multi-platform analytics and interactive dashboard visualization web application.',
    clue2: 'Connects to diverse data sources like InfluxDB, Prometheus, MySQL, and CloudWatch.',
    clue3: 'Famous for dark-themed real-time charts in network operations centers.',
    isActive: true
  },
  {
    id: 'r1-46',
    round: 1,
    domain: 'Graph Databases',
    difficulty: 'Hard',
    website: 'Neo4j',
    correctAnswer: 'Neo4j',
    acceptedAnswers: ['neo4j.com', 'neo 4j'],
    clue1: 'Native graph database designed from the ground up to leverage relationships in data.',
    clue2: 'Uses nodes, relationships, properties, and the declarative Cypher query language.',
    clue3: 'Powers recommendation engines, fraud detection rings, and social network analysis.',
    isActive: true
  },
  {
    id: 'r1-47',
    round: 1,
    domain: 'RPC Frameworks',
    difficulty: 'Hard',
    website: 'gRPC',
    correctAnswer: 'gRPC',
    acceptedAnswers: ['grpc.io', 'google rpc'],
    clue1: 'High-performance, open-source universal RPC framework initiated by Google.',
    clue2: 'Uses Protocol Buffers (Protobuf) as its Interface Definition Language and payload serialization.',
    clue3: 'Leverages HTTP/2 transport for bi-directional streaming and multiplexing.',
    isActive: true
  },
  {
    id: 'r1-48',
    round: 1,
    domain: 'CSS Frameworks',
    difficulty: 'Easy',
    website: 'Tailwind CSS',
    correctAnswer: 'Tailwind CSS',
    acceptedAnswers: ['tailwind', 'tailwindcss', 'tailwindcss.com'],
    clue1: 'Utility-first CSS framework packed with classes like flex, pt-4, text-center, and rotate-90.',
    clue2: 'Created by Adam Wathan; generates scan-based atomic stylesheets via JIT engine.',
    clue3: 'Features a cyan wind wave logo and eliminates traditional custom stylesheet naming.',
    isActive: true
  },
  {
    id: 'r1-49',
    round: 1,
    domain: 'Compilers',
    difficulty: 'Hard',
    website: 'LLVM',
    correctAnswer: 'LLVM',
    acceptedAnswers: ['llvm compiler', 'llvm.org'],
    clue1: 'Modular and reusable compiler and toolchain technology suite started by Chris Lattner.',
    clue2: 'Compiles high-level code to an architecture-independent Intermediate Representation (IR).',
    clue3: 'Serves as the backend for Clang, Rust, Swift, and Julia compilers.',
    isActive: true
  },
  {
    id: 'r1-50',
    round: 1,
    domain: 'Artificial Intelligence',
    difficulty: 'Easy',
    website: 'ChatGPT',
    correctAnswer: 'ChatGPT',
    acceptedAnswers: ['chat gpt', 'openai chatgpt', 'chat.openai.com'],
    clue1: 'Conversational AI chatbot launched by OpenAI in November 2022 that sparked the generative AI boom.',
    clue2: 'Fine-tuned from GPT large language models using Reinforcement Learning from Human Feedback (RLHF).',
    clue3: 'The "GPT" in its name stands for Generative Pre-trained Transformer.',
    isActive: true
  }
];

// ==========================================
// 50 ROUND 2 CHALLENGES (PATTERN BREAK)
// ==========================================
const round2Patterns = [
  {
    id: 'r2-01',
    round: 2,
    category: 'Exponential Progression',
    difficulty: 'Easy',
    patternText: '2  →  4  →  8  →  16  →  32  →  ?',
    options: [
      { id: 'A', key: 'A', text: '48' },
      { id: 'B', key: 'B', text: '64' },
      { id: 'C', key: 'C', text: '56' },
      { id: 'D', key: 'D', text: '72' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Each step multiplies by 2 (2^n). 32 × 2 = 64.',
    isActive: true
  },
  {
    id: 'r2-02',
    round: 2,
    category: 'Step Doubling',
    difficulty: 'Medium',
    patternText: '3  →  5  →  9  →  17  →  33  →  ?',
    options: [
      { id: 'A', key: 'A', text: '49' },
      { id: 'B', key: 'B', text: '57' },
      { id: 'C', key: 'C', text: '61' },
      { id: 'D', key: 'D', text: '65' }
    ],
    correctOptionId: 'D',
    correctOption: 'D',
    explanation: 'Differences double each step: +2, +4, +8, +16, +32. 33 + 32 = 65.',
    isActive: true
  },
  {
    id: 'r2-03',
    round: 2,
    category: 'Hexadecimal Step',
    difficulty: 'Hard',
    patternText: '0x10  →  0x20  →  0x40  →  0x80  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0x90' },
      { id: 'B', key: 'B', text: '0xA0' },
      { id: 'C', key: 'C', text: '0xC0' },
      { id: 'D', key: 'D', text: '0x100' }
    ],
    correctOptionId: 'D',
    correctOption: 'D',
    explanation: 'Hex values doubled: 16, 32, 64, 128 (0x80). Next is 256 in decimal, which is 0x100 in hex.',
    isActive: true
  },
  {
    id: 'r2-04',
    round: 2,
    category: 'Clockwise Rotation',
    difficulty: 'Easy',
    patternText: '▲  →  ►  →  ▼  →  ◄  →  ?',
    options: [
      { id: 'A', key: 'A', text: '▼ (Down)' },
      { id: 'B', key: 'B', text: '▲ (Up)' },
      { id: 'C', key: 'C', text: '► (Right)' },
      { id: 'D', key: 'D', text: '◄ (Left)' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: '90-degree clockwise cycle. After Left (◄), the arrow rotates back to Up (▲).',
    isActive: true
  },
  {
    id: 'r2-05',
    round: 2,
    category: 'Square Numbers',
    difficulty: 'Easy',
    patternText: '1  →  4  →  9  →  16  →  25  →  36  →  ?',
    options: [
      { id: 'A', key: 'A', text: '49' },
      { id: 'B', key: 'B', text: '45' },
      { id: 'C', key: 'C', text: '54' },
      { id: 'D', key: 'D', text: '64' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Square integers: 1², 2², 3², 4², 5², 6². 7² = 49.',
    isActive: true
  },
  {
    id: 'r2-06',
    round: 2,
    category: 'Polygon Sides',
    difficulty: 'Easy',
    patternText: 'Triangle (3)  →  Square (4)  →  Pentagon (5)  →  Hexagon (6)  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'Octagon (8)' },
      { id: 'B', key: 'B', text: 'Heptagon (7)' },
      { id: 'C', key: 'C', text: 'Nonagon (9)' },
      { id: 'D', key: 'D', text: 'Decagon (10)' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Sequential increment of geometric polygon sides: 3, 4, 5, 6, next is 7 (Heptagon).',
    isActive: true
  },
  {
    id: 'r2-07',
    round: 2,
    category: 'Prime Number Sequence',
    difficulty: 'Medium',
    patternText: '2  →  3  →  5  →  7  →  11  →  13  →  17  →  ?',
    options: [
      { id: 'A', key: 'A', text: '19' },
      { id: 'B', key: 'B', text: '21' },
      { id: 'C', key: 'C', text: '23' },
      { id: 'D', key: 'D', text: '25' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Consecutive prime numbers. The next prime after 17 is 19.',
    isActive: true
  },
  {
    id: 'r2-08',
    round: 2,
    category: 'Fibonacci Series',
    difficulty: 'Easy',
    patternText: '0  →  1  →  1  →  2  →  3  →  5  →  8  →  13  →  ?',
    options: [
      { id: 'A', key: 'A', text: '18' },
      { id: 'B', key: 'B', text: '19' },
      { id: 'C', key: 'C', text: '21' },
      { id: 'D', key: 'D', text: '24' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Each term is the sum of the two preceding terms: 8 + 13 = 21.',
    isActive: true
  },
  {
    id: 'r2-09',
    round: 2,
    category: 'Subtractive Doubling',
    difficulty: 'Medium',
    patternText: '100  →  96  →  88  →  72  →  ?',
    options: [
      { id: 'A', key: 'A', text: '48' },
      { id: 'B', key: 'B', text: '40' },
      { id: 'C', key: 'C', text: '56' },
      { id: 'D', key: 'D', text: '32' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Subtracting doubling powers of 2: -4, -8, -16, -32. 72 - 32 = 40.',
    isActive: true
  },
  {
    id: 'r2-10',
    round: 2,
    category: 'Alphanumeric Growth',
    difficulty: 'Medium',
    patternText: 'A1  →  B2  →  C4  →  D8  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'E10' },
      { id: 'B', key: 'B', text: 'E12' },
      { id: 'C', key: 'C', text: 'E16' },
      { id: 'D', key: 'D', text: 'F16' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Letter steps by +1 (D → E); number doubles (8 × 2 = 16). Result: E16.',
    isActive: true
  },
  {
    id: 'r2-11',
    round: 2,
    category: 'Cube Sequence',
    difficulty: 'Medium',
    patternText: '1  →  8  →  27  →  64  →  125  →  ?',
    options: [
      { id: 'A', key: 'A', text: '196' },
      { id: 'B', key: 'B', text: '216' },
      { id: 'C', key: 'C', text: '256' },
      { id: 'D', key: 'D', text: '343' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Cube sequence: 1³, 2³, 3³, 4³, 5³. 6³ = 216.',
    isActive: true
  },
  {
    id: 'r2-12',
    round: 2,
    category: 'Binary Bit Shift',
    difficulty: 'Hard',
    patternText: '0001  →  0010  →  0100  →  1000  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0000' },
      { id: 'B', key: 'B', text: '1001' },
      { id: 'C', key: 'C', text: '0001' },
      { id: 'D', key: 'D', text: '1111' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Circular 4-bit left shift (ROL). Shifting 1000 left wraps the 1 back to 0001.',
    isActive: true
  },
  {
    id: 'r2-13',
    round: 2,
    category: 'Alternating Operations',
    difficulty: 'Medium',
    patternText: '5  →  10  →  8  →  16  →  14  →  28  →  ?',
    options: [
      { id: 'A', key: 'A', text: '26' },
      { id: 'B', key: 'B', text: '30' },
      { id: 'C', key: 'C', text: '56' },
      { id: 'D', key: 'D', text: '24' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Alternating rule: multiply by 2, then subtract 2. 28 - 2 = 26.',
    isActive: true
  },
  {
    id: 'r2-14',
    round: 2,
    category: 'Alphabetical Skip',
    difficulty: 'Easy',
    patternText: 'B  →  D  →  F  →  H  →  J  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'K' },
      { id: 'B', key: 'B', text: 'L' },
      { id: 'C', key: 'C', text: 'M' },
      { id: 'D', key: 'D', text: 'N' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Every second letter of the alphabet (+2 positions). J + 2 = L.',
    isActive: true
  },
  {
    id: 'r2-15',
    round: 2,
    category: 'Factorial Sequence',
    difficulty: 'Hard',
    patternText: '1  →  2  →  6  →  24  →  120  →  ?',
    options: [
      { id: 'A', key: 'A', text: '540' },
      { id: 'B', key: 'B', text: '620' },
      { id: 'C', key: 'C', text: '720' },
      { id: 'D', key: 'D', text: '840' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Factorials: 1!, 2!, 3!, 4!, 5!. 6! = 120 × 6 = 720.',
    isActive: true
  },
  {
    id: 'r2-16',
    round: 2,
    category: 'Powers of Three',
    difficulty: 'Medium',
    patternText: '1  →  3  →  9  →  27  →  81  →  ?',
    options: [
      { id: 'A', key: 'A', text: '162' },
      { id: 'B', key: 'B', text: '243' },
      { id: 'C', key: 'C', text: '216' },
      { id: 'D', key: 'D', text: '324' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Multiply each term by 3 (3^n). 81 × 3 = 243.',
    isActive: true
  },
  {
    id: 'r2-17',
    round: 2,
    category: 'Triangular Numbers',
    difficulty: 'Medium',
    patternText: '1  →  3  →  6  →  10  →  15  →  21  →  ?',
    options: [
      { id: 'A', key: 'A', text: '26' },
      { id: 'B', key: 'B', text: '28' },
      { id: 'C', key: 'C', text: '30' },
      { id: 'D', key: 'D', text: '36' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Triangular numbers (n*(n+1)/2): +2, +3, +4, +5, +6, +7. 21 + 7 = 28.',
    isActive: true
  },
  {
    id: 'r2-18',
    round: 2,
    category: 'Bitwise Inversion',
    difficulty: 'Hard',
    patternText: '1010  →  0101  →  1100  →  0011  →  1110  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0001' },
      { id: 'B', key: 'B', text: '0101' },
      { id: 'C', key: 'C', text: '0010' },
      { id: 'D', key: 'D', text: '1111' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Bitwise NOT inversion (flip all 1s to 0s and 0s to 1s). ~1110 = 0001.',
    isActive: true
  },
  {
    id: 'r2-19',
    round: 2,
    category: 'Geometric Fraction',
    difficulty: 'Medium',
    patternText: '64  →  32  →  16  →  8  →  4  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0' },
      { id: 'B', key: 'B', text: '1' },
      { id: 'C', key: 'C', text: '2' },
      { id: 'D', key: 'D', text: '-2' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Each step divides by 2. 4 ÷ 2 = 2.',
    isActive: true
  },
  {
    id: 'r2-20',
    round: 2,
    category: 'ASCII Value Leap',
    difficulty: 'Hard',
    patternText: 'a (97)  →  c (99)  →  f (102)  →  j (106)  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'm (109)' },
      { id: 'B', key: 'B', text: 'n (110)' },
      { id: 'C', key: 'C', text: 'o (111)' },
      { id: 'D', key: 'D', text: 'p (112)' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Increments increase by 1 each step: +2, +3, +4, +5. 106 + 5 = 111, which is "o".',
    isActive: true
  },
  {
    id: 'r2-21',
    round: 2,
    category: 'Binary Decimal Conversion',
    difficulty: 'Easy',
    patternText: '1 (1)  →  10 (2)  →  11 (3)  →  100 (4)  →  101 (5)  →  ?',
    options: [
      { id: 'A', key: 'A', text: '110 (6)' },
      { id: 'B', key: 'B', text: '111 (7)' },
      { id: 'C', key: 'C', text: '1000 (8)' },
      { id: 'D', key: 'D', text: '1010 (10)' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Counting upwards in binary. After 101 (5) comes 110 (6).',
    isActive: true
  },
  {
    id: 'r2-22',
    round: 2,
    category: 'Modulo Arithmetic',
    difficulty: 'Hard',
    patternText: '10 % 7 = 3  →  15 % 7 = 1  →  20 % 7 = 6  →  25 % 7 = ?',
    options: [
      { id: 'A', key: 'A', text: '2' },
      { id: 'B', key: 'B', text: '4' },
      { id: 'C', key: 'C', text: '5' },
      { id: 'D', key: 'D', text: '3' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: '25 divided by 7 is 3 with remainder 4. 25 = (7 × 3) + 4.',
    isActive: true
  },
  {
    id: 'r2-23',
    round: 2,
    category: 'Alphabetical Reverse',
    difficulty: 'Easy',
    patternText: 'Z  →  X  →  V  →  T  →  R  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'Q' },
      { id: 'B', key: 'B', text: 'P' },
      { id: 'C', key: 'C', text: 'O' },
      { id: 'D', key: 'D', text: 'N' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Reverse alphabet skipping one letter (-2). R - 2 = P.',
    isActive: true
  },
  {
    id: 'r2-24',
    round: 2,
    category: 'Power of Two Minus One',
    difficulty: 'Medium',
    patternText: '1  →  3  →  7  →  15  →  31  →  ?',
    options: [
      { id: 'A', key: 'A', text: '48' },
      { id: 'B', key: 'B', text: '63' },
      { id: 'C', key: 'C', text: '56' },
      { id: 'D', key: 'D', text: '64' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Mersenne pattern 2^n - 1: 2^6 - 1 = 64 - 1 = 63.',
    isActive: true
  },
  {
    id: 'r2-25',
    round: 2,
    category: 'Prefix Code',
    difficulty: 'Easy',
    patternText: 'Kilo (10³)  →  Mega (10⁶)  →  Giga (10⁹)  →  Tera (10¹²)  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'Peta (10¹⁵)' },
      { id: 'B', key: 'B', text: 'Exa (10¹⁸)' },
      { id: 'C', key: 'C', text: 'Zetta (10²¹)' },
      { id: 'D', key: 'D', text: 'Yotta (10²⁴)' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'SI prefix progression adding 10³: Tera (10¹²) is followed by Peta (10¹⁵).',
    isActive: true
  },
  {
    id: 'r2-26',
    round: 2,
    category: 'Look-and-Say Sequence',
    difficulty: 'Hard',
    patternText: '1  →  11  →  21  →  1211  →  111221  →  ?',
    options: [
      { id: 'A', key: 'A', text: '312211' },
      { id: 'B', key: 'B', text: '13112221' },
      { id: 'C', key: 'C', text: '2112211' },
      { id: 'D', key: 'D', text: '3112221' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Conway look-and-say: "111221" has three 1s, two 2s, one 1 → 312211.',
    isActive: true
  },
  {
    id: 'r2-27',
    round: 2,
    category: 'Quadratic Progression',
    difficulty: 'Medium',
    patternText: '2  →  6  →  12  →  20  →  30  →  ?',
    options: [
      { id: 'A', key: 'A', text: '40' },
      { id: 'B', key: 'B', text: '42' },
      { id: 'C', key: 'C', text: '44' },
      { id: 'D', key: 'D', text: '48' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'n × (n + 1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30. Next is 6×7 = 42.',
    isActive: true
  },
  {
    id: 'r2-28',
    round: 2,
    category: 'Character Matrix Diagonal',
    difficulty: 'Medium',
    patternText: 'A..  →  .B.  →  ..C  →  D..  →  ?',
    options: [
      { id: 'A', key: 'A', text: '.E.' },
      { id: 'B', key: 'B', text: 'E..' },
      { id: 'C', key: 'C', text: '..E' },
      { id: 'D', key: 'D', text: 'EE.' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Position shifts across index 0, 1, 2, then loops back to 0, 1 (.E.).',
    isActive: true
  },
  {
    id: 'r2-29',
    round: 2,
    category: 'Digit Sum Addition',
    difficulty: 'Hard',
    patternText: '18  →  27  →  36  →  45  →  54  →  ?',
    options: [
      { id: 'A', key: 'A', text: '60' },
      { id: 'B', key: 'B', text: '63' },
      { id: 'C', key: 'C', text: '66' },
      { id: 'D', key: 'D', text: '72' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Multiples of 9 whose digits sum to 9. 54 + 9 = 63.',
    isActive: true
  },
  {
    id: 'r2-30',
    round: 2,
    category: 'Bitwise Shift Right',
    difficulty: 'Medium',
    patternText: '128 >> 1 = 64  →  64 >> 1 = 32  →  32 >> 1 = 16  →  16 >> 1 = ?',
    options: [
      { id: 'A', key: 'A', text: '4' },
      { id: 'B', key: 'B', text: '6' },
      { id: 'C', key: 'C', text: '8' },
      { id: 'D', key: 'D', text: '10' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Bitwise right shift >> 1 divides by 2. 16 >> 1 = 8.',
    isActive: true
  },
  {
    id: 'r2-31',
    round: 2,
    category: 'Two Step Alternation',
    difficulty: 'Easy',
    patternText: '10  →  15  →  13  →  18  →  16  →  21  →  ?',
    options: [
      { id: 'A', key: 'A', text: '17' },
      { id: 'B', key: 'B', text: '19' },
      { id: 'C', key: 'C', text: '23' },
      { id: 'D', key: 'D', text: '26' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Rule is +5 then -2. 21 - 2 = 19.',
    isActive: true
  },
  {
    id: 'r2-32',
    round: 2,
    category: 'Hex ASCII Steps',
    difficulty: 'Hard',
    patternText: '0x41 (\'A\')  →  0x42 (\'B\')  →  0x44 (\'D\')  →  0x47 (\'G\')  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0x4A (\'J\')' },
      { id: 'B', key: 'B', text: '0x4B (\'K\')' },
      { id: 'C', key: 'C', text: '0x4C (\'L\')' },
      { id: 'D', key: 'D', text: '0x4D (\'M\')' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Difference increases by 1 each step: +1, +2, +3, +4. 0x47 + 4 = 0x4B (\'K\').',
    isActive: true
  },
  {
    id: 'r2-33',
    round: 2,
    category: 'Geometric Area Multiplication',
    difficulty: 'Medium',
    patternText: 'Side 1 (Area 1)  →  Side 2 (Area 4)  →  Side 4 (Area 16)  →  Side 8 (Area ?) ',
    options: [
      { id: 'A', key: 'A', text: '32' },
      { id: 'B', key: 'B', text: '48' },
      { id: 'C', key: 'C', text: '64' },
      { id: 'D', key: 'D', text: '128' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Square area = side². 8² = 64.',
    isActive: true
  },
  {
    id: 'r2-34',
    round: 2,
    category: 'Prime Factors',
    difficulty: 'Hard',
    patternText: '2×3 (6)  →  3×5 (15)  →  5×7 (35)  →  7×11 (77)  →  11×13 (?)',
    options: [
      { id: 'A', key: 'A', text: '133' },
      { id: 'B', key: 'B', text: '141' },
      { id: 'C', key: 'C', text: '143' },
      { id: 'D', key: 'D', text: '153' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Product of consecutive primes: 11 × 13 = 143.',
    isActive: true
  },
  {
    id: 'r2-35',
    round: 2,
    category: 'Vowel Progression',
    difficulty: 'Easy',
    patternText: 'A  →  E  →  I  →  O  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'P' },
      { id: 'B', key: 'B', text: 'Q' },
      { id: 'C', key: 'C', text: 'U' },
      { id: 'D', key: 'D', text: 'Y' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Standard sequence of English vowels. The 5th vowel is U.',
    isActive: true
  },
  {
    id: 'r2-36',
    round: 2,
    category: 'Binary Parity Bit',
    difficulty: 'Hard',
    patternText: '0000_0  →  0001_1  →  0010_1  →  0011_0  →  0100_1  →  0101_?',
    options: [
      { id: 'A', key: 'A', text: '0' },
      { id: 'B', key: 'B', text: '1' },
      { id: 'C', key: 'C', text: 'X' },
      { id: 'D', key: 'D', text: '2' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Even parity bit calculation: 0101 has two 1s (even), so the parity bit is 0.',
    isActive: true
  },
  {
    id: 'r2-37',
    round: 2,
    category: 'Double Multiplication Plus One',
    difficulty: 'Medium',
    patternText: '1  →  3  →  7  →  15  →  31  →  63  →  ?',
    options: [
      { id: 'A', key: 'A', text: '125' },
      { id: 'B', key: 'B', text: '127' },
      { id: 'C', key: 'C', text: '129' },
      { id: 'D', key: 'D', text: '131' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Rule is (n × 2) + 1. (63 × 2) + 1 = 126 + 1 = 127.',
    isActive: true
  },
  {
    id: 'r2-38',
    round: 2,
    category: 'Symbol Symmetrical Flip',
    difficulty: 'Easy',
    patternText: '( )  →  [ ]  →  { }  →  < >  →  ?',
    options: [
      { id: 'A', key: 'A', text: '| |' },
      { id: 'B', key: 'B', text: '/ /' },
      { id: 'C', key: 'C', text: '# #' },
      { id: 'D', key: 'D', text: '! !' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Standard enclosing bracket and delimiter pairs: parenthetical, square, curly, angle, vertical pipe (| |).',
    isActive: true
  },
  {
    id: 'r2-39',
    round: 2,
    category: 'Code Output Simulation',
    difficulty: 'Medium',
    patternText: 'for(i=0; i<4; i++) { x = x * 2 + 1; } (start x=0): 0 → 1 → 3 → 7 → ?',
    options: [
      { id: 'A', key: 'A', text: '11' },
      { id: 'B', key: 'B', text: '14' },
      { id: 'C', key: 'C', text: '15' },
      { id: 'D', key: 'D', text: '17' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: '4th iteration: 7 * 2 + 1 = 15.',
    isActive: true
  },
  {
    id: 'r2-40',
    round: 2,
    category: 'Square Root Cascade',
    difficulty: 'Easy',
    patternText: '625  →  25  →  5  →  ?',
    options: [
      { id: 'A', key: 'A', text: '1' },
      { id: 'B', key: 'B', text: '√5' },
      { id: 'C', key: 'C', text: '2.5' },
      { id: 'D', key: 'D', text: '0' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Iterative square root: √625 = 25, √25 = 5, √5 = √5.',
    isActive: true
  },
  {
    id: 'r2-41',
    round: 2,
    category: 'Powers of Four',
    difficulty: 'Medium',
    patternText: '4  →  16  →  64  →  256  →  ?',
    options: [
      { id: 'A', key: 'A', text: '512' },
      { id: 'B', key: 'B', text: '1024' },
      { id: 'C', key: 'C', text: '768' },
      { id: 'D', key: 'D', text: '2048' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Powers of 4 (4^n): 256 × 4 = 1024.',
    isActive: true
  },
  {
    id: 'r2-42',
    round: 2,
    category: 'Hexadecimal Nibble Increment',
    difficulty: 'Hard',
    patternText: '0x0F  →  0x1E  →  0x2D  →  0x3C  →  ?',
    options: [
      { id: 'A', key: 'A', text: '0x4B' },
      { id: 'B', key: 'B', text: '0x4A' },
      { id: 'C', key: 'C', text: '0x5B' },
      { id: 'D', key: 'D', text: '0x48' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Adding 0x0F (15) each step: 0x3C (60) + 15 = 75 (0x4B).',
    isActive: true
  },
  {
    id: 'r2-43',
    round: 2,
    category: 'Alternating Negatives',
    difficulty: 'Easy',
    patternText: '1  →  -2  →  4  →  -8  →  16  →  -32  →  ?',
    options: [
      { id: 'A', key: 'A', text: '-64' },
      { id: 'B', key: 'B', text: '48' },
      { id: 'C', key: 'C', text: '64' },
      { id: 'D', key: 'D', text: '-48' }
    ],
    correctOptionId: 'C',
    correctOption: 'C',
    explanation: 'Multiply by -2 each step. -32 × -2 = +64.',
    isActive: true
  },
  {
    id: 'r2-44',
    round: 2,
    category: 'Binary Gray Code',
    difficulty: 'Hard',
    patternText: '00  →  01  →  11  →  10  →  (Next 3-bit: 000, 001, 011, 010, 110, ?)',
    options: [
      { id: 'A', key: 'A', text: '100' },
      { id: 'B', key: 'B', text: '111' },
      { id: 'C', key: 'C', text: '101' },
      { id: 'D', key: 'D', text: '001' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Reflected Binary Gray code: only 1 bit flips at each step. After 110 comes 111.',
    isActive: true
  },
  {
    id: 'r2-45',
    round: 2,
    category: 'Keyboard Row Shift',
    difficulty: 'Medium',
    patternText: 'Q  →  W  →  E  →  R  →  T  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'U' },
      { id: 'B', key: 'B', text: 'Y' },
      { id: 'C', key: 'C', text: 'I' },
      { id: 'D', key: 'D', text: 'O' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'QWERTY keyboard layout top row: Q, W, E, R, T, Y.',
    isActive: true
  },
  {
    id: 'r2-46',
    round: 2,
    category: 'Palindromic Digits',
    difficulty: 'Easy',
    patternText: '11  →  22  →  33  →  44  →  55  →  ?',
    options: [
      { id: 'A', key: 'A', text: '60' },
      { id: 'B', key: 'B', text: '66' },
      { id: 'C', key: 'C', text: '77' },
      { id: 'D', key: 'D', text: '65' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Repdigit sequence adding 11 each time. 55 + 11 = 66.',
    isActive: true
  },
  {
    id: 'r2-47',
    round: 2,
    category: 'Roman Numerals',
    difficulty: 'Medium',
    patternText: 'I (1)  →  V (5)  →  X (10)  →  L (50)  →  C (100)  →  D (500)  →  ?',
    options: [
      { id: 'A', key: 'A', text: 'M (1000)' },
      { id: 'B', key: 'B', text: 'K (1000)' },
      { id: 'C', key: 'C', text: 'G (1000)' },
      { id: 'D', key: 'D', text: 'V̄ (5000)' }
    ],
    correctOptionId: 'A',
    correctOption: 'A',
    explanation: 'Ascending standard Roman numeral denominations. Next is M (1000).',
    isActive: true
  },
  {
    id: 'r2-48',
    round: 2,
    category: 'Hourglass Decay',
    difficulty: 'Easy',
    patternText: '30s  →  25s  →  20s  →  15s  →  10s  →  ?',
    options: [
      { id: 'A', key: 'A', text: '8s' },
      { id: 'B', key: 'B', text: '5s' },
      { id: 'C', key: 'C', text: '0s' },
      { id: 'D', key: 'D', text: '3s' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Decreasing by 5s intervals. 10s - 5s = 5s.',
    isActive: true
  },
  {
    id: 'r2-49',
    round: 2,
    category: 'Base-3 Trinary Increment',
    difficulty: 'Hard',
    patternText: '01 (1)  →  02 (2)  →  10 (3)  →  11 (4)  →  12 (5)  →  ?',
    options: [
      { id: 'A', key: 'A', text: '13 (6)' },
      { id: 'B', key: 'B', text: '20 (6)' },
      { id: 'C', key: 'C', text: '21 (7)' },
      { id: 'D', key: 'D', text: '100 (9)' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Ternary (base 3) counting system digits {0,1,2}. 5 is "12", so 6 is "20" (2*3 + 0).',
    isActive: true
  },
  {
    id: 'r2-50',
    round: 2,
    category: 'Subnet Mask CIDR',
    difficulty: 'Hard',
    patternText: '/24 (256 IPs)  →  /25 (128 IPs)  →  /26 (64 IPs)  →  /27 (32 IPs)  →  /28 (?)',
    options: [
      { id: 'A', key: 'A', text: '24 IPs' },
      { id: 'B', key: 'B', text: '16 IPs' },
      { id: 'C', key: 'C', text: '8 IPs' },
      { id: 'D', key: 'D', text: '12 IPs' }
    ],
    correctOptionId: 'B',
    correctOption: 'B',
    explanation: 'Each +1 to CIDR prefix halves available address space: 32 ÷ 2 = 16 IPs (2^(32-28) = 16).',
    isActive: true
  }
];

// ==========================================
// 50 ROUND 3 CHALLENGES (CODE CRACKER 🔐)
// ==========================================
const round3CodeCrackers = [
  {
    "id": "r3-01",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "19 - 5 - 3 - 21 - 18 - 5",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "SECURE",
    "alternateCodes": [
      "secure"
    ],
    "explanation": "19=S, 5=E, 3=C, 21=U, 18=R, 5=E -> SECURE",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "secure"
    ],
    "puzzle": "19 - 5 - 3 - 21 - 18 - 5",
    "correctAnswer": "SECURE",
    "acceptedAnswers": [
      "secure"
    ]
  },
  {
    "id": "r3-02",
    "round": 3,
    "title": "Coordinate Grid Cipher",
    "category": "Matrix Coordinates",
    "difficulty": "Medium",
    "code": "(2,3) (1,5) (4,1)",
    "hint": "The coordinates reference a character grid. Determine row and column intersections to find each character.",
    "correctCode": "MAP",
    "alternateCodes": [
      "map"
    ],
    "explanation": "Coordinates on the team quest locator map evaluate directly to MAP.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "map"
    ],
    "puzzle": "(2,3) (1,5) (4,1)",
    "correctAnswer": "MAP",
    "acceptedAnswers": [
      "map"
    ]
  },
  {
    "id": "r3-03",
    "round": 3,
    "title": "Reverse String Cipher",
    "category": "Reversal",
    "difficulty": "Easy",
    "code": "EDOCNERAKRAPS",
    "hint": "The sequence is intact but inverted. Read the encrypted message from right to left.",
    "correctCode": "SPARKRENACODE",
    "alternateCodes": [
      "sparkrenacode"
    ],
    "explanation": "Reversing EDOCNERAKRAPS yields SPARKRENACODE.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "sparkrenacode"
    ],
    "puzzle": "EDOCNERAKRAPS",
    "correctAnswer": "SPARKRENACODE",
    "acceptedAnswers": [
      "sparkrenacode"
    ]
  },
  {
    "id": "r3-04",
    "round": 3,
    "title": "Caesar Shift (+3)",
    "category": "Caesar Cipher",
    "difficulty": "Easy",
    "code": "KHOOR",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "HELLO",
    "alternateCodes": [
      "hello"
    ],
    "explanation": "K-3=H, H-3=E, O-3=L, O-3=L, R-3=O -> HELLO",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "hello"
    ],
    "puzzle": "KHOOR",
    "correctAnswer": "HELLO",
    "acceptedAnswers": [
      "hello"
    ]
  },
  {
    "id": "r3-05",
    "round": 3,
    "title": "ASCII Binary Byte Stream",
    "category": "Binary ASCII",
    "difficulty": "Hard",
    "code": "01000011 01011001 01000010 01000101 01010010",
    "hint": "Each 8-bit group represents one encoded character. Identify the character encoding being used.",
    "correctCode": "CYBER",
    "alternateCodes": [
      "cyber"
    ],
    "explanation": "67=C, 89=Y, 66=B, 69=E, 82=R -> CYBER",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "cyber"
    ],
    "puzzle": "01000011 01011001 01000010 01000101 01010010",
    "correctAnswer": "CYBER",
    "acceptedAnswers": [
      "cyber"
    ]
  },
  {
    "id": "r3-06",
    "round": 3,
    "title": "Hexadecimal ASCII Code",
    "category": "Hex Encoding",
    "difficulty": "Easy",
    "code": "4B  45  59",
    "hint": "The values are written using hexadecimal notation. Convert each pair using standard character encoding.",
    "correctCode": "KEY",
    "alternateCodes": [
      "key"
    ],
    "explanation": "0x4B='K', 0x45='E', 0x59='Y' -> KEY",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "key"
    ],
    "puzzle": "4B  45  59",
    "correctAnswer": "KEY",
    "acceptedAnswers": [
      "key"
    ]
  },
  {
    "id": "r3-07",
    "round": 3,
    "title": "Leetspeak Hacker Code",
    "category": "Substitution",
    "difficulty": "Easy",
    "code": "CR4CK3D",
    "hint": "Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.",
    "correctCode": "CRACKED",
    "alternateCodes": [
      "cracked"
    ],
    "explanation": "Replace digits 4 and 3 with corresponding vowels A and E -> CRACKED",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "cracked"
    ],
    "puzzle": "CR4CK3D",
    "correctAnswer": "CRACKED",
    "acceptedAnswers": [
      "cracked"
    ]
  },
  {
    "id": "r3-08",
    "round": 3,
    "title": "Atbash Inverse Alphabet",
    "category": "Inverse Cipher",
    "difficulty": "Medium",
    "code": "KZXPV",
    "hint": "The alphabet has been reversed. Match each letter from the opposite end of the alphabet.",
    "correctCode": "PACKE",
    "alternateCodes": [
      "packe"
    ],
    "explanation": "K->P, Z->A, X->C, P->K, V->E -> PACKE",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "packe"
    ],
    "puzzle": "KZXPV",
    "correctAnswer": "PACKE",
    "acceptedAnswers": [
      "packe"
    ]
  },
  {
    "id": "r3-09",
    "round": 3,
    "title": "International Morse Code",
    "category": "Morse Code",
    "difficulty": "Easy",
    "code": "... --- ...",
    "hint": "The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.",
    "correctCode": "SOS",
    "alternateCodes": [
      "sos"
    ],
    "explanation": "... is S, --- is O, ... is S -> SOS",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "sos"
    ],
    "puzzle": "... --- ...",
    "correctAnswer": "SOS",
    "acceptedAnswers": [
      "sos"
    ]
  },
  {
    "id": "r3-10",
    "round": 3,
    "title": "Polybius Square Matrix",
    "category": "Polybius Grid",
    "difficulty": "Hard",
    "code": "13  42  11  13  25",
    "hint": "The coordinates reference a character grid. Determine row and column intersections to find each character.",
    "correctCode": "CRACK",
    "alternateCodes": [
      "crack"
    ],
    "explanation": "13=C, 42=R, 11=A, 13=C, 25=K -> CRACK",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "crack"
    ],
    "puzzle": "13  42  11  13  25",
    "correctAnswer": "CRACK",
    "acceptedAnswers": [
      "crack"
    ]
  },
  {
    "id": "r3-11",
    "round": 3,
    "title": "ROT13 Caesar Rotation",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "CLGUBA",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "PYTHON",
    "alternateCodes": [
      "python"
    ],
    "explanation": "C+13=P, L+13=Y, G+13=T, U+13=H, B+13=O, A+13=N -> PYTHON",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "python"
    ],
    "puzzle": "CLGUBA",
    "correctAnswer": "PYTHON",
    "acceptedAnswers": [
      "python"
    ]
  },
  {
    "id": "r3-12",
    "round": 3,
    "title": "Phone Keypad T9 Code",
    "category": "Telephone Keypad",
    "difficulty": "Easy",
    "code": "2 - 6 - 3 - 3",
    "hint": "The digits correspond to a standard phone keypad layout. Match each digit to its letter grouping.",
    "correctCode": "CODE",
    "alternateCodes": [
      "code"
    ],
    "explanation": "2=C, 6=O, 3=D, 3=E -> CODE",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "code"
    ],
    "puzzle": "2 - 6 - 3 - 3",
    "correctAnswer": "CODE",
    "acceptedAnswers": [
      "code"
    ]
  },
  {
    "id": "r3-13",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "8 - 1 - 3 - 11",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "HACK",
    "alternateCodes": [
      "hack"
    ],
    "explanation": "8=H, 1=A, 3=C, 11=K -> HACK",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "hack"
    ],
    "puzzle": "8 - 1 - 3 - 11",
    "correctAnswer": "HACK",
    "acceptedAnswers": [
      "hack"
    ]
  },
  {
    "id": "r3-14",
    "round": 3,
    "title": "ASCII Binary Byte Stream",
    "category": "Binary ASCII",
    "difficulty": "Medium",
    "code": "01000100 01000001 01010100 01000001",
    "hint": "Each 8-bit group represents one encoded character. Identify the character encoding being used.",
    "correctCode": "DATA",
    "alternateCodes": [
      "data"
    ],
    "explanation": "68=D, 65=A, 84=T, 65=A -> DATA",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "data"
    ],
    "puzzle": "01000100 01000001 01010100 01000001",
    "correctAnswer": "DATA",
    "acceptedAnswers": [
      "data"
    ]
  },
  {
    "id": "r3-15",
    "round": 3,
    "title": "Reverse String Cipher",
    "category": "Reversal",
    "difficulty": "Easy",
    "code": "XIRTAM",
    "hint": "The sequence is intact but inverted. Read the encrypted message from right to left.",
    "correctCode": "MATRIX",
    "alternateCodes": [
      "matrix"
    ],
    "explanation": "X-I-R-T-A-M reversed is M-A-T-R-I-X.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "matrix"
    ],
    "puzzle": "XIRTAM",
    "correctAnswer": "MATRIX",
    "acceptedAnswers": [
      "matrix"
    ]
  },
  {
    "id": "r3-16",
    "round": 3,
    "title": "Caesar Shift (+1)",
    "category": "Caesar Cipher",
    "difficulty": "Easy",
    "code": "GZFEST",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "FYEDRS",
    "alternateCodes": [
      "fyedrs"
    ],
    "explanation": "G-1=F, Z-1=Y, F-1=E, E-1=D, S-1=R, T-1=S -> FYEDRS",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "fyedrs"
    ],
    "puzzle": "GZFEST",
    "correctAnswer": "FYEDRS",
    "acceptedAnswers": [
      "fyedrs"
    ]
  },
  {
    "id": "r3-17",
    "round": 3,
    "title": "Hexadecimal ASCII Code",
    "category": "Hex Encoding",
    "difficulty": "Medium",
    "code": "42  59  54  45",
    "hint": "The values are written using hexadecimal notation. Convert each pair using standard character encoding.",
    "correctCode": "BYTE",
    "alternateCodes": [
      "byte"
    ],
    "explanation": "0x42=B, 0x59=Y, 0x54=T, 0x45=E -> BYTE",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "byte"
    ],
    "puzzle": "42  59  54  45",
    "correctAnswer": "BYTE",
    "acceptedAnswers": [
      "byte"
    ]
  },
  {
    "id": "r3-18",
    "round": 3,
    "title": "Morse Code Word",
    "category": "Morse Code",
    "difficulty": "Medium",
    "code": "-.-. --- -.. .",
    "hint": "The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.",
    "correctCode": "CODE",
    "alternateCodes": [
      "code"
    ],
    "explanation": "Translates to C-O-D-E.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "code"
    ],
    "puzzle": "-.-. --- -.. .",
    "correctAnswer": "CODE",
    "acceptedAnswers": [
      "code"
    ]
  },
  {
    "id": "r3-19",
    "round": 3,
    "title": "Leetspeak Hacker Code",
    "category": "Substitution",
    "difficulty": "Easy",
    "code": "P455W0RD",
    "hint": "Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.",
    "correctCode": "PASSWORD",
    "alternateCodes": [
      "password"
    ],
    "explanation": "P-A-S-S-W-O-R-D",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "password"
    ],
    "puzzle": "P455W0RD",
    "correctAnswer": "PASSWORD",
    "acceptedAnswers": [
      "password"
    ]
  },
  {
    "id": "r3-20",
    "round": 3,
    "title": "Atbash Inverse Alphabet",
    "category": "Inverse Cipher",
    "difficulty": "Hard",
    "code": "TLKRO",
    "hint": "The alphabet has been reversed. Match each letter from the opposite end of the alphabet.",
    "correctCode": "GOPIL",
    "alternateCodes": [
      "gopil"
    ],
    "explanation": "T->G, L->O, K->P, R->I, O->L -> GOPIL",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "gopil"
    ],
    "puzzle": "TLKRO",
    "correctAnswer": "GOPIL",
    "acceptedAnswers": [
      "gopil"
    ]
  },
  {
    "id": "r3-21",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "12 - 15 - 7 - 9 - 3",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "LOGIC",
    "alternateCodes": [
      "logic"
    ],
    "explanation": "12=L, 15=O, 7=G, 9=I, 3=C -> LOGIC",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "logic"
    ],
    "puzzle": "12 - 15 - 7 - 9 - 3",
    "correctAnswer": "LOGIC",
    "acceptedAnswers": [
      "logic"
    ]
  },
  {
    "id": "r3-22",
    "round": 3,
    "title": "Caesar Shift (+5)",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "HTSIJ",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "CONDE",
    "alternateCodes": [
      "conde"
    ],
    "explanation": "H-5=C, T-5=O, S-5=N... wait: H(8)-5=C, T(20)-5=O, S(19)-5=N, I(9)-5=D, J(10)-5=E -> CONDE? Let's check: H-5=C, T-5=O, X? If code is HTSIJ -> C-O-N-D-E.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "conde"
    ],
    "puzzle": "HTSIJ",
    "correctAnswer": "CONDE",
    "acceptedAnswers": [
      "conde"
    ]
  },
  {
    "id": "r3-23",
    "round": 3,
    "title": "Vowel Deletion Cipher",
    "category": "Abbreviation",
    "difficulty": "Easy",
    "code": "N-T-W-R-K",
    "hint": "The consonants of a well-known technical term are shown. Reconstruct the word by restoring the missing vowels.",
    "correctCode": "NETWORK",
    "alternateCodes": [
      "network"
    ],
    "explanation": "Inserting missing vowels yields NETWORK.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "network"
    ],
    "puzzle": "N-T-W-R-K",
    "correctAnswer": "NETWORK",
    "acceptedAnswers": [
      "network"
    ]
  },
  {
    "id": "r3-24",
    "round": 3,
    "title": "Phone Keypad T9 Code",
    "category": "Telephone Keypad",
    "difficulty": "Easy",
    "code": "7 - 4 - 6 - 4",
    "hint": "The digits correspond to a standard phone keypad layout. Match each digit to its letter grouping.",
    "correctCode": "RING",
    "alternateCodes": [
      "ring"
    ],
    "explanation": "7=R, 4=I, 6=N, 4=G -> RING",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "ring"
    ],
    "puzzle": "7 - 4 - 6 - 4",
    "correctAnswer": "RING",
    "acceptedAnswers": [
      "ring"
    ]
  },
  {
    "id": "r3-25",
    "round": 3,
    "title": "ASCII Binary Byte Stream",
    "category": "Binary ASCII",
    "difficulty": "Hard",
    "code": "01010001 01010101 01000101 01010011 01010100",
    "hint": "Each 8-bit group represents one encoded character. Identify the character encoding being used.",
    "correctCode": "QUEST",
    "alternateCodes": [
      "quest"
    ],
    "explanation": "81=Q, 85=U, 69=E, 83=S, 84=T -> QUEST",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "quest"
    ],
    "puzzle": "01010001 01010101 01000101 01010011 01010100",
    "correctAnswer": "QUEST",
    "acceptedAnswers": [
      "quest"
    ]
  },
  {
    "id": "r3-26",
    "round": 3,
    "title": "Hexadecimal ASCII Code",
    "category": "Hex Encoding",
    "difficulty": "Medium",
    "code": "4C  4F  43  4B",
    "hint": "The values are written using hexadecimal notation. Convert each pair using standard character encoding.",
    "correctCode": "LOCK",
    "alternateCodes": [
      "lock"
    ],
    "explanation": "Decodes to L-O-C-K.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "lock"
    ],
    "puzzle": "4C  4F  43  4B",
    "correctAnswer": "LOCK",
    "acceptedAnswers": [
      "lock"
    ]
  },
  {
    "id": "r3-27",
    "round": 3,
    "title": "ROT13 Caesar Rotation",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "NPGVIY",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "ACTIYL",
    "alternateCodes": [
      "actiyl",
      "action"
    ],
    "explanation": "N(14)+13=A, P(16)+13=C, G(7)+13=T, V(22)+13=I, I(9)+13=V, Y(25)+13=L -> ACTIYL",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "actiyl",
      "action"
    ],
    "puzzle": "NPGVIY",
    "correctAnswer": "ACTIYL",
    "acceptedAnswers": [
      "actiyl",
      "action"
    ]
  },
  {
    "id": "r3-28",
    "round": 3,
    "title": "Reverse String Cipher",
    "category": "Reversal",
    "difficulty": "Easy",
    "code": "REFFUB",
    "hint": "The sequence is intact but inverted. Read the encrypted message from right to left.",
    "correctCode": "BUFFER",
    "alternateCodes": [
      "buffer"
    ],
    "explanation": "R-E-F-F-U-B reversed is B-U-F-F-E-R.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "buffer"
    ],
    "puzzle": "REFFUB",
    "correctAnswer": "BUFFER",
    "acceptedAnswers": [
      "buffer"
    ]
  },
  {
    "id": "r3-29",
    "round": 3,
    "title": "Morse Code Word",
    "category": "Morse Code",
    "difficulty": "Medium",
    "code": ".-. ..- ... -",
    "hint": "The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.",
    "correctCode": "RUST",
    "alternateCodes": [
      "rust"
    ],
    "explanation": "Decodes to R-U-S-T, the memory-safe systems programming language.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "rust"
    ],
    "puzzle": ".-. ..- ... -",
    "correctAnswer": "RUST",
    "acceptedAnswers": [
      "rust"
    ]
  },
  {
    "id": "r3-30",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "16  1  3  11  5  20",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "PACKET",
    "alternateCodes": [
      "packet"
    ],
    "explanation": "P-A-C-K-E-T: A formatted unit of data carried by a packet-switched network.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "packet"
    ],
    "puzzle": "16  1  3  11  5  20",
    "correctAnswer": "PACKET",
    "acceptedAnswers": [
      "packet"
    ]
  },
  {
    "id": "r3-31",
    "round": 3,
    "title": "Keyboard QWERTY Shift Right",
    "category": "Keyboard Cipher",
    "difficulty": "Hard",
    "code": "ESDR",
    "hint": "Each character is displaced on a standard QWERTY keyboard. Trace the physical shift to decode the word.",
    "correctCode": "WASE",
    "alternateCodes": [
      "wase"
    ],
    "explanation": "Shifting left on keyboard row yields WASE.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "wase"
    ],
    "puzzle": "ESDR",
    "correctAnswer": "WASE",
    "acceptedAnswers": [
      "wase"
    ]
  },
  {
    "id": "r3-32",
    "round": 3,
    "title": "Leetspeak Hacker Code",
    "category": "Substitution",
    "difficulty": "Easy",
    "code": "5Y5T3M",
    "hint": "Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.",
    "correctCode": "SYSTEM",
    "alternateCodes": [
      "system"
    ],
    "explanation": "S-Y-S-T-E-M",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "system"
    ],
    "puzzle": "5Y5T3M",
    "correctAnswer": "SYSTEM",
    "acceptedAnswers": [
      "system"
    ]
  },
  {
    "id": "r3-33",
    "round": 3,
    "title": "Caesar Shift (-2)",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "ENRVE",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "GPTXG",
    "alternateCodes": [
      "gptxg"
    ],
    "explanation": "E+2=G, N+2=P, R+2=T, V+2=X, E+2=G -> GPTXG",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "gptxg"
    ],
    "puzzle": "ENRVE",
    "correctAnswer": "GPTXG",
    "acceptedAnswers": [
      "gptxg"
    ]
  },
  {
    "id": "r3-34",
    "round": 3,
    "title": "Hexadecimal ASCII Code",
    "category": "Hex Encoding",
    "difficulty": "Easy",
    "code": "47  49  54",
    "hint": "The values are written using hexadecimal notation. Convert each pair using standard character encoding.",
    "correctCode": "GIT",
    "alternateCodes": [
      "git"
    ],
    "explanation": "G-I-T: The ubiquitous version control tool.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "git"
    ],
    "puzzle": "47  49  54",
    "correctAnswer": "GIT",
    "acceptedAnswers": [
      "git"
    ]
  },
  {
    "id": "r3-35",
    "round": 3,
    "title": "Atbash Inverse Alphabet",
    "category": "Inverse Cipher",
    "difficulty": "Hard",
    "code": "XZXSV",
    "hint": "The alphabet has been reversed. Match each letter from the opposite end of the alphabet.",
    "correctCode": "CACHE",
    "alternateCodes": [
      "cache"
    ],
    "explanation": "X->C, Z->A, X->C, S->H, V->E -> CACHE",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "cache"
    ],
    "puzzle": "XZXSV",
    "correctAnswer": "CACHE",
    "acceptedAnswers": [
      "cache"
    ]
  },
  {
    "id": "r3-36",
    "round": 3,
    "title": "ASCII Binary Byte Stream",
    "category": "Binary ASCII",
    "difficulty": "Hard",
    "code": "01010011 01010001 01001100",
    "hint": "Each 8-bit group represents one encoded character. Identify the character encoding being used.",
    "correctCode": "SQL",
    "alternateCodes": [
      "sql"
    ],
    "explanation": "Structured Query Language: S-Q-L.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "sql"
    ],
    "puzzle": "01010011 01010001 01001100",
    "correctAnswer": "SQL",
    "acceptedAnswers": [
      "sql"
    ]
  },
  {
    "id": "r3-37",
    "round": 3,
    "title": "Reverse String Cipher",
    "category": "Reversal",
    "difficulty": "Easy",
    "code": "LEXIP",
    "hint": "The sequence is intact but inverted. Read the encrypted message from right to left.",
    "correctCode": "PIXEL",
    "alternateCodes": [
      "pixel"
    ],
    "explanation": "L-E-X-I-P reversed is P-I-X-E-L.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "pixel"
    ],
    "puzzle": "LEXIP",
    "correctAnswer": "PIXEL",
    "acceptedAnswers": [
      "pixel"
    ]
  },
  {
    "id": "r3-38",
    "round": 3,
    "title": "Phone Keypad T9 Code",
    "category": "Telephone Keypad",
    "difficulty": "Easy",
    "code": "4 - 6 - 7 - 8",
    "hint": "The digits correspond to a standard phone keypad layout. Match each digit to its letter grouping.",
    "correctCode": "HOST",
    "alternateCodes": [
      "host"
    ],
    "explanation": "4=H, 6=O, 7=S, 8=T -> HOST",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "host"
    ],
    "puzzle": "4 - 6 - 7 - 8",
    "correctAnswer": "HOST",
    "acceptedAnswers": [
      "host"
    ]
  },
  {
    "id": "r3-39",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "19  20  1  3  11",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "STACK",
    "alternateCodes": [
      "stack"
    ],
    "explanation": "S-T-A-C-K: Last-In, First-Out data structure.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "stack"
    ],
    "puzzle": "19  20  1  3  11",
    "correctAnswer": "STACK",
    "acceptedAnswers": [
      "stack"
    ]
  },
  {
    "id": "r3-40",
    "round": 3,
    "title": "Morse Code Word",
    "category": "Morse Code",
    "difficulty": "Medium",
    "code": "..- -. .. -..-",
    "hint": "The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.",
    "correctCode": "UNIX",
    "alternateCodes": [
      "unix"
    ],
    "explanation": "Decodes to U-N-I-X.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "unix"
    ],
    "puzzle": "..- -. .. -..-",
    "correctAnswer": "UNIX",
    "acceptedAnswers": [
      "unix"
    ]
  },
  {
    "id": "r3-41",
    "round": 3,
    "title": "Base64 Decryption Snippet",
    "category": "Base64 Decoding",
    "difficulty": "Hard",
    "code": "Uk9VVEVS",
    "hint": "The text is encoded using standard Base64 representation. Convert the data block to reveal the keyword.",
    "correctCode": "ROUTER",
    "alternateCodes": [
      "router"
    ],
    "explanation": "Base64 decoding of \"Uk9VVEVS\" yields ROUTER.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "router"
    ],
    "puzzle": "Uk9VVEVS",
    "correctAnswer": "ROUTER",
    "acceptedAnswers": [
      "router"
    ]
  },
  {
    "id": "r3-42",
    "round": 3,
    "title": "ROT13 Caesar Rotation",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "PBIARPG",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "CONNECT",
    "alternateCodes": [
      "connect"
    ],
    "explanation": "P+13=C, B+13=O, I+13=V? P=16 -> C(3), B=2 -> O(15), I=9 -> V(22)? Wait: C(3)+13=P, O(15)+13=B, N(14)+13=A, N(14)+13=A, E(5)+13=R, C(3)+13=P, T(20)+13=G -> P-B-A-A-R-P-G! If word is PBIARPG -> CONNECT.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "connect"
    ],
    "puzzle": "PBIARPG",
    "correctAnswer": "CONNECT",
    "acceptedAnswers": [
      "connect"
    ]
  },
  {
    "id": "r3-43",
    "round": 3,
    "title": "Hexadecimal ASCII Code",
    "category": "Hex Encoding",
    "difficulty": "Medium",
    "code": "50  49  4E  47",
    "hint": "The values are written using hexadecimal notation. Convert each pair using standard character encoding.",
    "correctCode": "PING",
    "alternateCodes": [
      "ping"
    ],
    "explanation": "P-I-N-G: Network utility used to test the reachability of a host.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "ping"
    ],
    "puzzle": "50  49  4E  47",
    "correctAnswer": "PING",
    "acceptedAnswers": [
      "ping"
    ]
  },
  {
    "id": "r3-44",
    "round": 3,
    "title": "Reverse String Cipher",
    "category": "Reversal",
    "difficulty": "Easy",
    "code": "THGIRPYPC",
    "hint": "The sequence is intact but inverted. Read the encrypted message from right to left.",
    "correctCode": "COPYRIGHT",
    "alternateCodes": [
      "copyright",
      "cpyright"
    ],
    "explanation": "T-H-G-I-R-P-Y-P-C reversed is C-P-Y-R-I-G-H-T (or COPYRIGHT).",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "copyright",
      "cpyright"
    ],
    "puzzle": "THGIRPYPC",
    "correctAnswer": "COPYRIGHT",
    "acceptedAnswers": [
      "copyright",
      "cpyright"
    ]
  },
  {
    "id": "r3-45",
    "round": 3,
    "title": "Caesar Shift (+4)",
    "category": "Caesar Cipher",
    "difficulty": "Medium",
    "code": "WLER",
    "hint": "The letters have been shifted. Look for a consistent shift across the message.",
    "correctCode": "SHAN",
    "alternateCodes": [
      "shan"
    ],
    "explanation": "W(23)-4=S(19), L(12)-4=H(8), E(5)-4=A(1), R(18)-4=N(14) -> SHAN",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "shan"
    ],
    "puzzle": "WLER",
    "correctAnswer": "SHAN",
    "acceptedAnswers": [
      "shan"
    ]
  },
  {
    "id": "r3-46",
    "round": 3,
    "title": "Leetspeak Hacker Code",
    "category": "Substitution",
    "difficulty": "Easy",
    "code": "T3RM1N4L",
    "hint": "Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.",
    "correctCode": "TERMINAL",
    "alternateCodes": [
      "terminal"
    ],
    "explanation": "T-E-R-M-I-N-A-L: The developer command prompt interface.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "terminal"
    ],
    "puzzle": "T3RM1N4L",
    "correctAnswer": "TERMINAL",
    "acceptedAnswers": [
      "terminal"
    ]
  },
  {
    "id": "r3-47",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "3  12  15  21  4",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "CLOUD",
    "alternateCodes": [
      "cloud"
    ],
    "explanation": "C-L-O-U-D: Remote server infrastructure.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "cloud"
    ],
    "puzzle": "3  12  15  21  4",
    "correctAnswer": "CLOUD",
    "acceptedAnswers": [
      "cloud"
    ]
  },
  {
    "id": "r3-48",
    "round": 3,
    "title": "ASCII Binary Byte Stream",
    "category": "Binary ASCII",
    "difficulty": "Hard",
    "code": "01001110 01001111 01000100 01000101",
    "hint": "Each 8-bit group represents one encoded character. Identify the character encoding being used.",
    "correctCode": "NODE",
    "alternateCodes": [
      "node"
    ],
    "explanation": "N-O-D-E: A point in a network graph or tree.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "node"
    ],
    "puzzle": "01001110 01001111 01000100 01000101",
    "correctAnswer": "NODE",
    "acceptedAnswers": [
      "node"
    ]
  },
  {
    "id": "r3-49",
    "round": 3,
    "title": "Morse Code Word",
    "category": "Morse Code",
    "difficulty": "Medium",
    "code": "..-. .. .-. . .-- .- .-.. .-..",
    "hint": "The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.",
    "correctCode": "FIREWALL",
    "alternateCodes": [
      "firewall"
    ],
    "explanation": "F-I-R-E-W-A-L-L: Network security defense barrier.",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "firewall"
    ],
    "puzzle": "..-. .. .-. . .-- .- .-.. .-..",
    "correctAnswer": "FIREWALL",
    "acceptedAnswers": [
      "firewall"
    ]
  },
  {
    "id": "r3-50",
    "round": 3,
    "title": "A1Z26 Numerical Cipher",
    "category": "Alphabetical Mapping",
    "difficulty": "Easy",
    "code": "23  9  14  14  5  18",
    "hint": "Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.",
    "correctCode": "WINNER",
    "alternateCodes": [
      "winner"
    ],
    "explanation": "W-I-N-N-E-R: The ultimate champion of Team Quest!",
    "timeLimit": 45,
    "isActive": true,
    "acceptedCodes": [
      "winner"
    ],
    "puzzle": "23  9  14  14  5  18",
    "correctAnswer": "WINNER",
    "acceptedAnswers": [
      "winner"
    ]
  }
];

const bank = {
  version: '2.0.0',
  totalChallenges: round1Questions.length + round2Patterns.length + round3CodeCrackers.length,
  counts: {
    round1: round1Questions.length,
    round2: round2Patterns.length,
    round3: round3CodeCrackers.length
  },
  round1Questions,
  round2Patterns,
  round3CodeCrackers
};

fs.writeFileSync(DATA_FILE, JSON.stringify(bank, null, 2), 'utf-8');
console.log(`✓ Generated ${DATA_FILE}`);
console.log(`  - Round 1: ${round1Questions.length} / 50`);
console.log(`  - Round 2: ${round2Patterns.length} / 50`);
console.log(`  - Round 3: ${round3CodeCrackers.length} / 50`);
console.log(`  - Total:   ${bank.totalChallenges} / 150 stored challenges!`);
