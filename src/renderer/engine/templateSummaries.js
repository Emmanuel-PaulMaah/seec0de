// templateSummaries.js
//
// Hand-written, AI-quality plain-English summaries for every code template
// in codeGenerator.js, keyed by [templateName][language].
//
// The offline explainer (codeExplainer.js) checks whether the code it was
// handed matches a known template; if so, it uses the bespoke summary here
// instead of its generic "this code uses loops, contains functions" line.
// Line-by-line breakdowns still come from the heuristic — these summaries
// give the learner the big picture in one sentence so the line-by-line has
// context to live inside.
//
// Style rules used while writing these:
//   * Reference actual function names, variable names, and literal values
//     from the template — never "a function" or "a variable".
//   * Mention the algorithm/idiom by name where there is one
//     (bubble sort, FizzBuzz, trial division, slice-step reversal, etc.).
//   * Highlight the language-specific tools the template actually uses
//     (LINQ, iterator combinators, varargs, embedded structs, traits, …).
//   * 1–2 sentences, no fluff.

export const TEMPLATE_SUMMARIES = {
  hello: {
    python:
      'Defines `greet(name)` which builds a personalised greeting with an f-string, prints it, and returns the string. `main()` prints `"Hello, World!"` and then calls `greet("User")`, so the program produces two lines of output.',
    javascript:
      'Defines `greet(name)` which builds a personalised greeting using a template literal, logs it, and returns the string. `main()` prints `"Hello, World!"` and then calls `greet("User")`, producing two lines of output.',
    typescript:
      'A typed `greet(name: string): string` that builds a greeting with a template literal, logs it, and returns it. `main(): void` prints `"Hello, World!"` and calls `greet("User")`; the bottom `main()` call kicks the program off.',
    java:
      'A `HelloWorld` class whose static `greet(String)` method prints `"Hello, " + name + "!"` and returns the greeting. `main` prints `"Hello, World!"` and then calls `greet("User")`, producing two output lines.',
    cpp:
      'Defines `greet(const string&)` which builds a personalised greeting via string concatenation, prints it with `cout`, and returns the string. `main()` prints `"Hello, World!"` and calls `greet("User")`, producing two output lines.',
    csharp:
      'A `Program` class whose static `Greet(string)` builds a greeting with an interpolated string (`$"..."`), writes it to the console, and returns it. `Main` prints `"Hello, World!"` and then calls `Greet("User")`.',
    go:
      'Defines `greet(name string)` which uses `fmt.Sprintf` to build a greeting, prints it with `fmt.Println`, and returns it. `main()` prints `"Hello, World!"` and then calls `greet("User")`.',
    rust:
      'A `greet(name: &str) -> String` that uses `format!` to build an owned `String`, prints it with `println!`, and returns it (Rust\'s implicit final-expression return — note the missing semicolon). `main()` prints `"Hello, World!"` and then calls `greet("User")`.',
  },

  sort: {
    python:
      'Implements bubble sort in `bubble_sort(arr)` — repeatedly compares adjacent pairs and swaps them when out of order, with a `swapped` flag that breaks out of the outer loop early once the list is fully sorted. Sorts the seven-element list `[64, 34, 25, 12, 22, 11, 90]` and prints the result.',
    javascript:
      'Implements bubble sort in `bubbleSort(arr)` — adjacent-pair comparison plus destructuring swap, with a `swapped` flag for early exit when the array is already in order. Sorts the seven-element array `[64, 34, 25, 12, 22, 11, 90]` in place and logs the sorted result.',
    typescript:
      'A typed `bubbleSort(arr: number[]): number[]` that sorts the array in place with adjacent-pair comparisons and a destructuring swap, breaking early via the `swapped` flag. Sorts `[64, 34, 25, 12, 22, 11, 90]` and logs the result.',
    java:
      'A `BubbleSort` class whose static `bubbleSort(int[])` repeatedly swaps adjacent out-of-order pairs, using a `swapped` flag to break out early once a full pass made no swaps. `main` sorts `{64, 34, 25, 12, 22, 11, 90}` in place and prints the result with `Arrays.toString`.',
    cpp:
      'A `bubbleSort` function that takes a `vector<int>&` by reference, repeatedly swapping adjacent out-of-order elements with `std::swap`. A `swapped` flag breaks the outer loop once the data is sorted. `main` sorts `{64, 34, 25, 12, 22, 11, 90}` and prints each number with a range-based for loop.',
    csharp:
      'A `BubbleSort` class whose static `Sort(int[])` performs in-place bubble sort with C# 7+ tuple-swap syntax (`(a, b) = (b, a)`) and a `swapped` flag for early exit. `Main` sorts `{64, 34, 25, 12, 22, 11, 90}` and prints the joined result.',
    go:
      'A `bubbleSort([]int)` function that mutates the slice in place — adjacent-pair comparison with parallel-assignment swap and a `swapped` flag for early termination. `main` sorts `{64, 34, 25, 12, 22, 11, 90}` and prints it.',
    rust:
      'A `bubble_sort(arr: &mut Vec<i32>)` that sorts in place using `arr.swap(j, j + 1)` and a `swapped` early-exit flag. `main` sorts `vec![64, 34, 25, 12, 22, 11, 90]` and prints it with the `{:?}` debug formatter.',
  },

  loop: {
    python:
      'Demonstrates Python\'s main loop forms over the list `["apple", "banana", "cherry", "date"]`: a count-based `for i in range(10)`, a collection-based `for item in items`, an indexed `enumerate`, and a `while count > 0` countdown from 5. Prints results at every step.',
    javascript:
      'Walks through JavaScript\'s main looping styles over `["apple", "banana", "cherry", "date"]`: a classical `for (let i = 0; i < 10; i++)`, a `for...of`, an `items.forEach((item, index) => …)`, and a `while (count > 0)` countdown from 5. Each loop prints a labelled line.',
    typescript:
      'Typed walkthrough of JavaScript loop styles on `string[]`: a classical `for` counter, a `for...of`, an `items.forEach((item: string, index: number) => …)`, and a `while (count > 0)` countdown from 5. Type annotations make the variable contracts explicit.',
    java:
      'A `Loops` class whose `main` demonstrates Java\'s three primary loops on `Arrays.asList("apple", "banana", "cherry", "date")`: an indexed `for` from 0–9, an enhanced `for (String item : items)`, and a `while (count > 0)` countdown from 5. Each loop prints a labelled line.',
    cpp:
      'Demonstrates C++\'s main loop forms on `vector<string>{"apple", "banana", "cherry", "date"}`: an indexed `for (int i = 0; i < 10; i++)`, a range-based `for (const auto& item : items)`, and a `while (count > 0)` countdown from 5. Each iteration prints to `cout`.',
    csharp:
      'A `Loops` class whose `Main` runs three loop forms on `new List<string>{...}`: a counting `for`, a `foreach (var item in items)`, and a `while (count > 0)` countdown from 5. Each iteration writes an interpolated line to the console.',
    go:
      'Demonstrates Go\'s loop forms on `[]string{"apple", "banana", "cherry", "date"}`: a classical counting `for i := 0; i < 10; i++`, a `for index, item := range items`, and a while-style `for count > 0` countdown from 5. Each iteration prints with `fmt.Printf`.',
    rust:
      'Demonstrates Rust\'s main loop forms on `vec!["apple", "banana", "cherry", "date"]`: a counting `for i in 0..10`, an `items.iter().enumerate()` loop, and a `while count > 0` countdown from a `mut` integer set to 5. Each iteration calls `println!`.',
  },

  func: {
    python:
      'Defines `calculate_area(shape, *dimensions)` using Python\'s variadic `*args` — dispatches on `shape` (`"circle"`, `"rectangle"`, `"triangle"`) and computes the area, using `math.pi` for the circle. Raises `ValueError` for unknown shapes. Calls it once for each shape and prints results to two decimal places.',
    javascript:
      'Defines `calculateArea(shape, ...dimensions)` using JavaScript\'s rest parameters — branches on `shape` and computes circle (`Math.PI * r²`), rectangle (`w * h`), or triangle (`0.5 * b * h`). Logs an error for unknown shapes. Invokes it once per shape and logs each result.',
    typescript:
      'Typed `calculateArea(shape: string, ...dimensions: number[]): number` that branches on `shape` and computes circle/rectangle/triangle areas using `Math.PI`. Throws an `Error` for unknown shapes. Calls it once per shape and logs each result.',
    java:
      'An `AreaCalculator` class with a varargs `calculateArea(String shape, double... dimensions)` method that dispatches on `shape` and uses `Math.PI` for the circle case. `main` calls it for circle/rectangle/triangle and prints each result to two decimal places.',
    cpp:
      'A `calculateArea(string, vector<double>)` function that branches on `shape` and computes the matching geometric formula (using `M_PI` for the circle). `main` calls each variant with sample dimensions and prints the result via `cout`.',
    csharp:
      'An `AreaCalculator` class with a `CalculateArea(string shape, params double[] dimensions)` method that switches on the shape and computes the area using `Math.PI` for the circle. `Main` calls it for each shape and prints the formatted result.',
    go:
      'A `calculateArea(shape string, dimensions ...float64) (float64, error)` function that returns both an area and an error — Go\'s idiomatic way of signalling unknown shapes. `main` calls it for each shape, checks the error, and prints each result with `fmt.Printf`.',
    rust:
      'A `calculate_area(shape: &str, dimensions: &[f64]) -> Result<f64, String>` that dispatches on `shape` and uses `PI` from `std::f64::consts`. Returning a `Result` makes the failure case explicit. `main` calls it once per shape and prints each result via `match`.',
  },

  classObj: {
    python:
      'Defines an `Animal` base class with a `speak()` method, and a `Dog(Animal)` subclass that overrides `speak()` and adds `fetch()`. Uses `super().__init__()` to chain to the parent constructor. Creates one `Animal` and one `Dog`, then calls their methods to demonstrate inheritance and method overriding.',
    javascript:
      'Defines an `Animal` class with `name`/`sound` fields and a `speak()` method, and a `Dog extends Animal` subclass that calls `super(name, "Woof")` and adds a `fetch()` method. Constructs one of each and exercises the inherited and overridden behaviour.',
    typescript:
      'A typed `Animal` class with `name`/`sound` properties and a `speak()` method, and `Dog extends Animal` that chains `super(name, "Woof")` and adds `fetch()`. Instantiates one of each and exercises inherited and overridden behaviour.',
    java:
      'An `Animal` base class with protected `name`/`sound` and a `speak()` method, plus a `Dog extends Animal` subclass that chains `super(name, "Woof")` and adds `fetch()`. `main` instantiates one of each and exercises both classes to show inheritance.',
    cpp:
      'An `Animal` base class with protected `name`/`sound` and a virtual `speak()` method, plus a `Dog : public Animal` subclass that calls `Animal(name, "Woof")` in its initializer list and adds `fetch()`. `main` exercises both objects.',
    csharp:
      'An `Animal` base class with protected fields and a virtual `Speak()` method, plus a `Dog : Animal` subclass that chains `: base(name, "Woof")` and adds `Fetch()`. `Main` instantiates one of each and calls their methods to demonstrate inheritance.',
    go:
      'Uses Go\'s embedded-struct style of "inheritance": an `Animal` struct with a `Speak()` method, and a `Dog` struct that embeds `Animal` and adds `Fetch()`. `main` builds one of each and calls their methods — embedding lets `Dog` call `Speak` without redefining it.',
    rust:
      'Defines an `Animal` trait with a `speak` method and two structs (`Cat`, `Dog`) that implement it. `Dog` also has an inherent `fetch` method. `main` creates one of each and calls the trait method on both, showing Rust\'s trait-based polymorphism.',
  },

  file: {
    python:
      'Reads `input.txt` line-by-line with `open(input_path, "r")`, uppercases each line, and writes the result to `output_path`. Wraps the I/O in a `try`/`except` so missing files or permission errors are reported instead of crashing.',
    javascript:
      'Uses Node\'s `fs` module to read `input.txt` synchronously, splits it into lines, uppercases each one, and writes the result to `output.txt` — all inside a `try`/`catch` so file errors are surfaced gracefully.',
    typescript:
      'Typed version of the Node example: imports `fs` for synchronous file I/O, reads the input file, splits it into a `string[]`, uppercases each line, and writes the result back out. Errors are caught and logged.',
    java:
      'Uses `java.io.BufferedReader` and `BufferedWriter` inside try-with-resources blocks to read each line of `input.txt`, uppercase it, and write the result to `output.txt`. `IOException`s are caught and reported.',
    cpp:
      'Opens `input.txt` with an `ifstream` and `output.txt` with an `ofstream`, reads each line with `getline`, uppercases it using `std::transform` + `::toupper`, and writes the result to the output stream.',
    csharp:
      'Uses `File.ReadAllLines` to read every line of `input.txt`, calls `.ToUpper()` on each, and writes the array back out with `File.WriteAllLines("output.txt", …)`. Wraps everything in a `try`/`catch` for `IOException`s.',
    go:
      'Reads `input.txt` with `os.Open`, scans it line-by-line via `bufio.Scanner`, uppercases each line with `strings.ToUpper`, and writes the joined result to `output.txt` with `os.WriteFile`. Uses Go\'s idiomatic `err != nil` checks throughout.',
    rust:
      'Reads `input.txt` with `fs::read_to_string`, uppercases each line with `to_uppercase()`, joins them with newlines, and writes the result to `output.txt` via `fs::write`. Returns `io::Result<()>` so errors propagate cleanly with the `?` operator.',
  },

  array: {
    python:
      'Operates on the list `numbers = [5, 3, 8, 1, 9, 2, 7, 4, 6]` to compute `max`, `min`, `sum`, and average; then sorts a copy with `sorted(...)`, filters with a list comprehension (`x for x in numbers if x > 4`), and maps each value to its square. Each result is printed.',
    javascript:
      'Operates on the array `[5, 3, 8, 1, 9, 2, 7, 4, 6]` using `Math.max(...numbers)`, `Math.min(...numbers)`, and `reduce` to compute totals and averages. Demonstrates `slice().sort()`, `filter(x => x > 4)`, and `map(x => x * x)`. Logs each result.',
    typescript:
      'Typed version operating on `numbers: number[] = [5, 3, 8, 1, 9, 2, 7, 4, 6]` — uses `Math.max(...)`, `Math.min(...)`, and `reduce` for sum/avg, then `slice().sort()`, `filter(x => x > 4)`, and `map(x => x * x)`. Each result is logged.',
    java:
      'Operates on `int[] {5, 3, 8, 1, 9, 2, 7, 4, 6}` using `Arrays.stream(...)` to compute `max`, `min`, `sum`, and average. Sorts a clone, filters with `.filter(x -> x > 4)`, and maps with `.map(x -> x * x)`. Prints each result.',
    cpp:
      'Operates on `vector<int>{5, 3, 8, 1, 9, 2, 7, 4, 6}` using STL algorithms — `*max_element`, `*min_element`, `accumulate` for the sum, plus `std::sort` on a copy, `std::copy_if` for filtering, and `std::transform` for the square map. Each result is printed.',
    csharp:
      'Operates on `int[] {5, 3, 8, 1, 9, 2, 7, 4, 6}` with LINQ: `.Max()`, `.Min()`, `.Sum()`, and `.Average()`. Demonstrates `.OrderBy(x => x)`, `.Where(x => x > 4)`, and `.Select(x => x * x)`. Each result is joined and printed.',
    go:
      'Operates on `[]int{5, 3, 8, 1, 9, 2, 7, 4, 6}` — iterates manually to find max/min/sum/average (Go has no built-in `max` for slices). Then uses `sort.Slice`, a manual filter loop, and a manual map loop. Each result is printed with `fmt.Println`.',
    rust:
      'Operates on `vec![5, 3, 8, 1, 9, 2, 7, 4, 6]` using iterator combinators: `.iter().max()`, `.min()`, `.sum::<i32>()`, plus a sorted clone, `.filter(|&&x| x > 4)`, and `.map(|x| x * x)`. Each result is printed.',
  },

  api: {
    python:
      'Uses the `requests` library to GET users from a sample API and POST a new user. Both requests are wrapped in `try`/`except` so HTTP errors are reported. Calls `r.raise_for_status()` to convert HTTP 4xx/5xx into exceptions.',
    javascript:
      'Async `fetchUsers` and `createUser` functions use the global `fetch` API to call the users endpoint. Wrapped in `try`/`catch`; the response is checked with `response.ok` before parsing JSON. `main` awaits both calls and logs the results.',
    typescript:
      'Typed version of the JS example: defines `interface User`, then async `fetchUsers(url: string): Promise<User[]>` and `createUser(...): Promise<User>` using global `fetch`. The response is checked with `response.ok` and parsed as the right type. `main` awaits both and logs results.',
    java:
      'Uses `java.net.http.HttpClient` to build synchronous GET and POST requests. JSON bodies are constructed manually for POST. The response body is read with `BodyHandlers.ofString()`. Wrapped in `try`/`catch` for `IOException`/`InterruptedException`.',
    cpp:
      'A stubbed example noting that real HTTP in C++ requires `libcurl`. Shows the shape of a GET and POST workflow with placeholder calls so the structure is clear. `main` documents what the real calls would do.',
    csharp:
      'Uses `HttpClient` with `await client.GetAsync` and `PostAsync` to call the users API. JSON is built manually. Responses are checked with `EnsureSuccessStatusCode`. `Main` is `async` and `await`s both calls.',
    go:
      'Uses `net/http` for the GET and a `bytes.NewBuffer` + `http.Post` for the POST. JSON is built manually. Response bodies are read with `io.ReadAll` and closed via `defer resp.Body.Close()`. Errors are checked at every step.',
    rust:
      'Uses the `reqwest` crate\'s blocking client to perform GET and POST requests. JSON bodies are sent via `.json(&serde_json::json!({...}))`. Returns `Result` so errors propagate via the `?` operator. `main` calls both and prints each response.',
  },

  math: {
    python:
      'Three classic math routines: recursive `factorial(n)`, iterative `fibonacci(n)` returning a list, and `compute_stats(numbers)` which uses Python\'s `statistics` module for mean/median/stdev. Runs `factorial(5)`, `fibonacci(10)`, and `compute_stats([2, 4, 4, 4, 5, 5, 7, 9])`, printing each result.',
    javascript:
      'Three classic routines: recursive `factorial(n)`, iterative `fibonacci(n)` returning an array, and `computeStats(numbers)` which manually computes mean, median, and standard deviation. Runs each on sample inputs (`5`, `10`, and `[2, 4, 4, 4, 5, 5, 7, 9]`) and logs the results.',
    typescript:
      'Typed versions of three math routines: recursive `factorial(n: number): number`, iterative `fibonacci(n: number): number[]`, and `computeStats(numbers: number[]): Stats` (a small interface). `main` exercises each on sample inputs and logs the results.',
    java:
      'Three math routines in a single class: recursive `factorial(int)`, iterative `fibonacci(int)` returning a `List<Long>`, and `computeStats(double[])` which returns mean/median/stdDev via a small inner `Stats` helper class. `main` runs each on sample inputs and prints the results.',
    cpp:
      'Three math routines: recursive `factorial(long long)`, iterative `fibonacci(int)` returning a `vector<long long>`, and `computeStats(vector<double>&)` which computes mean, median, and standard deviation using `<algorithm>` and `<cmath>`. `main` exercises each.',
    csharp:
      'Three math routines: recursive `Factorial(int)`, iterative `Fibonacci(int)` returning `List<long>`, and `ComputeStats(double[])` which returns a tuple `(mean, median, stdDev)` computed with LINQ. `Main` runs each on sample inputs and prints the results.',
    go:
      'Three math routines: recursive `factorial(int)`, iterative `fibonacci(int)` returning `[]int64`, and `computeStats([]float64)` returning `(mean, median, stdDev)` computed with `sort.Float64s` and `math.Sqrt`. `main` runs each on sample inputs and prints the results.',
    rust:
      'Three math routines: recursive `factorial(u64)`, iterative `fibonacci(u32)` returning `Vec<u64>`, and `compute_stats(&[f64])` returning a tuple `(mean, median, std_dev)` computed with iterators and `f64::sqrt`. `main` exercises each.',
  },

  fizzbuzz: {
    python:
      'Implements the classic FizzBuzz: for each integer from 1 to `limit`, prints `"FizzBuzz"` when divisible by 15, `"Fizz"` when divisible by 3, `"Buzz"` when divisible by 5, otherwise the number itself. Runs `fizzbuzz(20)`.',
    javascript:
      'Implements FizzBuzz: loops `i` from 1 to `limit`, logging `"FizzBuzz"` for multiples of 15, `"Fizz"` for multiples of 3, `"Buzz"` for multiples of 5, and the number otherwise. Runs `fizzbuzz(20)`.',
    typescript:
      'Typed `fizzbuzz(limit: number): void` that prints `"FizzBuzz"`/`"Fizz"`/`"Buzz"`/the number for each `i` from 1 to `limit`. The type annotation makes the input contract explicit. Runs `fizzbuzz(20)`.',
    java:
      'A `FizzBuzz` class whose static `fizzbuzz(int limit)` prints the classic output for each `i` from 1 to `limit`. `main` calls `fizzbuzz(20)` to demonstrate.',
    cpp:
      'A `fizzbuzz(int)` function that loops `i` from 1 to `limit` and writes `"FizzBuzz"`/`"Fizz"`/`"Buzz"`/the number to `cout`. `main` calls `fizzbuzz(20)`.',
    c:
      'A `fizzbuzz(int)` function in C that loops `i` from 1 to `limit` and prints `"FizzBuzz"`/`"Fizz"`/`"Buzz"`/the number with `printf`. `main` calls `fizzbuzz(20)` and returns `0`.',
    csharp:
      'A `FizzBuzz` class whose static `Fizzbuzz(int)` loops `i` from 1 to `limit` and writes the appropriate string via `Console.WriteLine`. `Main` calls `Fizzbuzz(20)`.',
    go:
      'A `fizzbuzz(limit int)` function that loops `i` from 1 to `limit` and prints the appropriate string with `fmt.Println`. `main` calls `fizzbuzz(20)`.',
    rust:
      'A `fizzbuzz(limit: u32)` function that loops `i` from 1 to `limit` (inclusive via `..=`) and prints the appropriate string with `println!`. `main` calls `fizzbuzz(20)`.',
  },

  palindrome: {
    python:
      'Defines `is_palindrome(text)` which strips non-alphanumerics with `re.sub`, lowercases the result, and compares it to its reverse (`cleaned == cleaned[::-1]`). Tests it on sample phrases like `"A man, a plan, a canal: Panama"` and prints whether each is a palindrome.',
    javascript:
      'Defines `isPalindrome(text)` which strips non-alphanumerics with `replace(/[^a-z0-9]/gi, \'\')`, lowercases the result, and compares it with its reverse (`split(\'\').reverse().join(\'\')`). Runs the check against several sample phrases and logs the results.',
    typescript:
      'Typed `isPalindrome(text: string): boolean` that normalises the input (lowercases + strips non-alphanumerics) and compares it to its reverse. Tests several sample phrases including `"A man, a plan, a canal: Panama"` and logs each verdict.',
    java:
      'A `PalindromeCheck` class whose static `isPalindrome(String)` cleans the input with `replaceAll("[^a-zA-Z0-9]", "").toLowerCase()` and compares it to its reverse via `StringBuilder.reverse().toString()`. `main` checks several sample phrases.',
    cpp:
      'An `isPalindrome(const string&)` function that copies the string, removes non-alphanumerics with `remove_if` + `erase`, lowercases via `transform`, and checks `cleaned == string(cleaned.rbegin(), cleaned.rend())`. `main` tests several samples.',
    c:
      'An `isPalindrome(const char*)` function that walks the C string with two indices (left/right), skipping non-alphanumerics and comparing characters case-insensitively. `main` calls it on a couple of sample strings and prints each verdict with `printf`.',
    csharp:
      'A class whose `IsPalindrome(string)` cleans the input with a `Regex` replace, lowercases the result, and compares it to its reverse (`new string(cleaned.Reverse().ToArray())`). `Main` tests it against several samples and prints the verdicts.',
    go:
      'An `isPalindrome(text string)` function that converts the input to a `[]rune`, walks two pointers from each end, and skips non-alphanumerics while comparing characters case-insensitively. `main` runs it on a few sample strings and prints each verdict.',
    rust:
      'An `is_palindrome(text: &str)` function that filters non-alphanumerics, lowercases each char with `to_ascii_lowercase`, and compares the iterator with its reverse. `main` checks several sample strings and prints each verdict.',
  },

  prime: {
    python:
      'Defines `is_prime(n)` (trial division up to `isqrt(n)`) and `primes_up_to(limit)` which collects all primes via list comprehension. Demonstrates both: prints whether `17` is prime, then prints all primes up to 50.',
    javascript:
      'Defines `isPrime(n)` (trial division up to `√n`) and `primesUpTo(limit)` which collects all primes into an array. Prints whether `17` is prime, then logs all primes up to 50.',
    typescript:
      'Typed `isPrime(n: number): boolean` (trial division up to `√n`) and `primesUpTo(limit: number): number[]`. Demonstrates both with sample inputs and logs the results.',
    java:
      'A class with static `isPrime(int)` (trial division up to `√n`) and `primesUpTo(int)` returning `List<Integer>`. `main` prints whether `17` is prime, then prints all primes up to 50.',
    cpp:
      'An `isPrime(int)` (trial division up to `√n`) and `primesUpTo(int)` returning `vector<int>`. `main` prints whether `17` is prime and lists all primes up to 50.',
    c:
      'An `isPrime(int)` (trial division up to `√n`) and `printPrimesUpTo(int)` that prints each prime as it finds it. `main` checks `17` and prints all primes up to 50.',
    csharp:
      'A class with static `IsPrime(int)` (trial division up to `√n`) and `PrimesUpTo(int)` returning `List<int>`. `Main` prints whether `17` is prime, then lists all primes up to 50.',
    go:
      'An `isPrime(int)` (trial division up to `√n`) and `primesUpTo(int)` returning `[]int`. `main` prints whether `17` is prime, then prints all primes up to 50.',
    rust:
      'An `is_prime(u32)` (trial division up to `√n`) and `primes_up_to(u32) -> Vec<u32>` using `filter`. `main` prints whether `17` is prime and prints all primes up to 50 with the `{:?}` formatter.',
  },

  reverse: {
    python:
      'Defines `reverse(text)` which returns `text[::-1]` — Python\'s slice-step reversal idiom. Demonstrates it on `"hello world"` and prints the reversed result.',
    javascript:
      'Defines `reverse(text)` which splits the string into characters, reverses the array, and joins back — the canonical JS string-reverse pattern. Demonstrates it on `"hello world"` and logs the result.',
    typescript:
      'Typed `reverse(text: string): string` that splits, reverses, and joins. Demonstrates it on `"hello world"` and logs the result.',
    java:
      'A `ReverseString` class whose static `reverse(String)` uses `new StringBuilder(text).reverse().toString()`. `main` reverses `"hello world"` and prints the result.',
    cpp:
      'A `reverse(const string&)` function that constructs a new string from the input\'s reverse iterators (`string(text.rbegin(), text.rend())`). `main` reverses `"hello world"` and prints the result.',
    c:
      'A `reverse(const char*, char*)` function that copies the input into the output buffer back-to-front. `main` calls it on `"hello world"`, then prints the reversed buffer.',
    csharp:
      'A class whose static `Reverse(string)` calls `new string(text.Reverse().ToArray())` (LINQ-style). `Main` reverses `"hello world"` and writes the result.',
    go:
      'A `reverse(text string)` function that converts to `[]rune` and swaps elements pair-wise from both ends — Unicode-safe in contrast to byte-level reversal. `main` reverses `"hello world"` and prints the result.',
    rust:
      'A `reverse(text: &str) -> String` that uses `text.chars().rev().collect()` — character-iterator reversal is Unicode-safe. `main` reverses `"hello world"` and prints the result.',
  },

  count: {
    python:
      'Defines `count_words(text)` that lowercases, splits on whitespace, and uses `collections.Counter` to tally word frequencies. Demonstrates it on a sample paragraph and prints the most common five words with their counts.',
    javascript:
      'Defines `countWords(text)` that lowercases, splits on `/\\s+/`, and tallies frequencies into an object. Sorts the entries by count and logs the top five word/count pairs.',
    typescript:
      'Typed `countWords(text: string): Map<string, number>` that lowercases the input, splits on whitespace, and accumulates counts in a `Map`. The top five entries are then printed sorted by frequency.',
    java:
      'A class whose static `countWords(String)` lowercases, splits on `\\s+`, and accumulates a `HashMap<String, Integer>`. `main` sorts the entries by descending count and prints the top five.',
    cpp:
      'A `countWords(const string&)` function that streams whitespace-separated tokens into an `unordered_map<string, int>`. `main` copies the map into a vector, sorts by count descending, and prints the top five.',
    c:
      'A `countWords` routine that tokenises the input with `strtok`, stores each unique word in an array, and bumps its count. `main` sorts the array by count and prints the top five words.',
    csharp:
      'A class whose static `CountWords(string)` lowercases, splits on whitespace, and uses LINQ `.GroupBy(w => w).ToDictionary(...)` to build a frequency table. `Main` orders by descending count and prints the top five.',
    go:
      'A `countWords(string) map[string]int` that lowercases the input, splits via `strings.Fields`, and increments per-word counts in a `map`. `main` sorts the entries by descending count and prints the top five.',
    rust:
      'A `count_words(text: &str) -> HashMap<String, u32>` that lowercases the input, splits on whitespace, and tallies into a `HashMap`. `main` sorts the entries by descending count and prints the top five.',
  },
};

// Convenience getter — returns the bespoke summary if one exists,
// otherwise null so the caller can fall back to the heuristic.
export function getTemplateSummary(templateName, language) {
  return TEMPLATE_SUMMARIES[templateName]?.[language] || null;
}
