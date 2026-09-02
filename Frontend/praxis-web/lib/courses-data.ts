import type { Course, CourseTrack } from "@/lib/types";

export const COURSES_CATALOG: Course[] = [
  {
    id: "qa-automation",
    slug: "qa-automation",
    title: "QA Automation Engineering",
    shortDescription:
      "Master modern automated testing for web and APIs using Playwright, Selenium, and CI/CD pipelines with real production workflows.",
    description: `QA Automation is one of the most in-demand software disciplines today. In this comprehensive, cohort-based course, you will transform manual testing practices into robust, scalable automated test suites.

You will learn how to design industry-standard test automation frameworks from scratch, automate complex modern web applications with Playwright and Selenium, write automated API checks, and integrate test suites into GitHub Actions CI/CD pipelines.

By the end of the course, you won't just know syntax—you will have built and deployed a production-grade automated testing suite protecting a live application, giving you a strong portfolio piece for hiring managers.`,
    track: "PROFESSION",
    monthlyPrice: 6500000, // 65,000 AMD in minor units
    currency: "AMD",
    durationDays: 90,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Intermediate",
    format: "Live online sessions • Hands-on homework • Private Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + daily async mentorship",
    certificate: "Verified Certificate of Completion & Code Portfolio",
    prerequisites: [
      "Basic programming fundamentals (any language: Python, JS, or similar)",
      "Understanding of web basics (HTML, HTTP status codes)",
    ],
    targetAudience: [
      "Manual QA testers looking to transition to Automation",
      "Junior developers wanting to master test engineering and CI/CD",
      "STEM graduates entering the tech industry with strong practical skills",
      "Engineers looking for structured mentorship and code reviews",
    ],
    learningOutcomes: [
      "Architect clean, maintainable Page Object Model (POM) automation frameworks",
      "Write resilient web UI end-to-end tests using Playwright & Selenium",
      "Automate RESTful API testing, payload verification, and auth handling",
      "Configure automated test execution in GitHub Actions CI/CD pipelines",
      "Generate rich test execution reports with Allure and Playwright HTML Reporter",
      "Implement parallel test execution and cross-browser testing strategies",
      "Debug flaky tests, race conditions, and dynamic frontend states",
      "Apply software engineering best practices, Git flows, and clean code principles",
    ],
    projects: [
      {
        title: "End-to-End E-Commerce Test Automation Framework",
        description:
          "A modular Page Object Model framework testing critical user journeys (catalog, cart, checkout, payment mock) using Playwright and TypeScript with parallel test execution.",
        tech: ["Playwright", "TypeScript", "Allure Reports", "GitHub Actions"],
      },
      {
        title: "REST API Automated Test Suite with Auth & DB Fixtures",
        description:
          "Comprehensive API testing framework verifying authentication, data validations, edge cases, and database state consistency.",
        tech: ["REST API", "Jest/Supertest", "JSON Schema", "PostgreSQL Fixtures"],
      },
      {
        title: "Continuous Testing in CI/CD Pipeline",
        description:
          "Automated pipeline triggering test runs on pull requests, capturing video artifacts on failure, and notifying the team channel.",
        tech: ["GitHub Actions", "Docker", "Slack/Telegram Webhooks"],
      },
    ],
    modules: [
      {
        title: "Module 1: Test Automation Architecture & Foundations",
        description:
          "Setting up your automation environment, understanding test runner lifecycles, assertions, and test structure.",
        topics: [
          "Introduction to test automation: when and what to automate",
          "Test runner architectures and lifecycle hooks (before/after)",
          "Assertion libraries and custom matchers",
          "Git workflow, branch management, and project setup",
        ],
      },
      {
        title: "Module 2: Modern Web Automation with Playwright",
        description:
          "Deep dive into Playwright for modern, resilient browser automation with auto-waiting and locator strategies.",
        topics: [
          "Playwright architecture vs WebDriver",
          "Smart locator strategies (role, text, test-id) avoiding brittle selectors",
          "Handling dynamic content, animations, and network idle events",
          "Page Object Model (POM) pattern for maintainable code",
          "Authentication reuse and session storage preservation",
        ],
      },
      {
        title: "Module 3: REST API Testing & Backend Automation",
        description:
          "Automating backend services, HTTP request lifecycles, status assertions, schema validations, and mock fixtures.",
        topics: [
          "HTTP protocol, headers, query params, and JSON payloads",
          "API testing strategies and contracts",
          "Validating schema structure and payload schemas",
          "Setting up test databases and teardown hooks",
        ],
      },
      {
        title: "Module 4: Selenium WebDriver & Cross-Browser Testing",
        description:
          "Working with classic Selenium WebDriver ecosystems, Grid architecture, and browser compatibility.",
        topics: [
          "Selenium WebDriver architecture and setup",
          "Explicit and fluent waits vs implicit waits",
          "Cross-browser and headless execution configurations",
          "Handling alerts, iframes, and multi-tab workflows",
        ],
      },
      {
        title: "Module 5: CI/CD Integration, Reporting & Capstone Project",
        description:
          "Integrating your test framework into automated delivery pipelines and presenting your final portfolio project.",
        topics: [
          "Configuring GitHub Actions for automated regression runs",
          "Publishing Allure and HTML test reports with video artifacts",
          "Flaky test management and retry strategies",
          "Capstone project presentation and portfolio code review",
        ],
      },
    ],
  },
  {
    id: "python",
    slug: "python",
    title: "Python Programming & Automation",
    shortDescription:
      "Go from zero to building practical automation tools, web scrapers, data scripts, and backend utilities with clean Python.",
    description: `Python is the world's most versatile programming language. Whether you want to write automation scripts, scrape web data, build backend systems, or prepare for data analysis, this course gives you the hands-on foundation you need.

You'll learn through real-world problem solving: interacting with files, processing structured data (JSON, CSV, Excel), consuming third-party APIs, and writing modular Object-Oriented code.

Every concept is paired with immediate code exercises and weekly projects reviewed by senior software engineers.`,
    track: "FUNDAMENTALS",
    monthlyPrice: 5500000, // 55,000 AMD
    currency: "AMD",
    durationDays: 60,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Beginner",
    format: "Live online sessions • Coding labs • Telegram group mentorship",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + daily async chat",
    certificate: "Certificate of Completion",
    prerequisites: [
      "No prior coding experience required",
      "Comfortable with general computer usage and file navigation",
    ],
    targetAudience: [
      "Complete beginners looking to start their software engineering journey",
      "Professionals seeking to automate repetitive tasks and data workflows",
      "Future QA, data, and backend engineers building core programming logic",
    ],
    learningOutcomes: [
      "Write clean, idiomatic Python following PEP 8 style guidelines",
      "Master control structures, functions, lambdas, and list comprehensions",
      "Apply Object-Oriented Programming (OOP): classes, inheritance, encapsulation",
      "Work with files, JSON, CSV, and tabular data efficiently",
      "Extract web data using BeautifulSoup and Requests",
      "Interact with external REST APIs using authentication and error handling",
      "Write unit tests with pytest to ensure code correctness",
      "Package, document, and publish Python tools using Git and virtual environments",
    ],
    projects: [
      {
        title: "Automated Web Scraper & Price Tracker",
        description:
          "A multi-threaded scraper extracting product pricing from real e-commerce catalogs and saving historical changes to a structured database.",
        tech: ["Python", "BeautifulSoup4", "Requests", "SQLite"],
      },
      {
        title: "Telegram Bot for Automated Task & Notification Management",
        description:
          "An interactive bot that parses user commands, tracks tasks, and sends reminders on scheduled intervals.",
        tech: ["Python", "python-telegram-bot", "Asyncio"],
      },
      {
        title: "Data Processing & Report Generation CLI",
        description:
          "Command-line utility that ingests dirty CSV/JSON exports, cleans data anomalies, and outputs polished visual summaries.",
        tech: ["Python", "Pandas", "Pytest", "Rich CLI"],
      },
    ],
    modules: [
      {
        title: "Module 1: Core Syntax & Algorithmic Foundations",
        description:
          "Variables, data types, string formatting, arithmetic, conditional branching, and loops.",
        topics: [
          "Python runtime, virtual environments (venv), and IDE setup",
          "Primitive types, type casting, and string manipulation",
          "Conditionals (if/elif/else) and Boolean algebra",
          "Loops (for/while) and loop control (break, continue)",
        ],
      },
      {
        title: "Module 2: Data Structures & Functional Utilities",
        description:
          "Lists, tuples, dictionaries, sets, comprehensions, and functional methods.",
        topics: [
          "Lists and list comprehensions",
          "Dictionaries for fast key-value lookups",
          "Tuples and Sets for immutability and uniqueness",
          "Functions, parameters (*args, **kwargs), and scope",
        ],
      },
      {
        title: "Module 3: Object-Oriented Programming (OOP)",
        description:
          "Classes, objects, constructors, methods, inheritance, and clean architectural design.",
        topics: [
          "Classes, instances, and the __init__ constructor",
          "Encapsulation, property decorators, and dunder methods",
          "Inheritance, polymorphism, and composition",
          "Exception handling and custom error classes",
        ],
      },
      {
        title: "Module 4: Practical Automation & File Systems",
        description:
          "Working with local files, parsing JSON/CSV, and interacting with the operating system.",
        topics: [
          "File I/O with context managers (`with open`)",
          "Parsing and writing JSON & CSV files",
          "Pathlib and operating system automation",
          "Consuming REST APIs with `requests`",
        ],
      },
      {
        title: "Module 5: Testing, Packaging & Final Capstone Project",
        description:
          "Writing unit tests with pytest, virtual environment management, and completing the capstone project.",
        topics: [
          "Writing test cases with `pytest` and assertions",
          "Virtual environment isolation and requirements.txt",
          "Git version control and code formatting with Black/Flake8",
          "Final capstone project presentation",
        ],
      },
    ],
  },
  {
    id: "backend-engineering",
    slug: "backend-engineering",
    title: "Backend Engineering (Node.js & PostgreSQL)",
    shortDescription:
      "Build production-grade REST APIs, relational database schemas, authentication systems, and microservices with TypeScript and Node.js.",
    description: `Backend systems are the heartbeat of modern software applications. This course prepares you to engineer robust, high-performance server-side systems that handle authentication, business logic, payments, and data integrity.

You will master Node.js, TypeScript, Express/NestJS, PostgreSQL, Prisma ORM, Redis caching, Docker containerization, and modern security patterns.

You will build real-world backends designed to handle concurrency, relational data modeling, and payment gateway webhooks.`,
    track: "PROFESSION",
    monthlyPrice: 7000000, // 70,000 AMD
    currency: "AMD",
    durationDays: 90,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Intermediate",
    format: "Live online sessions • Architecture reviews • Private Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + continuous mentorship",
    certificate: "Certificate of Completion & Production Architecture Review",
    prerequisites: [
      "Solid understanding of JavaScript or TypeScript basics",
      "Basic awareness of HTTP and client-server concepts",
    ],
    targetAudience: [
      "Frontend developers wanting to become Full-Stack / Backend engineers",
      "Junior backend engineers wanting to master scalable database design and architecture",
      "Programmers seeking hands-on experience with PostgreSQL, Docker, and TypeScript",
    ],
    learningOutcomes: [
      "Design robust REST APIs following OpenAPI and RESTful principles",
      "Master relational database modeling, normalization, indexing, and migrations in PostgreSQL",
      "Implement JWT authentication, refresh token rotation, and Role-Based Access Control (RBAC)",
      "Use Prisma ORM for type-safe database queries and transactions",
      "Containerize applications with Docker and Docker Compose",
      "Integrate asynchronous payment processing, webhooks, and third-party APIs",
      "Implement rate limiting, validation pipelines, logging, and error handling middleware",
      "Deploy backend services to cloud environments with automated health checks",
    ],
    projects: [
      {
        title: "Multi-Tenant Subscription & Payment API",
        description:
          "Production-ready backend with user management, recurring billing state machine, ARCA/Stripe payment callbacks, and webhook security.",
        tech: ["TypeScript", "NestJS", "PostgreSQL", "Prisma", "Docker"],
      },
      {
        title: "Real-Time Event & Notification Hub",
        description:
          "Microservice providing real-time WebSocket communication, Redis pub/sub messaging, and Telegram bot notifications.",
        tech: ["Node.js", "Redis", "WebSockets", "Telegram API"],
      },
    ],
    modules: [
      {
        title: "Module 1: TypeScript Server Architecture & HTTP Fundamentals",
        description:
          "Node.js event loop, asynchronous execution, TypeScript configuration, and building clean HTTP servers.",
        topics: [
          "Node.js runtime, event loop, and non-blocking I/O",
          "TypeScript strict mode, interfaces, generics, and DTOs",
          "Request/response lifecycles, routing, and middleware pipelines",
          "Input validation and sanitation using Zod / Class-Validator",
        ],
      },
      {
        title: "Module 2: PostgreSQL & Relational Database Design",
        description:
          "Relational modeling, primary & foreign keys, indexing strategies, ACID transactions, and migrations with Prisma.",
        topics: [
          "Relational database modeling and normalization (1NF-3NF)",
          "PostgreSQL data types, constraints, and index optimization (B-Tree, composite)",
          "Prisma schema definition, migrations, and relationship mapping",
          "Writing efficient queries, avoiding N+1 problems, and transactions",
        ],
      },
      {
        title: "Module 3: Authentication, Authorization & Security",
        description:
          "Securing backend endpoints, password hashing, JWT tokens, refresh rotation, and RBAC.",
        topics: [
          "Password security with Argon2 / BCrypt and salt rounds",
          "Stateless authentication: JWT access tokens and secure httpOnly cookies",
          "Refresh token families and token rotation security",
          "Role-Based Access Control (RBAC) guards and decorators",
        ],
      },
      {
        title: "Module 4: Integrations, Payments & Asynchronous Flows",
        description:
          "Working with external gateways, webhooks, scheduled background jobs, and caching.",
        topics: [
          "Payment gateway integration patterns and idempotency",
          "Webhook signature verification and retry mechanisms",
          "Redis caching, session management, and rate limiting",
          "Cron schedulers and background queue processing",
        ],
      },
      {
        title: "Module 5: Docker, Deployment & Production Readiness",
        description:
          "Docker containerization, healthchecks, structured logging, CI/CD, and production deployment.",
        topics: [
          "Writing multi-stage Dockerfiles and compose setups",
          "Structured JSON logging, request IDs, and centralized error filters",
          "Automated healthchecks (/health/live, /health/ready)",
          "Deploying with zero-downtime rolling updates",
        ],
      },
    ],
  },
  {
    id: "javascript",
    slug: "javascript",
    title: "JavaScript & Frontend Engineering",
    shortDescription:
      "Master modern ECMAScript, DOM manipulation, asynchronous programming, Web APIs, and React fundamentals for interactive web development.",
    description: `JavaScript is the language that powers the entire modern web. In this comprehensive fundamentals track, you will build a rock-solid understanding of core JavaScript, the browser DOM, asynchronous mechanics, and modern React components.

You will learn how the JavaScript engine executes code, how to build responsive user interfaces, how to fetch data from APIs, and how to write clean, reusable modular code.

Every module features interactive coding exercises and real web applications built from scratch without boilerplate magic.`,
    track: "FUNDAMENTALS",
    monthlyPrice: 5500000, // 55,000 AMD
    currency: "AMD",
    durationDays: 60,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Beginner",
    format: "Live online sessions • Interactive coding • Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + daily code reviews",
    certificate: "Certificate of Completion",
    prerequisites: [
      "Basic familiarity with HTML and CSS is helpful but not strictly required",
      "A computer and an eagerness to build web projects",
    ],
    targetAudience: [
      "Aspiring frontend and full-stack developers starting with JavaScript",
      "Designers and professionals wanting to create interactive web interfaces",
      "Anyone wanting a strong foundation in modern ES6+ programming",
    ],
    learningOutcomes: [
      "Master JavaScript fundamentals: closures, scope, prototypes, and ES6+ features",
      "Interact with the Browser DOM, handle events, and create dynamic UI updates",
      "Understand asynchronous JavaScript: Promises, async/await, and the event loop",
      "Fetch data from REST APIs and render dynamic states (loading, error, empty)",
      "Build modern components with React: JSX, props, state, and hooks",
      "Use modern tools: Vite, npm, Tailwind CSS, and Git",
      "Apply clean coding patterns, modular architecture, and debugging techniques",
    ],
    projects: [
      {
        title: "Interactive Task & Kanban Board",
        description:
          "A client-side task management board with drag-and-drop mechanics, local storage persistence, and tag filtering.",
        tech: ["JavaScript (ES6+)", "DOM API", "HTML5 Drag & Drop", "Tailwind CSS"],
      },
      {
        title: "Dynamic Weather & Forecast Dashboard",
        description:
          "Web application querying live weather APIs, handling geolocation, displaying asynchronous loading states, and custom charting.",
        tech: ["React", "Fetch API", "Async/Await", "Tailwind CSS"],
      },
    ],
    modules: [
      {
        title: "Module 1: JavaScript Foundations & Modern Syntax",
        description:
          "Data types, operators, scope, let/const, arrow functions, template literals, and destructuring.",
        topics: [
          "JavaScript engine overview, variables (let, const), and primitive types",
          "Operators, conditionals, and logical evaluation",
          "Functions, arrow functions, default params, and rest/spread",
          "Array methods (map, filter, reduce, find, some, every)",
        ],
      },
      {
        title: "Module 2: The DOM & Browser Event Systems",
        description:
          "Selecting elements, manipulating the DOM tree, listening to user events, and form handling.",
        topics: [
          "Document Object Model (DOM) tree structure and queries",
          "Creating, appending, and updating elements dynamically",
          "Event listeners, event bubbling, and event delegation",
          "Form validation, submit handling, and FormData",
        ],
      },
      {
        title: "Module 3: Asynchronous JavaScript & HTTP APIs",
        description:
          "Promises, async/await, fetch API, handling HTTP errors, and browser storage.",
        topics: [
          "Understanding the Event Loop, microtasks, and macrotasks",
          "Promises and Promise chaining",
          "async/await syntax for clean asynchronous code",
          "Fetching data from REST APIs with error handling and loading indicators",
          "localStorage, sessionStorage, and cookies",
        ],
      },
      {
        title: "Module 4: React Components & Modern Frontend",
        description:
          "Component architecture, JSX, props, useState, useEffect, and component lifecycle.",
        topics: [
          "Introduction to React and declarative UI principles",
          "JSX syntax and component props",
          "Managing state with `useState` hook",
          "Handling side-effects with `useEffect` hook",
          "Building reusable, accessible component libraries",
        ],
      },
    ],
  },
  {
    id: "manual-qa",
    slug: "manual-qa",
    title: "Manual QA & Software Testing Fundamentals",
    shortDescription:
      "Learn essential software testing methodologies, test case design, bug reporting, API testing with Postman, and Jira project management.",
    description: `Manual Quality Assurance is the primary entry point into the tech industry for many professionals. This course teaches the principles and methodologies of modern software testing.

You will learn how to analyze requirements, identify edge cases, design professional Test Cases and Checklists, log actionable Bug Reports in Jira, and perform API testing with Postman.

You will work with real web and mobile software projects, simulating real Agile sprint testing environments.`,
    track: "PROFESSION",
    monthlyPrice: 4500000, // 45,000 AMD
    currency: "AMD",
    durationDays: 45,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Beginner",
    format: "Live online sessions • Practical bug hunts • Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + mentorship",
    certificate: "Certificate of Completion & Portfolio Test Documentation",
    prerequisites: [
      "No technical background required",
      "Attention to detail, curiosity, and logical thinking",
    ],
    targetAudience: [
      "Individuals seeking to switch careers and enter the IT industry",
      "Students looking for practical software quality engineering skills",
      "Anyone interested in software testing before advancing to QA Automation",
    ],
    learningOutcomes: [
      "Understand the Software Development Life Cycle (SDLC) and STLC",
      "Apply black-box test design techniques: Equivalence Partitioning, Boundary Value Analysis",
      "Write comprehensive Test Plans, Test Cases, and Checklists",
      "Write clear, reproducible Bug Reports in Jira with logs and attachments",
      "Perform functional, regression, smoke, sanity, and usability testing",
      "Test REST APIs using Postman (requests, variables, basic assertions)",
      "Inspect web elements and network traffic using Chrome DevTools",
      "Participate effectively in Agile/Scrum team ceremonies",
    ],
    projects: [
      {
        title: "Complete QA Documentation for Real Web Application",
        description:
          "Production-ready test suite including Test Plan, 40+ Test Cases, Checklists, and Traceability Matrix for a live web portal.",
        tech: ["Jira", "TestRail / Qase", "Confluence", "Chrome DevTools"],
      },
      {
        title: "API Functional Test Collection in Postman",
        description:
          "Postman collection covering authentication, CRUD operations, edge case validations, and automated response assertions.",
        tech: ["Postman", "REST API", "JSON"],
      },
    ],
    modules: [
      {
        title: "Module 1: Quality Assurance & SDLC Fundamentals",
        description:
          "Core definitions of quality, difference between QA and QC, SDLC models (Agile, Scrum, Kanban, Waterfall).",
        topics: [
          "Introduction to software quality and testing terminology (ISTQB aligned)",
          "Software Development Life Cycle (SDLC) and Testing Life Cycle (STLC)",
          "Agile, Scrum framework, sprints, and testing roles",
          "Types of testing: Functional vs Non-Functional, Regression, Smoke, Sanity",
        ],
      },
      {
        title: "Module 2: Test Design Techniques & Test Documentation",
        description:
          "Equivalence Partitioning, Boundary Value Analysis, Decision Tables, Test Cases, and Checklists.",
        topics: [
          "Black-box test design: Equivalence Partitioning and Boundary Value Analysis",
          "Decision Tables and State Transition testing",
          "Writing effective, structured Test Cases and Checklists",
          "Requirements traceability and test coverage analysis",
        ],
      },
      {
        title: "Module 3: Bug Reporting & Defect Management",
        description:
          "The defect lifecycle, severity vs priority, writing world-class bug reports in Jira.",
        topics: [
          "Defect lifecycle from New to Closed",
          "Severity vs Priority categorization",
          "Structure of an actionable bug report (Steps to reproduce, Expected vs Actual)",
          "Hands-on Jira defect tracking and sprint boards",
        ],
      },
      {
        title: "Module 4: Technical Testing Tools: DevTools & Postman",
        description:
          "Chrome DevTools (Console, Network, Elements), HTTP basics, and API testing with Postman.",
        topics: [
          "Using Chrome DevTools: Network tab, status codes, Console errors",
          "Client-Server architecture and HTTP methods (GET, POST, PUT, DELETE)",
          "Postman setup, sending requests, and inspecting JSON payloads",
          "Writing Postman test scripts and environment variables",
        ],
      },
    ],
  },
  {
    id: "cpp",
    slug: "cpp",
    title: "C/C++ Systems & Algorithmic Fundamentals",
    shortDescription:
      "Deep dive into low-level memory management, pointers, data structures, OOP, and high-performance programming with modern C++.",
    description: `Understanding low-level computing principles gives software engineers an unmatched architectural edge. This course dives deep into computer architecture, memory allocation, pointers, algorithms, and modern C++.

You will learn how computers manage memory, how the CPU processes instructions, and how to write efficient, crash-free code.

This course is ideal for university students, competitive programmers, and engineers targeting game development, embedded systems, or systems engineering.`,
    track: "FUNDAMENTALS",
    monthlyPrice: 6000000, // 60,000 AMD
    currency: "AMD",
    durationDays: 75,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Beginner to Intermediate",
    format: "Live online sessions • Problem solving labs • Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (1.5 hrs each) + mentorship",
    certificate: "Certificate of Completion",
    prerequisites: [
      "Basic mathematical logic and problem-solving interest",
      "No prior C++ knowledge required",
    ],
    targetAudience: [
      "University students looking to master university algorithms and systems courses",
      "Engineers interested in game engines (Unreal Engine), robotics, or high-performance computing",
      "Programmers who want to deeply understand memory, pointers, and CPU execution",
    ],
    learningOutcomes: [
      "Understand computer memory architecture: Stack vs Heap allocation",
      "Master raw and smart pointers (unique_ptr, shared_ptr), references, and address arithmetic",
      "Implement classic data structures: linked lists, stacks, queues, binary search trees",
      "Apply Object-Oriented Programming and RAII (Resource Acquisition Is Initialization)",
      "Master C++ Standard Template Library (STL): vectors, maps, algorithms",
      "Profile and debug memory leaks using Valgrind and GDB",
      "Write multi-file C++ projects compiled with CMake",
    ],
    projects: [
      {
        title: "Custom Memory Allocator & String Implementation",
        description:
          "Low-level memory management project implementing dynamic buffer management and copy-on-write string mechanics.",
        tech: ["C++20", "Memory Management", "GDB", "Valgrind"],
      },
      {
        title: "High-Performance Cache & Data Structure Library",
        description:
          "Generic templated LRU Cache and Red-Black Tree data structures with thread-safe access.",
        tech: ["C++20", "Templates", "STL", "CMake"],
      },
    ],
    modules: [
      {
        title: "Module 1: Computer Architecture & C++ Core",
        description:
          "Compilers, CPU execution, data representation in binary/hex, types, operators, and control flow.",
        topics: [
          "Compilation model: preprocessor, compiler, linker",
          "Binary representation, bits, bytes, and memory addresses",
          "Data types, control structures, and loops",
          "Functions, pass-by-value vs pass-by-reference",
        ],
      },
      {
        title: "Module 2: Pointers, Arrays & Memory Layout",
        description:
          "Stack vs Heap, pointer arithmetic, dynamic memory allocation, and memory safety.",
        topics: [
          "Stack frames and local variable lifetimes",
          "Pointers, address-of operator (&), and dereferencing (*)",
          "Dynamic allocation with `new` and `delete`",
          "Array decay, pointer arithmetic, and buffer safety",
        ],
      },
      {
        title: "Module 3: OOP, RAII & Modern C++ Idioms",
        description:
          "Classes, constructors, destructors, copy/move semantics, RAII, and smart pointers.",
        topics: [
          "Classes, access specifiers, and constructor initialization lists",
          "RAII and resource lifecycle management",
          "Copy constructor, copy assignment, and Rule of Five",
          "Modern smart pointers: `std::unique_ptr` and `std::shared_ptr`",
        ],
      },
      {
        title: "Module 4: Templates & The Standard Template Library (STL)",
        description:
          "Generic programming with templates, STL containers, iterators, and standard algorithms.",
        topics: [
          "Function and class templates",
          "Sequential containers: `std::vector`, `std::deque`, `std::list`",
          "Associative containers: `std::map`, `std::unordered_map`, `std::set`",
          "STL algorithms (`std::sort`, `std::find`, `std::transform`) and lambdas",
        ],
      },
    ],
  },
  {
    id: "full-stack",
    slug: "full-stack",
    title: "Full-Stack Web Engineering",
    shortDescription:
      "Become a complete web developer. Build modern React frontends, robust Node.js/PostgreSQL backends, authentication, and deploy live apps.",
    description: `The Full-Stack track brings together modern frontend and backend development into a unified, industry-aligned engineering experience.

You will learn how to build dynamic user interfaces with Next.js, React, and Tailwind CSS on the frontend, while engineering scalable REST APIs, relational PostgreSQL databases, and authentication flows on the backend.

Throughout the course, you will build and deploy multiple full-stack applications from scratch to production cloud hosts.`,
    track: "COMBINED",
    monthlyPrice: 8000000, // 80,000 AMD
    currency: "AMD",
    durationDays: 120,
    status: "PUBLISHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    level: "Intermediate",
    format: "Live online sessions • Real-world project builds • Telegram cohort",
    language: "Armenian (English materials & terminology)",
    schedule: "2 live sessions/week (2 hrs each) + continuous mentorship",
    certificate: "Full-Stack Engineer Certificate & Production Portfolio",
    prerequisites: [
      "Basic understanding of programming logic (JS or Python)",
      "Familiarity with HTML/CSS basics",
    ],
    targetAudience: [
      "Developers looking to bridge the gap between frontend and backend",
      "Entrepreneurs and creators building full-featured web SaaS applications",
      "Junior developers striving for versatile full-stack career opportunities",
    ],
    learningOutcomes: [
      "Architect and ship end-to-end full-stack web applications",
      "Build server-rendered and client-side applications with Next.js & React",
      "Develop type-safe backend APIs with Node.js, TypeScript, and Prisma ORM",
      "Design normalized PostgreSQL schemas with migrations and transactions",
      "Implement JWT authentication with secure httpOnly cookies and refresh tokens",
      "Integrate payments, file uploads, and external webhooks",
      "Containerize full-stack apps with Docker and deploy to production",
    ],
    projects: [
      {
        title: "Full-Stack SaaS Platform with Subscriptions & Dashboard",
        description:
          "End-to-end application featuring user authentication, subscription tiers, payment integration, responsive dashboard, and admin analytics.",
        tech: ["Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL", "Prisma"],
      },
    ],
    modules: [
      {
        title: "Module 1: Modern Frontend with React & Next.js",
        description:
          "Component architecture, hooks, server components, client components, and Tailwind styling.",
        topics: [
          "React 19 fundamentals and component lifecycle",
          "Next.js App Router, SSR, and client-side hydration",
          "Responsive styling with Tailwind CSS and accessible UI components",
          "Form management and client-side validation with React Hook Form & Zod",
        ],
      },
      {
        title: "Module 2: Type-Safe Backend & Database Architecture",
        description:
          "Node.js, TypeScript, RESTful routing, PostgreSQL relational modeling, and Prisma.",
        topics: [
          "Backend REST design with TypeScript and Express/NestJS",
          "PostgreSQL schema design and Prisma migrations",
          "Handling relationships, joins, transactions, and pagination",
          "Error handling middleware and centralized logging",
        ],
      },
      {
        title: "Module 3: Authentication, Authorization & Security",
        description:
          "JWT tokens, refresh token rotation, password hashing, and role permissions.",
        topics: [
          "User registration, login, and password hashing",
          "JWT access tokens, httpOnly cookies, and refresh token rotation",
          "Protected frontend routes and backend auth guards",
          "Role-Based Access Control (Student, Teacher, Admin)",
        ],
      },
      {
        title: "Module 4: Payments, Integrations & Cloud Deployment",
        description:
          "Integrating payment flows, Telegram bot notifications, Docker, and cloud hosting.",
        topics: [
          "Payment gateway integration and webhook handlers",
          "Telegram bot integration for user notifications",
          "Docker containerization for frontend and backend",
          "Production deployment and continuous integration",
        ],
      },
    ],
  },
];

