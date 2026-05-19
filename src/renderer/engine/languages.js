// Language glossary — every entry is { definition, example } keyed by the
// exact token Monaco will hand us when the user clicks a word. Keep
// definitions short (one or two sentences), beginner-friendly, and
// language-specific. The example should be the smallest piece of real
// code that *uses* the keyword in context — not a description of it.
//
// When a token can collide across languages (e.g. `class`, `if`), give
// each language its own entry so the explanation matches that language's
// semantics (Python's `class` is not Java's `class`).

export const LANGUAGES = {
  python: {
    label: 'Python',
    monacoId: 'python',
    glossary: {
      // --- functions & classes ---
      'def': { definition: 'Defines a function in Python.', example: 'def greet(name):\n    print(f"Hello {name}")' },
      'lambda': { definition: 'Creates a small anonymous (unnamed) function in one line.', example: 'square = lambda x: x ** 2\nprint(square(5))  # 25' },
      'class': { definition: 'Defines a class — a blueprint for creating objects.', example: 'class Dog:\n    def __init__(self, name):\n        self.name = name' },
      'self': { definition: 'The first parameter of an instance method — refers to the instance the method is called on.', example: 'class Dog:\n    def bark(self):\n        print(self.name)' },
      '__init__': { definition: 'Constructor method — runs automatically when a new instance is created.', example: 'class Dog:\n    def __init__(self, name):\n        self.name = name' },
      'super': { definition: 'Returns a proxy object that calls methods on the parent (super)class.', example: 'class Puppy(Dog):\n    def __init__(self, name):\n        super().__init__(name)' },
      'yield': { definition: 'Turns a function into a generator — each yield pauses and returns a value.', example: 'def counter():\n    for i in range(3):\n        yield i' },

      // --- control flow ---
      'if': { definition: 'Starts a conditional block. Executes code only if the condition is True.', example: 'if x > 10:\n    print("big number")' },
      'elif': { definition: 'Short for "else if". Checks another condition if the previous one was False.', example: 'if x > 10:\n    print("big")\nelif x > 5:\n    print("medium")' },
      'else': { definition: 'Runs if all previous if/elif conditions were False.', example: 'if x > 0:\n    print("positive")\nelse:\n    print("not positive")' },
      'for': { definition: 'Loops over items in a sequence (list, range, string, etc.).', example: 'for i in range(5):\n    print(i)' },
      'while': { definition: 'Repeats a block as long as the condition remains True.', example: 'while count > 0:\n    count -= 1' },
      'break': { definition: 'Exits the nearest enclosing loop immediately.', example: 'for n in numbers:\n    if n < 0:\n        break' },
      'continue': { definition: 'Skips the rest of the current loop iteration and starts the next one.', example: 'for n in numbers:\n    if n % 2 == 0:\n        continue\n    print(n)' },
      'pass': { definition: 'Does nothing. Used as a placeholder where a statement is required syntactically.', example: 'class TODO:\n    pass' },
      'return': { definition: 'Sends a value back from a function to the caller.', example: 'def add(a, b):\n    return a + b' },

      // --- errors & resources ---
      'try': { definition: 'Starts an error-handling block. Code inside may raise exceptions.', example: 'try:\n    result = 10 / x\nexcept ZeroDivisionError:\n    print("Cannot divide by zero")' },
      'except': { definition: 'Catches and handles a specific exception from a try block.', example: 'except ValueError as e:\n    print(f"Invalid value: {e}")' },
      'finally': { definition: 'Runs after try/except whether an exception was raised or not — used for cleanup.', example: 'try:\n    work()\nfinally:\n    cleanup()' },
      'raise': { definition: 'Throws (raises) an exception explicitly.', example: 'if balance < 0:\n    raise ValueError("balance cannot be negative")' },
      'assert': { definition: 'Sanity-check — raises AssertionError if the condition is False.', example: 'assert len(items) > 0, "items must not be empty"' },
      'with': { definition: 'Context manager — automatically handles setup and cleanup (e.g., closing files).', example: 'with open("file.txt") as f:\n    data = f.read()' },

      // --- imports & modules ---
      'import': { definition: 'Brings in a module or specific names from a module.', example: 'import os\nfrom math import sqrt' },
      'from': { definition: 'Used with import to bring in specific items from a module.', example: 'from datetime import datetime' },
      'as': { definition: 'Aliases an import or a `with` target under a different name.', example: 'import numpy as np\nwith open(p) as f:\n    ...' },
      'global': { definition: 'Inside a function, declares that a name refers to the module-level variable, not a new local one.', example: 'count = 0\ndef bump():\n    global count\n    count += 1' },

      // --- operators & boolean ---
      'in': { definition: 'Checks membership or iterates through a sequence.', example: 'if "a" in "apple":\n    print("found it")' },
      'is': { definition: 'Identity test — True if both sides refer to the *same* object (not just equal).', example: 'if value is None:\n    print("nothing")' },
      'not': { definition: 'Boolean negation. Inverts True/False.', example: 'if not done:\n    keep_going()' },
      'and': { definition: 'Logical AND — True only if both sides are truthy.', example: 'if age >= 13 and age < 18:\n    print("teen")' },
      'or': { definition: 'Logical OR — True if either side is truthy.', example: 'name = chosen or "Guest"' },
      'True': { definition: 'Boolean value representing truth.', example: 'is_active = True' },
      'False': { definition: 'Boolean value representing falsehood.', example: 'is_done = False' },
      'None': { definition: 'Represents the absence of a value (like null in other languages).', example: 'result = None' },

      // --- built-ins & types ---
      'print': { definition: 'Built-in function that outputs text to the console.', example: 'print("Hello, world!")' },
      'input': { definition: 'Built-in function that reads a line of text from the user.', example: 'name = input("Your name? ")' },
      'len': { definition: 'Returns the number of items in a container (string, list, dict, ...).', example: 'len("hello")  # 5' },
      'range': { definition: 'Generates a sequence of numbers. Often used in for loops.', example: 'for i in range(0, 10, 2):\n    print(i)  # 0, 2, 4, 6, 8' },
      'list': { definition: 'Built-in mutable sequence type. Also a constructor that turns an iterable into a list.', example: 'nums = [1, 2, 3]\nletters = list("abc")' },
      'dict': { definition: 'Built-in mapping type. Pairs unique keys with values.', example: 'ages = {"Alice": 30, "Bob": 25}' },
      'str': { definition: 'Built-in text type. Also converts other values to text.', example: 'str(42)  # "42"' },
      'int': { definition: 'Built-in whole-number type. Also parses strings into integers.', example: 'int("42")  # 42' },
      'enumerate': { definition: 'Yields (index, value) pairs while iterating.', example: 'for i, word in enumerate(words):\n    print(i, word)' },
      'f-string': { definition: 'Formatted string literal — embeds expressions inside `{}`. Prefixed with f.', example: 'name = "Ada"\nprint(f"Hello, {name}!")' },
    },
  },

  javascript: {
    label: 'JavaScript',
    monacoId: 'javascript',
    glossary: {
      // --- variable declarations ---
      'const': { definition: 'Declares a constant variable that cannot be reassigned.', example: 'const name = "Alice";' },
      'let': { definition: 'Declares a block-scoped variable that can be reassigned.', example: 'let count = 0;\ncount = count + 1;' },
      'var': { definition: 'Declares a function-scoped variable. Prefer const/let in modern JS.', example: 'var x = 10;' },

      // --- functions & classes ---
      'function': { definition: 'Declares a named function.', example: 'function greet(name) {\n  return `Hello ${name}`;\n}' },
      '=>': { definition: 'Arrow function syntax — shorthand for function expressions.', example: 'const add = (a, b) => a + b;' },
      'return': { definition: 'Returns a value from a function.', example: 'function add(a, b) {\n  return a + b;\n}' },
      'class': { definition: 'Defines a class (ES6+) — a template for objects.', example: 'class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n}' },
      'extends': { definition: 'Creates a class that inherits from another class.', example: 'class Dog extends Animal { bark() { ... } }' },
      'super': { definition: 'Calls the parent class\'s constructor or methods from inside a subclass.', example: 'class Dog extends Animal {\n  constructor(name) { super(name); }\n}' },
      'this': { definition: 'Refers to the current execution context — usually the object the method belongs to.', example: 'class Dog {\n  bark() { console.log(this.name); }\n}' },
      'new': { definition: 'Creates a new instance of a class or constructor function.', example: 'const d = new Date();' },
      'static': { definition: 'Defines a method or property that belongs to the class itself, not its instances.', example: 'class MathUtil {\n  static square(n) { return n * n; }\n}' },

      // --- control flow ---
      'if': { definition: 'Conditional statement. Executes a block if the condition is true.', example: 'if (x > 10) {\n  console.log("big");\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'if (x > 0) {\n  console.log("positive");\n} else {\n  console.log("non-positive");\n}' },
      'for': { definition: 'Loop that repeats code a set number of times.', example: 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}' },
      'while': { definition: 'Loop that repeats while a condition is true.', example: 'while (count > 0) {\n  count--;\n}' },
      'do': { definition: 'Do-while loop — runs the body at least once before checking the condition.', example: 'do {\n  prompt();\n} while (!valid);' },
      'switch': { definition: 'Multi-way branch on a single value, using `case` labels.', example: 'switch (kind) {\n  case "a": ...; break;\n  default: ...;\n}' },
      'case': { definition: 'A branch label inside a switch statement.', example: 'case "monday": handleMonday(); break;' },
      'default': { definition: 'Catch-all branch in a switch when no other case matches.', example: 'default: console.log("unknown");' },
      'break': { definition: 'Exits the nearest enclosing loop or switch immediately.', example: 'for (const n of items) {\n  if (n < 0) break;\n}' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for (const n of items) {\n  if (n % 2 === 0) continue;\n  use(n);\n}' },

      // --- async & errors ---
      'async': { definition: 'Declares an asynchronous function that returns a Promise.', example: 'async function fetchData() {\n  const res = await fetch(url);\n  return res.json();\n}' },
      'await': { definition: 'Pauses async function execution until a Promise resolves.', example: 'const data = await fetch(url);' },
      'Promise': { definition: 'Represents a value that may be available now, later, or never.', example: 'const p = new Promise((resolve) => resolve(42));' },
      'fetch': { definition: 'Built-in function to make HTTP requests; returns a Promise that resolves to a Response.', example: 'const res = await fetch("/api/users");\nconst users = await res.json();' },
      'try': { definition: 'Starts an error-handling block.', example: 'try {\n  JSON.parse(input);\n} catch (e) {\n  console.error("Invalid JSON");\n}' },
      'catch': { definition: 'Handles errors thrown in the try block.', example: 'catch (error) {\n  console.error(error.message);\n}' },
      'finally': { definition: 'Runs after try/catch regardless of whether an error occurred — used for cleanup.', example: 'try { work(); } finally { cleanup(); }' },
      'throw': { definition: 'Raises an error. Stops normal execution and unwinds to the nearest try/catch.', example: 'if (n < 0) throw new Error("negative");' },

      // --- modules ---
      'import': { definition: 'Imports bindings from another module (ES6 modules).', example: 'import { readFile } from "fs";' },
      'export': { definition: 'Exports functions, objects, or values from a module.', example: 'export function greet() { }' },

      // --- types & values ---
      'typeof': { definition: 'Returns a string describing the operand\'s primitive type.', example: 'typeof 42  // "number"' },
      'instanceof': { definition: 'Tests whether an object is an instance of a particular class or constructor.', example: 'date instanceof Date  // true' },
      'null': { definition: 'Intentional absence of any value. A primitive.', example: 'let result = null;' },
      'undefined': { definition: 'A variable that has been declared but not assigned, or a missing property.', example: 'let x;\nconsole.log(x);  // undefined' },
      'true': { definition: 'Boolean literal for truth.', example: 'const ready = true;' },
      'false': { definition: 'Boolean literal for falsehood.', example: 'const done = false;' },

      // --- common stdlib ---
      'console.log': { definition: 'Prints output to the developer console.', example: 'console.log("Hello, world!");' },
      'JSON.parse': { definition: 'Parses a JSON string and returns the resulting value.', example: 'const obj = JSON.parse(\'{"a":1}\');' },
      'JSON.stringify': { definition: 'Converts a JavaScript value into a JSON string.', example: 'const text = JSON.stringify({ a: 1 });' },
      'setTimeout': { definition: 'Runs a function once after a delay (in milliseconds).', example: 'setTimeout(() => alert("hi"), 1000);' },
      'setInterval': { definition: 'Repeatedly runs a function on a fixed delay (in milliseconds).', example: 'const id = setInterval(tick, 1000);' },
    },
  },

  typescript: {
    label: 'TypeScript',
    monacoId: 'typescript',
    glossary: {
      // --- variables, functions, control flow (mirrors JS) ---
      'const': { definition: 'Declares a constant that cannot be reassigned.', example: 'const name: string = "Alice";' },
      'let': { definition: 'Declares a block-scoped variable.', example: 'let count: number = 0;' },
      'function': { definition: 'Declares a function with optional type annotations.', example: 'function add(a: number, b: number): number {\n  return a + b;\n}' },
      'return': { definition: 'Returns a value from a function.', example: 'function add(a: number, b: number): number {\n  return a + b;\n}' },
      'if': { definition: 'Conditional statement.', example: 'if (x > 10) {\n  console.log("big");\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n  console.log("small");\n}' },
      'for': { definition: 'Loop with counter.', example: 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}' },
      'while': { definition: 'Loop while condition is true.', example: 'while (count > 0) {\n  count--;\n}' },
      'switch': { definition: 'Multi-way branch on a single value, using case labels.', example: 'switch (kind) { case "a": ...; break; default: ...; }' },
      'case': { definition: 'A branch label inside a switch.', example: 'case 1: handleOne(); break;' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: throw new Error("unhandled");' },
      'break': { definition: 'Exits the enclosing loop or switch.', example: 'for (const n of items) { if (n < 0) break; }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for (const n of items) { if (!n) continue; }' },

      // --- type system ---
      'interface': { definition: 'Defines the shape of an object — what properties and types it must have.', example: 'interface User {\n  name: string;\n  age: number;\n}' },
      'type': { definition: 'Creates a type alias — a name for any type, including unions and intersections.', example: 'type ID = string | number;' },
      'enum': { definition: 'Defines a set of named constants.', example: 'enum Direction {\n  Up,\n  Down,\n  Left,\n  Right,\n}' },
      'class': { definition: 'Defines a class with typed properties and methods.', example: 'class Animal {\n  constructor(public name: string) {}\n}' },
      'extends': { definition: 'Inherits from a base class or constrains a generic type parameter.', example: 'class Dog extends Animal {}\nfunction f<T extends Length>(x: T) {}' },
      'implements': { definition: 'Declares that a class fulfils an interface contract.', example: 'class User implements HasName { name = "Ada"; }' },
      'as': { definition: 'Type assertion — tells TypeScript to treat a value as a specific type.', example: 'const el = document.querySelector("#x") as HTMLInputElement;' },
      'keyof': { definition: 'Operator that returns a union of the string-literal property names of a type.', example: 'type Keys = keyof User;  // "name" | "age"' },
      'typeof': { definition: 'In type position, takes the type of a value; at runtime, returns its primitive type string.', example: 'type T = typeof someConst;' },
      'readonly': { definition: 'Marks a property as immutable after construction.', example: 'interface User { readonly id: number; }' },

      // --- visibility & object modifiers ---
      'public': { definition: 'Class member is accessible from anywhere (the default).', example: 'class A { public greet() {} }' },
      'private': { definition: 'Class member is only accessible inside the declaring class.', example: 'class A { private secret = 42; }' },
      'protected': { definition: 'Class member is accessible inside the class and its subclasses.', example: 'class A { protected helper() {} }' },
      'abstract': { definition: 'A class or method that must be implemented by a subclass.', example: 'abstract class Shape { abstract area(): number; }' },
      'static': { definition: 'Method or property that belongs to the class itself, not an instance.', example: 'class M { static square(n: number) { return n * n; } }' },

      // --- async ---
      'async': { definition: 'Declares an async function returning a Promise.', example: 'async function fetchData(): Promise<Data> { }' },
      'await': { definition: 'Waits for a Promise to resolve.', example: 'const data = await fetchData();' },
      'Promise': { definition: 'Generic type for an asynchronous result that may resolve or reject.', example: 'function load(): Promise<string> { ... }' },

      // --- modules ---
      'import': { definition: 'Imports bindings from a module.', example: 'import { Component } from "react";' },
      'export': { definition: 'Exports declarations from a module.', example: 'export interface Config {\n  port: number;\n}' },

      // --- primitive & special types ---
      'string': { definition: 'Type for text values.', example: 'const name: string = "Alice";' },
      'number': { definition: 'Type for numeric values (integers and floats).', example: 'const age: number = 30;' },
      'boolean': { definition: 'Type for true/false values.', example: 'const isActive: boolean = true;' },
      'any': { definition: 'Opt-out of type checking. Use sparingly — it disables guarantees.', example: 'let x: any = JSON.parse(input);' },
      'unknown': { definition: 'Safer alternative to any — you must narrow it before using it.', example: 'let v: unknown = read();\nif (typeof v === "string") use(v);' },
      'never': { definition: 'The type of values that never occur (e.g. a function that always throws).', example: 'function fail(msg: string): never { throw new Error(msg); }' },
      'void': { definition: 'The absence of any return value from a function.', example: 'function log(s: string): void { console.log(s); }' },
      'null': { definition: 'The intentional absence of a value. With `strictNullChecks` this is its own type.', example: 'let v: string | null = null;' },
      'undefined': { definition: 'A value that hasn\'t been set. Has its own type.', example: 'let x: number | undefined;' },

      // --- common stdlib ---
      'console.log': { definition: 'Prints output to the console.', example: 'console.log("Hello, world!");' },
    },
  },

  java: {
    label: 'Java',
    monacoId: 'java',
    glossary: {
      // --- classes & visibility ---
      'class': { definition: 'Defines a class — the fundamental building block of Java programs.', example: 'public class Animal {\n    String name;\n}' },
      'interface': { definition: 'Defines a contract — a set of method signatures classes can implement.', example: 'interface Greet { String hello(); }' },
      'enum': { definition: 'Defines a type whose values are a fixed set of named constants.', example: 'enum Color { RED, GREEN, BLUE }' },
      'extends': { definition: 'Makes a class inherit from another class.', example: 'class Dog extends Animal { }' },
      'implements': { definition: 'Makes a class implement an interface.', example: 'class MyList implements List<String> { }' },
      'public': { definition: 'Access modifier — the member is accessible from any other class.', example: 'public class Main { }' },
      'private': { definition: 'Access modifier — the member is only accessible within its own class.', example: 'private int count = 0;' },
      'protected': { definition: 'Access modifier — accessible inside the same package and in subclasses.', example: 'protected void helper() { }' },
      'abstract': { definition: 'A class or method that has no body and must be implemented by a subclass.', example: 'abstract class Shape { abstract double area(); }' },
      'final': { definition: 'Cannot be reassigned (variable), subclassed (class), or overridden (method).', example: 'final int MAX = 10;' },
      'static': { definition: 'Belongs to the class itself, not to instances. Can be called without creating an object.', example: 'public static void main(String[] args) { }' },
      'void': { definition: 'Indicates a method does not return a value.', example: 'public void printHello() {\n    System.out.println("Hello");\n}' },
      'package': { definition: 'Declares the namespace this file belongs to.', example: 'package com.example.app;' },
      'this': { definition: 'Refers to the current instance inside a method or constructor.', example: 'public Dog(String name) { this.name = name; }' },
      'super': { definition: 'Calls the parent class\'s constructor or methods.', example: 'public Dog(String name) { super(name); }' },
      'new': { definition: 'Creates a new instance (object) of a class.', example: 'Dog myDog = new Dog("Rex");' },

      // --- control flow ---
      'if': { definition: 'Conditional statement that executes code when the condition is true.', example: 'if (x > 10) {\n    System.out.println("big");\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n    System.out.println("small");\n}' },
      'for': { definition: 'Loop that repeats with a counter variable.', example: 'for (int i = 0; i < 10; i++) {\n    System.out.println(i);\n}' },
      'while': { definition: 'Loop that repeats while a condition is true.', example: 'while (count > 0) {\n    count--;\n}' },
      'do': { definition: 'Do-while loop — body runs once before condition check.', example: 'do { prompt(); } while (!valid);' },
      'switch': { definition: 'Multi-way branch on a value using case labels.', example: 'switch (day) { case 1: ...; break; default: ...; }' },
      'case': { definition: 'A labelled branch inside a switch.', example: 'case 1: System.out.println("Mon"); break;' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: System.out.println("unknown");' },
      'break': { definition: 'Exits the enclosing loop or switch immediately.', example: 'for (int n : nums) { if (n < 0) break; }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for (int n : nums) { if (n == 0) continue; }' },
      'return': { definition: 'Returns a value from a method.', example: 'public int add(int a, int b) {\n    return a + b;\n}' },

      // --- errors ---
      'try': { definition: 'Starts an error-handling block for code that may throw exceptions.', example: 'try {\n    int result = 10 / x;\n} catch (Exception e) {\n    e.printStackTrace();\n}' },
      'catch': { definition: 'Catches and handles an exception from a try block.', example: 'catch (IOException e) {\n    System.err.println(e.getMessage());\n}' },
      'finally': { definition: 'Runs after try/catch regardless of whether an exception was thrown.', example: 'try { work(); } finally { cleanup(); }' },
      'throw': { definition: 'Raises an exception explicitly.', example: 'if (n < 0) throw new IllegalArgumentException("negative");' },
      'throws': { definition: 'Declares that a method may throw a specific checked exception.', example: 'public void load() throws IOException { ... }' },

      // --- imports & primitives ---
      'import': { definition: 'Imports a class or package for use in the current file.', example: 'import java.util.ArrayList;' },
      'String': { definition: 'Built-in class representing a sequence of characters (text).', example: 'String name = "Alice";' },
      'int': { definition: 'Primitive type for whole numbers (32-bit integer).', example: 'int count = 42;' },
      'long': { definition: 'Primitive type for 64-bit integers.', example: 'long n = 1_000_000_000L;' },
      'double': { definition: 'Primitive type for 64-bit floating-point numbers.', example: 'double pi = 3.14159;' },
      'float': { definition: 'Primitive type for 32-bit floating-point numbers.', example: 'float ratio = 1.5f;' },
      'boolean': { definition: 'Primitive type for true/false values.', example: 'boolean ready = true;' },
      'char': { definition: 'Primitive type for a single 16-bit character.', example: 'char letter = \'A\';' },
      'null': { definition: 'Reference literal meaning "no object". Default for unassigned reference variables.', example: 'String name = null;' },
      'true': { definition: 'Boolean literal for truth.', example: 'boolean done = true;' },
      'false': { definition: 'Boolean literal for falsehood.', example: 'boolean done = false;' },
      'instanceof': { definition: 'Tests whether an object is an instance of a given class or interface.', example: 'if (shape instanceof Circle c) { use(c); }' },

      // --- stdlib ---
      'System.out.println': { definition: 'Prints a line of text to the console.', example: 'System.out.println("Hello!");' },
    },
  },

  cpp: {
    label: 'C++',
    monacoId: 'cpp',
    glossary: {
      // --- preprocessor & headers ---
      '#include': { definition: 'Preprocessor directive that includes a header file.', example: '#include <iostream>\n#include <string>' },
      '#define': { definition: 'Preprocessor macro — text substitution before compilation.', example: '#define PI 3.14159' },
      'using': { definition: 'Brings names from a namespace into scope, or creates a type alias.', example: 'using namespace std;\nusing Id = int;' },
      'namespace': { definition: 'Groups related declarations under a named scope.', example: 'namespace math {\n    int square(int n) { return n * n; }\n}' },
      'std': { definition: 'The standard namespace containing built-in C++ library features.', example: 'std::cout << "Hello";' },

      // --- types & values ---
      'int': { definition: 'Integer type — stores whole numbers.', example: 'int x = 42;' },
      'long': { definition: 'Integer type at least 32 bits — usually 64 on modern systems.', example: 'long big = 10000000000L;' },
      'short': { definition: 'Integer type at least 16 bits.', example: 'short s = 32000;' },
      'char': { definition: 'Single-byte character type.', example: 'char c = \'A\';' },
      'bool': { definition: 'Boolean type with values true or false.', example: 'bool ready = true;' },
      'double': { definition: '64-bit floating-point type.', example: 'double pi = 3.14159;' },
      'float': { definition: '32-bit floating-point type.', example: 'float r = 1.5f;' },
      'void': { definition: 'Indicates a function returns no value, or a generic pointer (`void*`).', example: 'void printHello() { cout << "Hello" << endl; }' },
      'auto': { definition: 'Lets the compiler deduce the type automatically.', example: 'auto x = 3.14;  // deduced as double' },
      'const': { definition: 'Marks a value as immutable after initialization.', example: 'const int MAX = 100;' },
      'constexpr': { definition: 'A value or function that can be evaluated at compile time.', example: 'constexpr int square(int n) { return n * n; }' },
      'nullptr': { definition: 'Null pointer literal (C++11+). Represents a pointer that points to nothing.', example: 'int* ptr = nullptr;' },
      'true': { definition: 'Boolean literal for truth.', example: 'bool ok = true;' },
      'false': { definition: 'Boolean literal for falsehood.', example: 'bool ok = false;' },

      // --- classes & structs ---
      'class': { definition: 'Defines a class with members and methods. Members default to private.', example: 'class Dog {\npublic:\n    string name;\n};' },
      'struct': { definition: 'Defines a structure — like a class but members are public by default.', example: 'struct Point {\n    int x;\n    int y;\n};' },
      'public': { definition: 'Class members below this label are accessible from outside the class.', example: 'class A {\npublic:\n    void greet();\n};' },
      'private': { definition: 'Class members below this label are accessible only inside the class.', example: 'class A {\nprivate:\n    int secret;\n};' },
      'protected': { definition: 'Class members accessible inside the class and its subclasses.', example: 'class A {\nprotected:\n    void helper();\n};' },
      'virtual': { definition: 'Marks a method so subclasses can override it; enables runtime polymorphism.', example: 'class Shape { virtual double area() = 0; };' },
      'override': { definition: 'Declares that a method overrides a virtual method in the base class.', example: 'double area() const override { return w * h; }' },
      'this': { definition: 'Pointer to the current instance inside a member function.', example: 'void Dog::rename(const string& n) { this->name = n; }' },
      'template': { definition: 'Creates generic functions or classes that work with any type.', example: 'template <typename T>\nT max(T a, T b) {\n    return (a > b) ? a : b;\n}' },
      'typename': { definition: 'Inside templates, says that a dependent name is a type.', example: 'template<class T> using Vec = std::vector<typename T::value_type>;' },
      'enum': { definition: 'Defines a type with a fixed set of named integer constants.', example: 'enum Color { RED, GREEN, BLUE };' },

      // --- memory ---
      'new': { definition: 'Allocates memory on the heap and returns a pointer.', example: 'int* ptr = new int(42);' },
      'delete': { definition: 'Frees memory allocated with new.', example: 'delete ptr;\nptr = nullptr;' },

      // --- control flow ---
      'if': { definition: 'Conditional statement.', example: 'if (x > 10) {\n    cout << "big" << endl;\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n    cout << "small" << endl;\n}' },
      'for': { definition: 'Loop with counter.', example: 'for (int i = 0; i < 10; i++) {\n    cout << i << endl;\n}' },
      'while': { definition: 'Loop that repeats while condition is true.', example: 'while (count > 0) {\n    count--;\n}' },
      'do': { definition: 'Do-while loop — body runs once before condition check.', example: 'do { prompt(); } while (!valid);' },
      'switch': { definition: 'Multi-way branch using case labels.', example: 'switch (k) { case 1: ...; break; default: ...; }' },
      'case': { definition: 'A labelled branch inside a switch.', example: 'case 1: cout << "one"; break;' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: cout << "unknown";' },
      'break': { definition: 'Exits the enclosing loop or switch immediately.', example: 'for (...) { if (cond) break; }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for (...) { if (skip) continue; }' },
      'return': { definition: 'Returns a value from a function.', example: 'int add(int a, int b) {\n    return a + b;\n}' },

      // --- errors ---
      'try': { definition: 'Starts an error-handling block.', example: 'try { mayThrow(); } catch (const std::exception& e) { ... }' },
      'catch': { definition: 'Catches an exception thrown in the matching try block.', example: 'catch (const std::runtime_error& e) { cerr << e.what(); }' },
      'throw': { definition: 'Raises an exception.', example: 'if (n < 0) throw std::invalid_argument("negative");' },

      // --- stdlib ---
      'cout': { definition: 'Standard output stream — used to print to console.', example: 'cout << "Hello, world!" << endl;' },
      'cin': { definition: 'Standard input stream — reads user input from console.', example: 'cin >> name;' },
      'endl': { definition: 'Inserts a newline into an output stream and flushes the buffer.', example: 'cout << "done" << endl;' },
      'string': { definition: 'Standard text class from <string>.', example: 'std::string name = "Alice";' },
      'vector': { definition: 'Standard dynamic array from <vector>.', example: 'std::vector<int> nums = {1, 2, 3};' },
    },
  },

  c: {
    label: 'C',
    monacoId: 'c',
    glossary: {
      // --- preprocessor ---
      '#include': { definition: 'Preprocessor directive that pastes the contents of a header file.', example: '#include <stdio.h>\n#include <stdlib.h>' },
      '#define': { definition: 'Defines a macro — text substitution performed before compilation.', example: '#define MAX 100' },

      // --- types ---
      'int': { definition: 'Signed integer type (typically 32 bits).', example: 'int count = 42;' },
      'long': { definition: 'Signed integer at least 32 bits — usually 64 on 64-bit systems.', example: 'long big = 1000000000L;' },
      'short': { definition: 'Signed integer at least 16 bits.', example: 'short s = 100;' },
      'char': { definition: 'Single-byte type, used for characters or small integers.', example: 'char c = \'A\';' },
      'float': { definition: '32-bit floating-point type.', example: 'float ratio = 1.5f;' },
      'double': { definition: '64-bit floating-point type.', example: 'double pi = 3.14159;' },
      'void': { definition: 'Indicates no value (return type) or a generic pointer type (`void*`).', example: 'void greet(void) { printf("Hello\\n"); }' },
      'unsigned': { definition: 'Modifier — the integer cannot be negative; doubles its positive range.', example: 'unsigned int n = 4294967295u;' },
      'signed': { definition: 'Modifier — explicitly allows negative values (default for int/char by signedness rules).', example: 'signed char c = -1;' },
      'const': { definition: 'Marks a variable as immutable after initialisation.', example: 'const int MAX = 100;' },
      'static': { definition: 'At file scope: limits visibility to this file. Inside a function: persists between calls.', example: 'static int counter = 0;' },
      'extern': { definition: 'Declares a variable or function defined in another translation unit.', example: 'extern int errno;' },

      // --- control flow ---
      'if': { definition: 'Conditional statement.', example: 'if (x > 10) {\n    printf("big\\n");\n}' },
      'else': { definition: 'Runs when the if condition is false.', example: 'else { printf("small\\n"); }' },
      'for': { definition: 'Loop with counter expressions.', example: 'for (int i = 0; i < 10; i++) {\n    printf("%d\\n", i);\n}' },
      'while': { definition: 'Loop that repeats while a condition is true.', example: 'while (count > 0) { count--; }' },
      'do': { definition: 'Do-while loop — body runs once before the condition is tested.', example: 'do { prompt(); } while (!ok);' },
      'switch': { definition: 'Multi-way branch on an integer value, using case labels.', example: 'switch (k) { case 1: ...; break; default: ...; }' },
      'case': { definition: 'A labelled branch inside a switch.', example: 'case 1: puts("one"); break;' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: puts("unknown");' },
      'break': { definition: 'Exits the enclosing loop or switch immediately.', example: 'for (...) { if (done) break; }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for (...) { if (skip) continue; }' },
      'goto': { definition: 'Jumps to a labelled statement. Rarely used; usually replaced by break/continue/functions.', example: 'if (err) goto cleanup;' },
      'return': { definition: 'Returns a value from a function (or just exits a void function).', example: 'int add(int a, int b) { return a + b; }' },

      // --- composite types ---
      'struct': { definition: 'Defines a composite type with named fields.', example: 'struct Point { int x; int y; };' },
      'union': { definition: 'Like a struct, but all members share the same memory.', example: 'union Pack { int i; float f; };' },
      'enum': { definition: 'Defines a set of named integer constants.', example: 'enum Color { RED, GREEN, BLUE };' },
      'typedef': { definition: 'Creates a new name (alias) for an existing type.', example: 'typedef unsigned long u64;' },
      'sizeof': { definition: 'Operator that returns the size of a type or value in bytes.', example: 'size_t n = sizeof(int);' },

      // --- memory & stdlib ---
      'malloc': { definition: 'Allocates uninitialised heap memory. Returns NULL on failure.', example: 'int* a = malloc(n * sizeof(int));' },
      'free': { definition: 'Releases memory previously allocated by malloc/calloc/realloc.', example: 'free(a);\na = NULL;' },
      'NULL': { definition: 'Null pointer constant — represents a pointer that doesn\'t point anywhere.', example: 'if (p == NULL) return;' },
      'printf': { definition: 'Prints formatted text to standard output.', example: 'printf("hello %s, age %d\\n", name, age);' },
      'scanf': { definition: 'Reads formatted input from standard input.', example: 'int n;\nscanf("%d", &n);' },
      'puts': { definition: 'Writes a string and a newline to standard output.', example: 'puts("Hello, world!");' },
    },
  },

  csharp: {
    label: 'C#',
    monacoId: 'csharp',
    glossary: {
      // --- modules & namespaces ---
      'using': { definition: 'Imports a namespace or ensures an object is disposed after use.', example: 'using System;\nusing System.Collections.Generic;' },
      'namespace': { definition: 'Groups related types under a named scope.', example: 'namespace MyApp.Services { ... }' },

      // --- types ---
      'class': { definition: 'Defines a class — the core building block of C# programs.', example: 'public class Person {\n    public string Name { get; set; }\n}' },
      'struct': { definition: 'Defines a value type — copied by value, lightweight, no inheritance.', example: 'public struct Point { public int X, Y; }' },
      'interface': { definition: 'Defines a contract — a set of members classes/structs can implement.', example: 'public interface IGreet { string Hello(); }' },
      'enum': { definition: 'Defines a value type with a fixed set of named constants.', example: 'enum Direction { Up, Down, Left, Right }' },
      'record': { definition: 'Reference type with value-based equality and concise syntax (C# 9+).', example: 'public record Person(string Name, int Age);' },

      // --- modifiers ---
      'public': { definition: 'Access modifier — accessible from any code.', example: 'public void Greet() { }' },
      'private': { definition: 'Access modifier — accessible only within the same class.', example: 'private int _count;' },
      'protected': { definition: 'Access modifier — accessible within the same class and subclasses.', example: 'protected void Helper() { }' },
      'internal': { definition: 'Access modifier — accessible within the same assembly.', example: 'internal class Cache { }' },
      'abstract': { definition: 'A class or member that must be implemented by a derived class.', example: 'public abstract class Shape { public abstract double Area(); }' },
      'virtual': { definition: 'Allows a method to be overridden in derived classes.', example: 'public virtual void Speak() { }' },
      'override': { definition: 'Replaces a virtual or abstract method from the base class.', example: 'public override void Speak() => Console.WriteLine("Woof");' },
      'sealed': { definition: 'Prevents further inheritance from a class or overriding of a method.', example: 'public sealed class FinalThing { }' },
      'static': { definition: 'Belongs to the type itself rather than a specific instance.', example: 'public static void Main(string[] args) { }' },
      'readonly': { definition: 'Field can only be assigned at declaration or in the constructor.', example: 'private readonly int _max = 10;' },
      'const': { definition: 'Compile-time constant — value must be known at compile time.', example: 'public const double Pi = 3.14159;' },
      'void': { definition: 'Indicates a method returns no value.', example: 'public void PrintHello() {\n    Console.WriteLine("Hello");\n}' },

      // --- control flow ---
      'if': { definition: 'Conditional statement.', example: 'if (x > 10) {\n    Console.WriteLine("big");\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n    Console.WriteLine("small");\n}' },
      'for': { definition: 'Loop with a counter variable.', example: 'for (int i = 0; i < 10; i++) {\n    Console.WriteLine(i);\n}' },
      'foreach': { definition: 'Iterates over each element in a collection.', example: 'foreach (var item in list) {\n    Console.WriteLine(item);\n}' },
      'while': { definition: 'Loop that repeats while a condition is true.', example: 'while (count > 0) {\n    count--;\n}' },
      'do': { definition: 'Do-while loop — body runs at least once before condition check.', example: 'do { Prompt(); } while (!ok);' },
      'switch': { definition: 'Multi-way branch (statement or expression) on a value.', example: 'switch (kind) { case "a": ...; break; default: ...; }' },
      'case': { definition: 'A labelled branch inside a switch.', example: 'case 1: HandleOne(); break;' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: throw new InvalidOperationException();' },
      'break': { definition: 'Exits the enclosing loop or switch immediately.', example: 'foreach (var n in nums) { if (n < 0) break; }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'foreach (var n in nums) { if (n == 0) continue; }' },
      'return': { definition: 'Returns a value from a method.', example: 'public int Add(int a, int b) {\n    return a + b;\n}' },

      // --- errors ---
      'try': { definition: 'Starts an error-handling block.', example: 'try { Work(); } catch (Exception e) { Log(e); }' },
      'catch': { definition: 'Catches an exception thrown in the try block.', example: 'catch (IOException e) { Log(e); }' },
      'finally': { definition: 'Runs after try/catch regardless of whether an exception was thrown.', example: 'try { Open(); } finally { Close(); }' },
      'throw': { definition: 'Raises an exception.', example: 'if (n < 0) throw new ArgumentException("negative");' },

      // --- this/base, references ---
      'this': { definition: 'Refers to the current instance inside an instance member.', example: 'public Person(string name) { this.Name = name; }' },
      'base': { definition: 'Refers to the parent class — used to call its constructor or methods.', example: 'public Dog(string n) : base(n) { }' },
      'new': { definition: 'Creates a new instance of a class.', example: 'var dog = new Dog("Rex");' },
      'is': { definition: 'Type test (and optional pattern match).', example: 'if (shape is Circle c) UseCircle(c);' },
      'as': { definition: 'Tries to cast to a reference type; returns null on failure.', example: 'var t = obj as Tag;\nif (t == null) return;' },

      // --- types & values ---
      'var': { definition: 'Implicitly typed local variable — compiler infers the type.', example: 'var name = "Alice";  // inferred as string' },
      'string': { definition: 'Built-in type for text.', example: 'string greeting = "Hello!";' },
      'int': { definition: 'Built-in type for 32-bit integers.', example: 'int count = 42;' },
      'long': { definition: 'Built-in type for 64-bit integers.', example: 'long ticks = DateTime.UtcNow.Ticks;' },
      'double': { definition: 'Built-in type for 64-bit floating-point numbers.', example: 'double pi = 3.14159;' },
      'bool': { definition: 'Built-in type for true/false values.', example: 'bool ready = true;' },
      'char': { definition: 'Built-in type for a single 16-bit character.', example: 'char letter = \'A\';' },
      'null': { definition: 'Literal meaning "no object". Reference types are nullable; value types need `?` to be.', example: 'string? maybe = null;' },
      'true': { definition: 'Boolean literal for truth.', example: 'bool done = true;' },
      'false': { definition: 'Boolean literal for falsehood.', example: 'bool done = false;' },

      // --- async ---
      'async': { definition: 'Marks a method as asynchronous.', example: 'public async Task<string> FetchDataAsync() { }' },
      'await': { definition: 'Waits for an async operation to complete.', example: 'var data = await httpClient.GetStringAsync(url);' },
      'Task': { definition: 'Represents an asynchronous operation. `Task<T>` returns a value.', example: 'public Task<int> ComputeAsync() => Task.FromResult(42);' },

      // --- stdlib ---
      'Console.WriteLine': { definition: 'Prints a line of text to the console.', example: 'Console.WriteLine("Hello, world!");' },
    },
  },

  go: {
    label: 'Go',
    monacoId: 'go',
    glossary: {
      // --- modules ---
      'package': { definition: 'Declares which package this file belongs to.', example: 'package main' },
      'import': { definition: 'Imports packages for use.', example: 'import (\n    "fmt"\n    "os"\n)' },

      // --- functions, vars, types ---
      'func': { definition: 'Declares a function.', example: 'func greet(name string) string {\n    return "Hello " + name\n}' },
      'var': { definition: 'Declares a variable with an explicit type.', example: 'var count int = 0' },
      ':=': { definition: 'Short variable declaration — declares and assigns with inferred type.', example: 'name := "Alice"' },
      'const': { definition: 'Declares a compile-time constant.', example: 'const Pi = 3.14159' },
      'type': { definition: 'Declares a new named type or type alias.', example: 'type ID int' },
      'struct': { definition: 'Defines a composite type — a collection of fields.', example: 'type Person struct {\n    Name string\n    Age  int\n}' },
      'interface': { definition: 'Defines a set of method signatures. Types implement interfaces implicitly.', example: 'type Reader interface {\n    Read(p []byte) (n int, err error)\n}' },
      'iota': { definition: 'Auto-incrementing identifier inside a const block. Resets to 0 in each block.', example: 'const (\n    Sun = iota  // 0\n    Mon         // 1\n    Tue         // 2\n)' },

      // --- control flow ---
      'if': { definition: 'Conditional statement.', example: 'if x > 10 {\n    fmt.Println("big")\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n    fmt.Println("small")\n}' },
      'for': { definition: 'The only loop construct in Go — replaces while, for, and foreach.', example: 'for i := 0; i < 10; i++ {\n    fmt.Println(i)\n}' },
      'range': { definition: 'Iterates over elements of arrays, slices, maps, strings, or channels.', example: 'for i, v := range items {\n    fmt.Println(i, v)\n}' },
      'switch': { definition: 'Multi-way branch on a value or condition. No automatic fallthrough.', example: 'switch day {\ncase "Mon": ...\ndefault: ...\n}' },
      'case': { definition: 'A labelled branch inside a switch.', example: 'case "monday": handleMonday()' },
      'default': { definition: 'Catch-all branch in a switch.', example: 'default: fmt.Println("unknown")' },
      'fallthrough': { definition: 'Inside a switch case, falls through to the next case (Go does not do this by default).', example: 'case 1:\n    fmt.Println("one")\n    fallthrough\ncase 2:\n    fmt.Println("also two")' },
      'break': { definition: 'Exits the innermost for, switch, or select statement.', example: 'for { if done { break } }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for _, n := range nums { if n == 0 { continue }; use(n) }' },
      'goto': { definition: 'Jumps to a label in the same function. Use sparingly.', example: 'if err != nil { goto cleanup }' },
      'return': { definition: 'Returns values from a function. Go supports multiple return values.', example: 'func divide(a, b float64) (float64, error) {\n    if b == 0 { return 0, errors.New("/0") }\n    return a / b, nil\n}' },
      'defer': { definition: 'Schedules a function call to run when the surrounding function returns.', example: 'defer file.Close()' },

      // --- concurrency ---
      'go': { definition: 'Starts a goroutine — a lightweight concurrent thread.', example: 'go processData(data)' },
      'chan': { definition: 'Channel type — used for communication between goroutines.', example: 'ch := make(chan int)' },
      'select': { definition: 'Waits on multiple channel operations and runs whichever is ready first.', example: 'select {\ncase v := <-ch1: handle(v)\ncase <-time.After(time.Second): timeout()\n}' },

      // --- built-ins ---
      'make': { definition: 'Allocates and initialises slices, maps, and channels.', example: 'nums := make([]int, 0, 10)\nm := make(map[string]int)' },
      'new': { definition: 'Allocates zeroed storage for a value of type T and returns a *T.', example: 'p := new(int)\n*p = 42' },
      'len': { definition: 'Returns the length of a string, array, slice, map, or channel.', example: 'len("hello")  // 5' },
      'cap': { definition: 'Returns the capacity of a slice, array, or channel.', example: 'cap(buf)' },
      'append': { definition: 'Adds elements to the end of a slice, returning a new slice.', example: 'nums = append(nums, 4, 5, 6)' },
      'panic': { definition: 'Triggers a runtime error and starts unwinding the stack.', example: 'if x == nil { panic("nil x") }' },
      'recover': { definition: 'Inside a deferred function, regains control of a panicking goroutine.', example: 'defer func() { if r := recover(); r != nil { log(r) } }()' },
      'error': { definition: 'Built-in interface type for representing an error condition.', example: 'func read() (string, error) { return "", io.EOF }' },
      'nil': { definition: 'Zero value for pointers, interfaces, maps, slices, channels, and functions.', example: 'if err != nil {\n    log.Fatal(err)\n}' },
      'true': { definition: 'Boolean literal for truth.', example: 'done := true' },
      'false': { definition: 'Boolean literal for falsehood.', example: 'done := false' },

      // --- common primitive types ---
      'string': { definition: 'Built-in immutable text type.', example: 'name := "Alice"' },
      'int': { definition: 'Platform-sized signed integer (32 or 64 bits).', example: 'count := 42' },
      'float64': { definition: '64-bit floating-point type.', example: 'pi := 3.14159' },
      'bool': { definition: 'Built-in boolean type.', example: 'var ready bool = true' },
      'byte': { definition: 'Alias for uint8 — typically used for raw byte data.', example: 'b := []byte("hi")' },
      'rune': { definition: 'Alias for int32 — represents a single Unicode code point.', example: 'r := \'A\'' },

      // --- stdlib ---
      'fmt.Println': { definition: 'Prints values to standard output followed by a newline.', example: 'fmt.Println("Hello, world!")' },
    },
  },

  rust: {
    label: 'Rust',
    monacoId: 'rust',
    glossary: {
      // --- functions, modules ---
      'fn': { definition: 'Declares a function.', example: 'fn greet(name: &str) -> String {\n    format!("Hello {}", name)\n}' },
      'mod': { definition: 'Declares a module — a unit of code organisation.', example: 'mod math {\n    pub fn square(n: i32) -> i32 { n * n }\n}' },
      'use': { definition: 'Brings items from a module into scope.', example: 'use std::collections::HashMap;' },
      'pub': { definition: 'Makes an item public (visible outside its module).', example: 'pub fn process(data: &str) { }' },
      'crate': { definition: 'Refers to the root of the current crate (Rust\'s compilation unit).', example: 'use crate::math::square;' },
      'self': { definition: 'Refers to the current module (path) or the current instance (parameter).', example: 'use self::helpers::run;\nimpl A { fn f(self) {} }' },
      'Self': { definition: 'The type of the current impl block — useful for constructors.', example: 'impl Point { fn origin() -> Self { Self { x:0, y:0 } } }' },

      // --- bindings ---
      'let': { definition: 'Declares an immutable variable binding.', example: 'let x = 42;' },
      'let mut': { definition: 'Declares a mutable variable binding.', example: 'let mut count = 0;\ncount += 1;' },
      'const': { definition: 'Declares a compile-time constant. Must have an explicit type.', example: 'const MAX: u32 = 100;' },
      'static': { definition: 'A value with a fixed memory location and \'static lifetime.', example: 'static GREETING: &str = "hi";' },
      'mut': { definition: 'Marks a binding or reference as mutable.', example: 'let mut v = vec![1, 2, 3];\nfn push(v: &mut Vec<i32>) {}' },
      'ref': { definition: 'In a pattern, binds by reference instead of moving.', example: 'if let Some(ref x) = opt { use(x); }' },
      'move': { definition: 'Forces a closure to take ownership of captured variables.', example: 'thread::spawn(move || work(data));' },

      // --- types ---
      'struct': { definition: 'Defines a structure with named fields.', example: 'struct Point {\n    x: f64,\n    y: f64,\n}' },
      'enum': { definition: 'Defines a type that can be one of several variants.', example: 'enum Color { Red, Green, Blue }' },
      'impl': { definition: 'Implements methods for a struct or trait.', example: 'impl Point {\n    fn new(x: f64, y: f64) -> Self { Point { x, y } }\n}' },
      'trait': { definition: 'Defines shared behavior (like interfaces in other languages).', example: 'trait Greet {\n    fn hello(&self) -> String;\n}' },
      'dyn': { definition: 'Marks a trait object — dynamic dispatch instead of monomorphisation.', example: 'fn render(x: &dyn Shape) { x.draw(); }' },
      'where': { definition: 'Adds trait-bound clauses to a generic — keeps signatures readable.', example: 'fn longest<T>(a: T, b: T) -> T where T: Ord { ... }' },
      'as': { definition: 'Casts between primitive types or renames imports.', example: 'let f = i as f64;\nuse std::io::Result as IoResult;' },

      // --- control flow ---
      'if': { definition: 'Conditional expression.', example: 'if x > 10 {\n    println!("big");\n}' },
      'else': { definition: 'Executes when the if condition is false.', example: 'else {\n    println!("small");\n}' },
      'for': { definition: 'Iterates over an iterator.', example: 'for i in 0..10 {\n    println!("{}", i);\n}' },
      'loop': { definition: 'Infinite loop — must use break to exit. Can break with a value.', example: 'let answer = loop {\n    if ready { break 42; }\n};' },
      'while': { definition: 'Loop that repeats while condition is true.', example: 'while count > 0 {\n    count -= 1;\n}' },
      'match': { definition: 'Pattern matching — like a powerful switch statement.', example: 'match value {\n    1 => println!("one"),\n    2 => println!("two"),\n    _ => println!("other"),\n}' },
      'break': { definition: 'Exits the nearest loop. With `loop`, can return a value.', example: 'for n in nums { if n < 0 { break; } }' },
      'continue': { definition: 'Skips the rest of the current loop iteration.', example: 'for n in nums { if n == 0 { continue; } use(n); }' },
      'return': { definition: 'Returns a value from a function. The last expression without ; is also returned.', example: 'fn add(a: i32, b: i32) -> i32 {\n    a + b  // implicit return\n}' },

      // --- enums & error types ---
      'Option': { definition: 'Enum representing an optional value: Some(value) or None.', example: 'let result: Option<i32> = Some(42);' },
      'Some': { definition: 'The "value present" variant of Option.', example: 'let v = Some("hi");' },
      'None': { definition: 'The "no value" variant of Option.', example: 'let v: Option<i32> = None;' },
      'Result': { definition: 'Enum for operations that can fail: Ok(value) or Err(error).', example: 'fn parse(s: &str) -> Result<i32, ParseIntError> { s.parse() }' },
      'Ok': { definition: 'The success variant of Result.', example: 'Ok(42)' },
      'Err': { definition: 'The failure variant of Result.', example: 'Err("bad input".into())' },

      // --- safety ---
      'unsafe': { definition: 'Opts in to operations Rust can\'t guarantee are safe (raw pointers, FFI, etc.).', example: 'unsafe { *ptr = 42; }' },

      // --- built-in types ---
      'String': { definition: 'Growable, owned, UTF-8 string type from std.', example: 'let s: String = String::from("hi");' },
      '&str': { definition: 'Borrowed string slice — a view into a String or string literal.', example: 'fn greet(name: &str) { println!("hi {}", name); }' },
      'Vec': { definition: 'Growable contiguous array type from std.', example: 'let v: Vec<i32> = vec![1, 2, 3];' },
      'i32': { definition: '32-bit signed integer.', example: 'let n: i32 = -1;' },
      'u32': { definition: '32-bit unsigned integer.', example: 'let n: u32 = 1;' },
      'usize': { definition: 'Pointer-sized unsigned integer. Used for indexing collections.', example: 'let idx: usize = 0;' },
      'f64': { definition: '64-bit floating-point type.', example: 'let pi: f64 = 3.14159;' },
      'bool': { definition: 'Boolean type — true or false.', example: 'let ready: bool = true;' },

      // --- macros ---
      'println!': { definition: 'Macro that prints formatted text to stdout with a newline.', example: 'println!("Hello, {}!", name);' },
      'print!': { definition: 'Like println!, but without a trailing newline.', example: 'print!("Loading…");' },
      'format!': { definition: 'Returns a formatted String instead of printing it.', example: 'let s = format!("{}-{}", a, b);' },
      'vec!': { definition: 'Macro that constructs a Vec from a list of values.', example: 'let v = vec![1, 2, 3];' },
      'panic!': { definition: 'Macro that aborts the current thread with an error message.', example: 'panic!("unreachable");' },
    },
  },
};

export const LANGUAGE_LIST = Object.entries(LANGUAGES).map(([id, lang]) => ({
  id,
  ...lang,
}));
