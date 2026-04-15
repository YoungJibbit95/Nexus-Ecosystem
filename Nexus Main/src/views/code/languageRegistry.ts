export type CodeLanguage = {
  id: string;
  label: string;
  ext: string;
  color: string;
  hello: string;
};

export const LANGS: CodeLanguage[] = [
  {
    id: "javascript",
    label: "JavaScript",
    ext: "js",
    color: "#F7DF1E",
    hello: `// JavaScript\nconsole.log("Hello, World!")\nconsole.log("2 + 2 =", 2 + 2)\n\nconst nums = [1,2,3,4,5]\nconsole.log("squares:", nums.map(x => x * x))\nconsole.log("sum:", nums.reduce((a,b) => a+b, 0))\n\nconst greet = name => \`Hello, \${name}!\`\nconsole.log(greet("Nexus"))`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    ext: "ts",
    color: "#3178C6",
    hello: `// TypeScript\ninterface Person { name: string; age: number }\n\nconst greet = (p: Person): string => \`Hi \${p.name}, age \${p.age}!\`\n\nconst people: Person[] = [\n  { name: "Alice", age: 30 },\n  { name: "Bob",   age: 25 },\n]\n\npeople.forEach(p => console.log(greet(p)))\nconsole.log("Total:", people.length)`,
  },
  {
    id: "python",
    label: "Python",
    ext: "py",
    color: "#3572A5",
    hello: `# Python\nprint("Hello, World!")\nprint(f"2 + 2 = {2 + 2}")\n\nnums = [1, 2, 3, 4, 5]\nprint("squares:", [x**2 for x in nums])\nprint("sum:", sum(nums))\n\nfor i in range(3):\n    print(f"  loop {i}")`,
  },
  {
    id: "html",
    label: "HTML",
    ext: "html",
    color: "#E34C26",
    hello: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Hello</title>\n  <style>\n    body { font-family: system-ui; background: #0a0a14; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }\n    h1 { background: linear-gradient(135deg, #007AFF, #5E5CE6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n  </style>\n</head>\n<body>\n  <div>\n    <h1>Hello, World!</h1>\n    <p>Edit this HTML preview →</p>\n  </div>\n</body>\n</html>`,
  },
  {
    id: "css",
    label: "CSS",
    ext: "css",
    color: "#563d7c",
    hello: `/* CSS Preview */\nbody {\n  background: linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%);\n  min-height: 100vh;\n  margin: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: system-ui, sans-serif;\n  color: white;\n}\n\n.card {\n  padding: 2rem;\n  border-radius: 16px;\n  background: rgba(255,255,255,0.08);\n  backdrop-filter: blur(20px);\n  border: 1px solid rgba(255,255,255,0.12);\n  text-align: center;\n}`,
  },
  {
    id: "json",
    label: "JSON",
    ext: "json",
    color: "#8bc34a",
    hello: `{\n  "name": "Nexus v5.0",\n  "version": "5.0.0",\n  "features": [\n    "Code Editor",\n    "Canvas",\n    "Tasks",\n    "Reminders"\n  ],\n  "settings": {\n    "theme": "Deep Space",\n    "glow": true,\n    "blur": 20\n  }\n}`,
  },
  {
    id: "markdown",
    label: "Markdown",
    ext: "md",
    color: "#083fa1",
    hello: `# Hello World\n\nThis is a **Markdown** preview with *live rendering*.\n\n## Features\n\n- ✅ Live preview\n- ✅ Syntax highlighting\n- ✅ GFM tables\n\n## Code\n\n\`\`\`js\nconsole.log("Hello!")\n\`\`\`\n\n## Table\n\n| Name | Value |\n|------|-------|\n| Alpha | 1 |\n| Beta | 2 |`,
  },
  {
    id: "java",
    label: "Java",
    ext: "java",
    color: "#b07219",
    hello: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        \n        int sum = 0;\n        for (int i = 1; i <= 10; i++) {\n            sum += i;\n        }\n        System.out.println("Sum 1-10: " + sum);\n        \n        String[] fruits = {"Apple", "Banana", "Cherry"};\n        for (String f : fruits) {\n            System.out.println("  - " + f);\n        }\n    }\n}`,
  },
  {
    id: "cpp",
    label: "C++",
    ext: "cpp",
    color: "#f34b7d",
    hello: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    \n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int n : nums) {\n        sum += n;\n        cout << n * n << " ";\n    }\n    cout << endl;\n    cout << "Sum: " << sum << endl;\n    return 0;\n}`,
  },
  {
    id: "rust",
    label: "Rust",
    ext: "rs",
    color: "#dea584",
    hello: `fn main() {\n    println!("Hello, World!");\n    \n    let nums: Vec<i32> = (1..=5).collect();\n    let squares: Vec<i32> = nums.iter().map(|x| x * x).collect();\n    \n    println!("squares: {:?}", squares);\n    println!("sum: {}", nums.iter().sum::<i32>());\n}`,
  },
  {
    id: "go",
    label: "Go",
    ext: "go",
    color: "#00ADD8",
    hello: `package main\n\nimport (\n    "fmt"\n    "math"\n)\n\nfunc main() {\n    fmt.Println("Hello, World!")\n    \n    nums := []int{1, 2, 3, 4, 5}\n    sum := 0\n    for _, n := range nums {\n        sum += n\n        fmt.Printf("sqrt(%d) = %.2f\\n", n, math.Sqrt(float64(n)))\n    }\n    fmt.Printf("Sum: %d\\n", sum)\n}`,
  },
  {
    id: "bash",
    label: "Bash",
    ext: "sh",
    color: "#89e051",
    hello: `#!/bin/bash\necho "Hello, World!"\n\nfor i in {1..5}; do\n    echo "  Item $i"\ndone\n\necho "Done!"`,
  },
  {
    id: "sql",
    label: "SQL",
    ext: "sql",
    color: "#e38c00",
    hello: `-- Create table\nCREATE TABLE users (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    email TEXT UNIQUE,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Insert data\nINSERT INTO users (name, email) VALUES\n    ('Alice', 'alice@example.com'),\n    ('Bob',   'bob@example.com');\n\n-- Query\nSELECT id, name, email\nFROM users\nORDER BY name ASC;`,
  },
  {
    id: "plaintext",
    label: "Text",
    ext: "txt",
    color: "#888888",
    hello: `Plain text file.\nWrite anything here.`,
  },
];

export const getLang = (id: string): CodeLanguage =>
  LANGS.find((language) => language.id === id) ?? LANGS[0];