/**
 * Returns the full catalog of courses.
 */
export function getCourseCatalog(): Course[] {
  return COURSES_CATALOG;
}

/**
 * Finds a course from the catalog by its slug or ID (case-insensitive).
 */
export function findCatalogCourseBySlugOrId(idOrSlug: string): Course | undefined {
  const normalized = idOrSlug.trim().toLowerCase();
  return COURSES_CATALOG.find(
    (c) =>
      c.id.toLowerCase() === normalized ||
      c.slug.toLowerCase() === normalized,
  );
}

/**
 * Merges a raw Course from the API with rich catalog data (curriculum, learning outcomes, projects)
 * if available.
 */
export function mergeCourseWithCatalog(apiCourse: Course): Course {
  const catalogMatch = findCatalogCourseBySlugOrId(apiCourse.slug || apiCourse.id);
  if (!catalogMatch) {
    return apiCourse;
  }

  return {
    ...catalogMatch,
    ...apiCourse,
    // Preserve rich catalog fields if the API doesn't provide them
    shortDescription: apiCourse.shortDescription || catalogMatch.shortDescription,
    level: apiCourse.level || catalogMatch.level,
    format: apiCourse.format || catalogMatch.format,
    language: apiCourse.language || catalogMatch.language,
    schedule: apiCourse.schedule || catalogMatch.schedule,
    certificate: apiCourse.certificate || catalogMatch.certificate,
    prerequisites:
      apiCourse.prerequisites && apiCourse.prerequisites.length > 0
        ? apiCourse.prerequisites
        : catalogMatch.prerequisites,
    learningOutcomes:
      apiCourse.learningOutcomes && apiCourse.learningOutcomes.length > 0
        ? apiCourse.learningOutcomes
        : catalogMatch.learningOutcomes,
    targetAudience:
      apiCourse.targetAudience && apiCourse.targetAudience.length > 0
        ? apiCourse.targetAudience
        : catalogMatch.targetAudience,
    projects:
      apiCourse.projects && apiCourse.projects.length > 0
        ? apiCourse.projects
        : catalogMatch.projects,
    modules:
      apiCourse.modules && apiCourse.modules.length > 0
        ? apiCourse.modules
        : catalogMatch.modules,
  };
}

/**
 * Filters the catalog by track.
 */
export function getCatalogCoursesByTrack(track?: CourseTrack): Course[] {
  if (!track) return COURSES_CATALOG;
  return COURSES_CATALOG.filter((c) => c.track === track);
}
