#!/usr/bin/env node

// Test script to verify the evaluate function handles malformed JavaScript correctly

const testCases = [
  {
    name: "Return statement outside function",
    script: "return document.title",
    shouldFail: false,
    description: "Should wrap in IIFE and execute successfully"
  },
  {
    name: "Multiple return statements",
    script: "const x = 5; return x * 2",
    shouldFail: false,
    description: "Should wrap in IIFE and execute successfully"
  },
  {
    name: "Valid function with return",
    script: "(() => { return window.location.href })()",
    shouldFail: false,
    description: "Already wrapped, should execute as-is"
  },
  {
    name: "Arrow function",
    script: "() => document.body.innerHTML",
    shouldFail: false,
    description: "Arrow function, should execute as-is"
  },
  {
    name: "Syntax error - unclosed string",
    script: 'const msg = "hello',
    shouldFail: true,
    description: "Should catch and handle syntax error gracefully"
  },
  {
    name: "Syntax error - invalid syntax",
    script: "function { return 42 }",
    shouldFail: true,
    description: "Should catch and handle syntax error gracefully"
  },
  {
    name: "Runtime error",
    script: "nonExistentFunction()",
    shouldFail: true,
    description: "Should catch and handle runtime error gracefully"
  }
];

console.log("Test cases for evaluate function fix:");
console.log("=====================================\n");

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Script: ${test.script}`);
  console.log(`Expected: ${test.shouldFail ? "Should fail gracefully" : "Should succeed"}`);
  console.log(`Description: ${test.description}`);
  console.log("---\n");
});

console.log("\nThese test cases should be run through the circuit-web MCP to verify:");
console.log("1. Return statements outside functions are wrapped in IIFE");
console.log("2. Syntax errors are caught and handled gracefully");
console.log("3. The MCP process doesn't crash on any error");
console.log("4. Clear error messages are returned to the user");