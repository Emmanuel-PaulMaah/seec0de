const TEMPLATES = {
  hello: {
    match: /\b(hello\s*world|print|display|output|say\s*hello|greet)\b/i,
    pseudocode: `PROGRAM HelloWorld
  SET message TO "Hello, World!"
  DISPLAY message
  
  FUNCTION greet(name)
    SET greeting TO "Hello, " + name + "!"
    DISPLAY greeting
    RETURN greeting
  END FUNCTION
  
  CALL greet("User")
END PROGRAM`,
    code: {
      python: `def greet(name):
    greeting = f"Hello, {name}!"
    print(greeting)
    return greeting

def main():
    message = "Hello, World!"
    print(message)
    greet("User")

if __name__ == "__main__":
    main()`,
      javascript: `function greet(name) {
  const greeting = \`Hello, \${name}!\`;
  console.log(greeting);
  return greeting;
}

function main() {
  const message = "Hello, World!";
  console.log(message);
  greet("User");
}

main();`,
      java: `public class HelloWorld {
    public static String greet(String name) {
        String greeting = "Hello, " + name + "!";
        System.out.println(greeting);
        return greeting;
    }

    public static void main(String[] args) {
        String message = "Hello, World!";
        System.out.println(message);
        greet("User");
    }
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

string greet(const string& name) {
    string greeting = "Hello, " + name + "!";
    cout << greeting << endl;
    return greeting;
}

int main() {
    string message = "Hello, World!";
    cout << message << endl;
    greet("User");
    return 0;
}`,
      csharp: `using System;

class Program {
    static string Greet(string name) {
        string greeting = $"Hello, {name}!";
        Console.WriteLine(greeting);
        return greeting;
    }

    static void Main(string[] args) {
        string message = "Hello, World!";
        Console.WriteLine(message);
        Greet("User");
    }
}`,
      go: `package main

import "fmt"

func greet(name string) string {
    greeting := fmt.Sprintf("Hello, %s!", name)
    fmt.Println(greeting)
    return greeting
}

func main() {
    message := "Hello, World!"
    fmt.Println(message)
    greet("User")
}`,
      rust: `fn greet(name: &str) -> String {
    let greeting = format!("Hello, {}!", name);
    println!("{}", greeting);
    greeting
}

fn main() {
    let message = "Hello, World!";
    println!("{}", message);
    greet("User");
}`,
      typescript: `function greet(name: string): string {
  const greeting = \`Hello, \${name}!\`;
  console.log(greeting);
  return greeting;
}

function main(): void {
  const message: string = "Hello, World!";
  console.log(message);
  greet("User");
}

main();`,
    },
  },

  sort: {
    match: /\b(sort|sorting|order|arrange|rank)\b/i,
    pseudocode: `FUNCTION bubbleSort(array)
  SET n TO LENGTH of array
  FOR i FROM 0 TO n - 1
    FOR j FROM 0 TO n - i - 2
      IF array[j] > array[j + 1] THEN
        SWAP array[j] AND array[j + 1]
      END IF
    END FOR
  END FOR
  RETURN array
END FUNCTION

SET numbers TO [64, 34, 25, 12, 22, 11, 90]
CALL bubbleSort(numbers)
DISPLAY numbers`,
    code: {
      python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = bubble_sort(numbers)
print(f"Sorted: {sorted_numbers}")`,
      javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}

const numbers = [64, 34, 25, 12, 22, 11, 90];
const sorted = bubbleSort(numbers);
console.log("Sorted:", sorted);`,
      java: `import java.util.Arrays;

public class BubbleSort {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] numbers = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(numbers);
        System.out.println("Sorted: " + Arrays.toString(numbers));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int main() {
    vector<int> numbers = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(numbers);
    cout << "Sorted: ";
    for (int num : numbers) cout << num << " ";
    cout << endl;
    return 0;
}`,
      csharp: `using System;

class BubbleSort {
    static void Sort(int[] arr) {
        int n = arr.Length;
        for (int i = 0; i < n; i++) {
            bool swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    static void Main(string[] args) {
        int[] numbers = {64, 34, 25, 12, 22, 11, 90};
        Sort(numbers);
        Console.WriteLine("Sorted: " + string.Join(", ", numbers));
    }
}`,
      go: `package main

import "fmt"

func bubbleSort(arr []int) {
    n := len(arr)
    for i := 0; i < n; i++ {
        swapped := false
        for j := 0; j < n-i-1; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
                swapped = true
            }
        }
        if !swapped {
            break
        }
    }
}

func main() {
    numbers := []int{64, 34, 25, 12, 22, 11, 90}
    bubbleSort(numbers)
    fmt.Println("Sorted:", numbers)
}`,
      rust: `fn bubble_sort(arr: &mut Vec<i32>) {
    let n = arr.len();
    for i in 0..n {
        let mut swapped = false;
        for j in 0..n - i - 1 {
            if arr[j] > arr[j + 1] {
                arr.swap(j, j + 1);
                swapped = true;
            }
        }
        if !swapped {
            break;
        }
    }
}

fn main() {
    let mut numbers = vec![64, 34, 25, 12, 22, 11, 90];
    bubble_sort(&mut numbers);
    println!("Sorted: {:?}", numbers);
}`,
      typescript: `function bubbleSort(arr: number[]): number[] {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}

const numbers: number[] = [64, 34, 25, 12, 22, 11, 90];
const sorted = bubbleSort(numbers);
console.log("Sorted:", sorted);`,
    },
  },

  loop: {
    match: /\b(loop|iterate|repeat|for\s*each|cycle|traverse)\b/i,
    pseudocode: `PROGRAM Loops
  SET items TO ["apple", "banana", "cherry", "date"]
  
  // Count-based loop
  FOR i FROM 0 TO 9
    DISPLAY "Count: " + i
  END FOR
  
  // Collection-based loop
  FOR EACH item IN items
    DISPLAY "Fruit: " + item
  END FOR
  
  // Conditional loop
  SET count TO 5
  WHILE count > 0
    DISPLAY "Countdown: " + count
    SET count TO count - 1
  END WHILE
  
  DISPLAY "Done!"
END PROGRAM`,
    code: {
      python: `items = ["apple", "banana", "cherry", "date"]

# Count-based loop
for i in range(10):
    print(f"Count: {i}")

# Collection-based loop
for item in items:
    print(f"Fruit: {item}")

# Loop with index
for index, item in enumerate(items):
    print(f"{index}: {item}")

# While loop with countdown
count = 5
while count > 0:
    print(f"Countdown: {count}")
    count -= 1

print("Done!")`,
      javascript: `const items = ["apple", "banana", "cherry", "date"];

// Count-based loop
for (let i = 0; i < 10; i++) {
  console.log(\`Count: \${i}\`);
}

// Collection-based loop (for...of)
for (const item of items) {
  console.log(\`Fruit: \${item}\`);
}

// forEach with index
items.forEach((item, index) => {
  console.log(\`\${index}: \${item}\`);
});

// While loop
let count = 5;
while (count > 0) {
  console.log(\`Countdown: \${count}\`);
  count--;
}

console.log("Done!");`,
      java: `import java.util.List;
import java.util.Arrays;

public class Loops {
    public static void main(String[] args) {
        List<String> items = Arrays.asList("apple", "banana", "cherry", "date");

        // Count-based loop
        for (int i = 0; i < 10; i++) {
            System.out.println("Count: " + i);
        }

        // Enhanced for loop
        for (String item : items) {
            System.out.println("Fruit: " + item);
        }

        // While loop
        int count = 5;
        while (count > 0) {
            System.out.println("Countdown: " + count);
            count--;
        }

        System.out.println("Done!");
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    vector<string> items = {"apple", "banana", "cherry", "date"};

    // Count-based loop
    for (int i = 0; i < 10; i++) {
        cout << "Count: " << i << endl;
    }

    // Range-based for loop
    for (const auto& item : items) {
        cout << "Fruit: " << item << endl;
    }

    // While loop
    int count = 5;
    while (count > 0) {
        cout << "Countdown: " << count << endl;
        count--;
    }

    cout << "Done!" << endl;
    return 0;
}`,
      csharp: `using System;
using System.Collections.Generic;

class Loops {
    static void Main(string[] args) {
        var items = new List<string> {"apple", "banana", "cherry", "date"};

        // Count-based loop
        for (int i = 0; i < 10; i++) {
            Console.WriteLine($"Count: {i}");
        }

        // foreach loop
        foreach (var item in items) {
            Console.WriteLine($"Fruit: {item}");
        }

        // While loop
        int count = 5;
        while (count > 0) {
            Console.WriteLine($"Countdown: {count}");
            count--;
        }

        Console.WriteLine("Done!");
    }
}`,
      go: `package main

import "fmt"

func main() {
    items := []string{"apple", "banana", "cherry", "date"}

    // Count-based loop
    for i := 0; i < 10; i++ {
        fmt.Printf("Count: %d\\n", i)
    }

    // Range-based loop
    for index, item := range items {
        fmt.Printf("%d: Fruit: %s\\n", index, item)
    }

    // While-style loop
    count := 5
    for count > 0 {
        fmt.Printf("Countdown: %d\\n", count)
        count--
    }

    fmt.Println("Done!")
}`,
      rust: `fn main() {
    let items = vec!["apple", "banana", "cherry", "date"];

    // Count-based loop
    for i in 0..10 {
        println!("Count: {}", i);
    }

    // Iterator-based loop
    for (index, item) in items.iter().enumerate() {
        println!("{}: Fruit: {}", index, item);
    }

    // While loop
    let mut count = 5;
    while count > 0 {
        println!("Countdown: {}", count);
        count -= 1;
    }

    println!("Done!");
}`,
      typescript: `const items: string[] = ["apple", "banana", "cherry", "date"];

// Count-based loop
for (let i = 0; i < 10; i++) {
  console.log(\`Count: \${i}\`);
}

// for...of loop
for (const item of items) {
  console.log(\`Fruit: \${item}\`);
}

// forEach with index
items.forEach((item: string, index: number) => {
  console.log(\`\${index}: \${item}\`);
});

// While loop
let count: number = 5;
while (count > 0) {
  console.log(\`Countdown: \${count}\`);
  count--;
}

console.log("Done!");`,
    },
  },

  func: {
    match: /\b(function|method|define|procedure|subroutine|def)\b/i,
    pseudocode: `FUNCTION calculateArea(shape, dimensions)
  IF shape IS "circle" THEN
    SET radius TO dimensions[0]
    RETURN 3.14159 * radius * radius
  ELSE IF shape IS "rectangle" THEN
    SET width TO dimensions[0]
    SET height TO dimensions[1]
    RETURN width * height
  ELSE IF shape IS "triangle" THEN
    SET base TO dimensions[0]
    SET height TO dimensions[1]
    RETURN 0.5 * base * height
  ELSE
    RETURN 0
  END IF
END FUNCTION

DISPLAY calculateArea("circle", [5])
DISPLAY calculateArea("rectangle", [4, 6])
DISPLAY calculateArea("triangle", [3, 8])`,
    code: {
      python: `import math

def calculate_area(shape, *dimensions):
    if shape == "circle":
        radius = dimensions[0]
        return math.pi * radius ** 2
    elif shape == "rectangle":
        width, height = dimensions[0], dimensions[1]
        return width * height
    elif shape == "triangle":
        base, height = dimensions[0], dimensions[1]
        return 0.5 * base * height
    else:
        raise ValueError(f"Unknown shape: {shape}")

print(f"Circle area: {calculate_area('circle', 5):.2f}")
print(f"Rectangle area: {calculate_area('rectangle', 4, 6):.2f}")
print(f"Triangle area: {calculate_area('triangle', 3, 8):.2f}")`,
      javascript: `function calculateArea(shape, ...dimensions) {
  switch (shape) {
    case "circle": {
      const radius = dimensions[0];
      return Math.PI * radius ** 2;
    }
    case "rectangle": {
      const [width, height] = dimensions;
      return width * height;
    }
    case "triangle": {
      const [base, h] = dimensions;
      return 0.5 * base * h;
    }
    default:
      throw new Error(\`Unknown shape: \${shape}\`);
  }
}

console.log(\`Circle area: \${calculateArea("circle", 5).toFixed(2)}\`);
console.log(\`Rectangle area: \${calculateArea("rectangle", 4, 6).toFixed(2)}\`);
console.log(\`Triangle area: \${calculateArea("triangle", 3, 8).toFixed(2)}\`);`,
      java: `public class AreaCalculator {
    public static double calculateArea(String shape, double... dimensions) {
        switch (shape) {
            case "circle":
                double radius = dimensions[0];
                return Math.PI * radius * radius;
            case "rectangle":
                return dimensions[0] * dimensions[1];
            case "triangle":
                return 0.5 * dimensions[0] * dimensions[1];
            default:
                throw new IllegalArgumentException("Unknown shape: " + shape);
        }
    }

    public static void main(String[] args) {
        System.out.printf("Circle area: %.2f%n", calculateArea("circle", 5));
        System.out.printf("Rectangle area: %.2f%n", calculateArea("rectangle", 4, 6));
        System.out.printf("Triangle area: %.2f%n", calculateArea("triangle", 3, 8));
    }
}`,
      cpp: `#include <iostream>
#include <cmath>
#include <vector>
#include <stdexcept>
using namespace std;

double calculateArea(const string& shape, const vector<double>& dims) {
    if (shape == "circle") {
        return M_PI * dims[0] * dims[0];
    } else if (shape == "rectangle") {
        return dims[0] * dims[1];
    } else if (shape == "triangle") {
        return 0.5 * dims[0] * dims[1];
    } else {
        throw invalid_argument("Unknown shape: " + shape);
    }
}

int main() {
    cout << "Circle area: " << calculateArea("circle", {5}) << endl;
    cout << "Rectangle area: " << calculateArea("rectangle", {4, 6}) << endl;
    cout << "Triangle area: " << calculateArea("triangle", {3, 8}) << endl;
    return 0;
}`,
      csharp: `using System;

class AreaCalculator {
    static double CalculateArea(string shape, params double[] dimensions) {
        return shape switch {
            "circle" => Math.PI * dimensions[0] * dimensions[0],
            "rectangle" => dimensions[0] * dimensions[1],
            "triangle" => 0.5 * dimensions[0] * dimensions[1],
            _ => throw new ArgumentException($"Unknown shape: {shape}")
        };
    }

    static void Main(string[] args) {
        Console.WriteLine($"Circle area: {CalculateArea("circle", 5):F2}");
        Console.WriteLine($"Rectangle area: {CalculateArea("rectangle", 4, 6):F2}");
        Console.WriteLine($"Triangle area: {CalculateArea("triangle", 3, 8):F2}");
    }
}`,
      go: `package main

import (
    "fmt"
    "math"
)

func calculateArea(shape string, dimensions ...float64) (float64, error) {
    switch shape {
    case "circle":
        return math.Pi * dimensions[0] * dimensions[0], nil
    case "rectangle":
        return dimensions[0] * dimensions[1], nil
    case "triangle":
        return 0.5 * dimensions[0] * dimensions[1], nil
    default:
        return 0, fmt.Errorf("unknown shape: %s", shape)
    }
}

func main() {
    area, _ := calculateArea("circle", 5)
    fmt.Printf("Circle area: %.2f\\n", area)
    area, _ = calculateArea("rectangle", 4, 6)
    fmt.Printf("Rectangle area: %.2f\\n", area)
    area, _ = calculateArea("triangle", 3, 8)
    fmt.Printf("Triangle area: %.2f\\n", area)
}`,
      rust: `use std::f64::consts::PI;

fn calculate_area(shape: &str, dimensions: &[f64]) -> Result<f64, String> {
    match shape {
        "circle" => Ok(PI * dimensions[0] * dimensions[0]),
        "rectangle" => Ok(dimensions[0] * dimensions[1]),
        "triangle" => Ok(0.5 * dimensions[0] * dimensions[1]),
        _ => Err(format!("Unknown shape: {}", shape)),
    }
}

fn main() {
    println!("Circle area: {:.2}", calculate_area("circle", &[5.0]).unwrap());
    println!("Rectangle area: {:.2}", calculate_area("rectangle", &[4.0, 6.0]).unwrap());
    println!("Triangle area: {:.2}", calculate_area("triangle", &[3.0, 8.0]).unwrap());
}`,
      typescript: `function calculateArea(shape: string, ...dimensions: number[]): number {
  switch (shape) {
    case "circle": {
      const radius = dimensions[0];
      return Math.PI * radius ** 2;
    }
    case "rectangle":
      return dimensions[0] * dimensions[1];
    case "triangle":
      return 0.5 * dimensions[0] * dimensions[1];
    default:
      throw new Error(\`Unknown shape: \${shape}\`);
  }
}

console.log(\`Circle area: \${calculateArea("circle", 5).toFixed(2)}\`);
console.log(\`Rectangle area: \${calculateArea("rectangle", 4, 6).toFixed(2)}\`);
console.log(\`Triangle area: \${calculateArea("triangle", 3, 8).toFixed(2)}\`);`,
    },
  },

  classObj: {
    match: /\b(class|object|oop|inheritance|encapsulation)\b/i,
    pseudocode: `CLASS Animal
  PROPERTY name
  PROPERTY sound
  
  CONSTRUCTOR(name, sound)
    SET this.name TO name
    SET this.sound TO sound
  END CONSTRUCTOR
  
  METHOD speak()
    DISPLAY this.name + " says " + this.sound
  END METHOD
END CLASS

CLASS Dog EXTENDS Animal
  PROPERTY breed
  
  CONSTRUCTOR(name, breed)
    CALL SUPER("woof")
    SET this.breed TO breed
  END CONSTRUCTOR
  
  METHOD fetch(item)
    DISPLAY this.name + " fetches the " + item
  END METHOD
END CLASS

SET myDog TO NEW Dog("Rex", "Labrador")
CALL myDog.speak()
CALL myDog.fetch("ball")`,
    code: {
      python: `class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        print(f"{self.name} says {self.sound}")

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name, "woof")
        self.breed = breed

    def fetch(self, item):
        print(f"{self.name} fetches the {item}")

    def __str__(self):
        return f"{self.name} ({self.breed})"

my_dog = Dog("Rex", "Labrador")
my_dog.speak()
my_dog.fetch("ball")
print(my_dog)`,
      javascript: `class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }

  speak() {
    console.log(\`\${this.name} says \${this.sound}\`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name, "woof");
    this.breed = breed;
  }

  fetch(item) {
    console.log(\`\${this.name} fetches the \${item}\`);
  }

  toString() {
    return \`\${this.name} (\${this.breed})\`;
  }
}

const myDog = new Dog("Rex", "Labrador");
myDog.speak();
myDog.fetch("ball");
console.log(myDog.toString());`,
      java: `public class Animal {
    protected String name;
    protected String sound;

    public Animal(String name, String sound) {
        this.name = name;
        this.sound = sound;
    }

    public void speak() {
        System.out.println(name + " says " + sound);
    }
}

class Dog extends Animal {
    private String breed;

    public Dog(String name, String breed) {
        super(name, "woof");
        this.breed = breed;
    }

    public void fetch(String item) {
        System.out.println(name + " fetches the " + item);
    }

    @Override
    public String toString() {
        return name + " (" + breed + ")";
    }

    public static void main(String[] args) {
        Dog myDog = new Dog("Rex", "Labrador");
        myDog.speak();
        myDog.fetch("ball");
        System.out.println(myDog);
    }
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

class Animal {
protected:
    string name;
    string sound;
public:
    Animal(const string& name, const string& sound)
        : name(name), sound(sound) {}

    virtual void speak() const {
        cout << name << " says " << sound << endl;
    }

    virtual ~Animal() = default;
};

class Dog : public Animal {
    string breed;
public:
    Dog(const string& name, const string& breed)
        : Animal(name, "woof"), breed(breed) {}

    void fetch(const string& item) const {
        cout << name << " fetches the " << item << endl;
    }
};

int main() {
    Dog myDog("Rex", "Labrador");
    myDog.speak();
    myDog.fetch("ball");
    return 0;
}`,
      csharp: `using System;

class Animal {
    public string Name { get; }
    public string Sound { get; }

    public Animal(string name, string sound) {
        Name = name;
        Sound = sound;
    }

    public virtual void Speak() {
        Console.WriteLine($"{Name} says {Sound}");
    }
}

class Dog : Animal {
    public string Breed { get; }

    public Dog(string name, string breed) : base(name, "woof") {
        Breed = breed;
    }

    public void Fetch(string item) {
        Console.WriteLine($"{Name} fetches the {item}");
    }

    public override string ToString() => $"{Name} ({Breed})";

    static void Main(string[] args) {
        var myDog = new Dog("Rex", "Labrador");
        myDog.Speak();
        myDog.Fetch("ball");
        Console.WriteLine(myDog);
    }
}`,
      go: `package main

import "fmt"

type Animal struct {
    Name  string
    Sound string
}

func (a *Animal) Speak() {
    fmt.Printf("%s says %s\\n", a.Name, a.Sound)
}

type Dog struct {
    Animal
    Breed string
}

func NewDog(name, breed string) *Dog {
    return &Dog{
        Animal: Animal{Name: name, Sound: "woof"},
        Breed:  breed,
    }
}

func (d *Dog) Fetch(item string) {
    fmt.Printf("%s fetches the %s\\n", d.Name, item)
}

func main() {
    myDog := NewDog("Rex", "Labrador")
    myDog.Speak()
    myDog.Fetch("ball")
    fmt.Printf("%s (%s)\\n", myDog.Name, myDog.Breed)
}`,
      rust: `trait Animal {
    fn name(&self) -> &str;
    fn sound(&self) -> &str;

    fn speak(&self) {
        println!("{} says {}", self.name(), self.sound());
    }
}

struct Dog {
    name: String,
    breed: String,
}

impl Dog {
    fn new(name: &str, breed: &str) -> Self {
        Dog {
            name: name.to_string(),
            breed: breed.to_string(),
        }
    }

    fn fetch(&self, item: &str) {
        println!("{} fetches the {}", self.name, item);
    }
}

impl Animal for Dog {
    fn name(&self) -> &str { &self.name }
    fn sound(&self) -> &str { "woof" }
}

fn main() {
    let my_dog = Dog::new("Rex", "Labrador");
    my_dog.speak();
    my_dog.fetch("ball");
    println!("{} ({})", my_dog.name, my_dog.breed);
}`,
      typescript: `class Animal {
  constructor(
    public readonly name: string,
    public readonly sound: string
  ) {}

  speak(): void {
    console.log(\`\${this.name} says \${this.sound}\`);
  }
}

class Dog extends Animal {
  constructor(
    name: string,
    public readonly breed: string
  ) {
    super(name, "woof");
  }

  fetch(item: string): void {
    console.log(\`\${this.name} fetches the \${item}\`);
  }

  toString(): string {
    return \`\${this.name} (\${this.breed})\`;
  }
}

const myDog = new Dog("Rex", "Labrador");
myDog.speak();
myDog.fetch("ball");
console.log(myDog.toString());`,
    },
  },

  file: {
    match: /\b(read\s*file|open\s*file|file|write\s*file|save\s*file)\b/i,
    pseudocode: `PROGRAM FileOperations
  // Read a file
  SET content TO READ FILE "input.txt"
  DISPLAY "File contents: " + content
  
  // Process lines
  SET lines TO SPLIT content BY newline
  FOR EACH line IN lines
    IF line IS NOT EMPTY THEN
      DISPLAY "Line: " + line
    END IF
  END FOR
  
  // Write to a file
  SET output TO "Processed " + LENGTH(lines) + " lines"
  WRITE output TO FILE "output.txt"
  DISPLAY "File written successfully"
END PROGRAM`,
    code: {
      python: `def read_and_process_file(input_path, output_path):
    # Read the file
    with open(input_path, 'r') as f:
        content = f.read()
    print(f"File contents:\\n{content}")

    # Process lines
    lines = content.strip().split('\\n')
    non_empty = [line for line in lines if line.strip()]
    for i, line in enumerate(non_empty):
        print(f"Line {i + 1}: {line}")

    # Write results
    output = f"Processed {len(non_empty)} lines"
    with open(output_path, 'w') as f:
        f.write(output)
    print("File written successfully")

read_and_process_file("input.txt", "output.txt")`,
      javascript: `const fs = require('fs');

function readAndProcessFile(inputPath, outputPath) {
  // Read the file
  const content = fs.readFileSync(inputPath, 'utf-8');
  console.log(\`File contents:\\n\${content}\`);

  // Process lines
  const lines = content.split('\\n').filter(line => line.trim());
  lines.forEach((line, i) => {
    console.log(\`Line \${i + 1}: \${line}\`);
  });

  // Write results
  const output = \`Processed \${lines.length} lines\`;
  fs.writeFileSync(outputPath, output);
  console.log("File written successfully");
}

readAndProcessFile("input.txt", "output.txt");`,
      java: `import java.io.*;
import java.nio.file.*;
import java.util.List;
import java.util.stream.Collectors;

public class FileOperations {
    public static void main(String[] args) throws IOException {
        String inputPath = "input.txt";
        String outputPath = "output.txt";

        // Read the file
        String content = Files.readString(Path.of(inputPath));
        System.out.println("File contents:\\n" + content);

        // Process lines
        List<String> lines = content.lines()
            .filter(line -> !line.isBlank())
            .collect(Collectors.toList());
        for (int i = 0; i < lines.size(); i++) {
            System.out.printf("Line %d: %s%n", i + 1, lines.get(i));
        }

        // Write results
        String output = "Processed " + lines.size() + " lines";
        Files.writeString(Path.of(outputPath), output);
        System.out.println("File written successfully");
    }
}`,
      cpp: `#include <iostream>
#include <fstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    // Read the file
    ifstream inFile("input.txt");
    string content((istreambuf_iterator<char>(inFile)),
                     istreambuf_iterator<char>());
    inFile.close();
    cout << "File contents:" << endl << content << endl;

    // Process lines
    vector<string> lines;
    istringstream stream(content);
    string line;
    while (getline(stream, line)) {
        if (!line.empty()) {
            lines.push_back(line);
        }
    }
    for (size_t i = 0; i < lines.size(); i++) {
        cout << "Line " << i + 1 << ": " << lines[i] << endl;
    }

    // Write results
    ofstream outFile("output.txt");
    outFile << "Processed " << lines.size() << " lines";
    outFile.close();
    cout << "File written successfully" << endl;
    return 0;
}`,
      csharp: `using System;
using System.IO;
using System.Linq;

class FileOperations {
    static void Main(string[] args) {
        string inputPath = "input.txt";
        string outputPath = "output.txt";

        // Read the file
        string content = File.ReadAllText(inputPath);
        Console.WriteLine($"File contents:\\n{content}");

        // Process lines
        var lines = content.Split('\\n')
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();
        for (int i = 0; i < lines.Count; i++) {
            Console.WriteLine($"Line {i + 1}: {lines[i]}");
        }

        // Write results
        string output = $"Processed {lines.Count} lines";
        File.WriteAllText(outputPath, output);
        Console.WriteLine("File written successfully");
    }
}`,
      go: `package main

import (
    "fmt"
    "os"
    "strings"
)

func main() {
    inputPath := "input.txt"
    outputPath := "output.txt"

    // Read the file
    data, err := os.ReadFile(inputPath)
    if err != nil {
        fmt.Println("Error reading file:", err)
        return
    }
    content := string(data)
    fmt.Printf("File contents:\\n%s\\n", content)

    // Process lines
    allLines := strings.Split(content, "\\n")
    var lines []string
    for _, line := range allLines {
        if strings.TrimSpace(line) != "" {
            lines = append(lines, line)
        }
    }
    for i, line := range lines {
        fmt.Printf("Line %d: %s\\n", i+1, line)
    }

    // Write results
    output := fmt.Sprintf("Processed %d lines", len(lines))
    os.WriteFile(outputPath, []byte(output), 0644)
    fmt.Println("File written successfully")
}`,
      rust: `use std::fs;

fn main() {
    let input_path = "input.txt";
    let output_path = "output.txt";

    // Read the file
    let content = fs::read_to_string(input_path)
        .expect("Failed to read file");
    println!("File contents:\\n{}", content);

    // Process lines
    let lines: Vec<&str> = content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();
    for (i, line) in lines.iter().enumerate() {
        println!("Line {}: {}", i + 1, line);
    }

    // Write results
    let output = format!("Processed {} lines", lines.len());
    fs::write(output_path, output)
        .expect("Failed to write file");
    println!("File written successfully");
}`,
      typescript: `import * as fs from 'fs';

function readAndProcessFile(inputPath: string, outputPath: string): void {
  // Read the file
  const content: string = fs.readFileSync(inputPath, 'utf-8');
  console.log(\`File contents:\\n\${content}\`);

  // Process lines
  const lines: string[] = content
    .split('\\n')
    .filter((line: string) => line.trim().length > 0);
  lines.forEach((line: string, i: number) => {
    console.log(\`Line \${i + 1}: \${line}\`);
  });

  // Write results
  const output: string = \`Processed \${lines.length} lines\`;
  fs.writeFileSync(outputPath, output);
  console.log("File written successfully");
}

readAndProcessFile("input.txt", "output.txt");`,
    },
  },

  array: {
    match: /\b(array|list|collection|vector|set|map|dictionary|hash)\b/i,
    pseudocode: `PROGRAM ArrayOperations
  SET numbers TO [5, 3, 8, 1, 9, 2, 7, 4, 6]
  
  // Filter: keep only even numbers
  SET evens TO FILTER numbers WHERE number % 2 == 0
  DISPLAY "Evens: " + evens
  
  // Map: double each number
  SET doubled TO MAP numbers WITH number * 2
  DISPLAY "Doubled: " + doubled
  
  // Reduce: sum all numbers
  SET total TO REDUCE numbers WITH sum + number, START 0
  DISPLAY "Sum: " + total
  
  // Find: first number > 5
  SET found TO FIND FIRST IN numbers WHERE number > 5
  DISPLAY "First > 5: " + found
  
  SET average TO total / LENGTH(numbers)
  DISPLAY "Average: " + average
END PROGRAM`,
    code: {
      python: `numbers = [5, 3, 8, 1, 9, 2, 7, 4, 6]

# Filter: keep even numbers
evens = [n for n in numbers if n % 2 == 0]
print(f"Evens: {evens}")

# Map: double each number
doubled = [n * 2 for n in numbers]
print(f"Doubled: {doubled}")

# Reduce: sum all numbers
from functools import reduce
total = reduce(lambda acc, n: acc + n, numbers, 0)
print(f"Sum: {total}")

# Find: first number > 5
found = next((n for n in numbers if n > 5), None)
print(f"First > 5: {found}")

average = total / len(numbers)
print(f"Average: {average:.2f}")`,
      javascript: `const numbers = [5, 3, 8, 1, 9, 2, 7, 4, 6];

// Filter: keep even numbers
const evens = numbers.filter(n => n % 2 === 0);
console.log("Evens:", evens);

// Map: double each number
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Reduce: sum all numbers
const total = numbers.reduce((sum, n) => sum + n, 0);
console.log("Sum:", total);

// Find: first number > 5
const found = numbers.find(n => n > 5);
console.log("First > 5:", found);

const average = total / numbers.length;
console.log(\`Average: \${average.toFixed(2)}\`);`,
      java: `import java.util.*;
import java.util.stream.*;

public class ArrayOperations {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(5, 3, 8, 1, 9, 2, 7, 4, 6);

        // Filter: keep even numbers
        List<Integer> evens = numbers.stream()
            .filter(n -> n % 2 == 0)
            .collect(Collectors.toList());
        System.out.println("Evens: " + evens);

        // Map: double each number
        List<Integer> doubled = numbers.stream()
            .map(n -> n * 2)
            .collect(Collectors.toList());
        System.out.println("Doubled: " + doubled);

        // Reduce: sum all numbers
        int total = numbers.stream().reduce(0, Integer::sum);
        System.out.println("Sum: " + total);

        // Find: first number > 5
        Optional<Integer> found = numbers.stream()
            .filter(n -> n > 5)
            .findFirst();
        System.out.println("First > 5: " + found.orElse(null));

        double average = (double) total / numbers.size();
        System.out.printf("Average: %.2f%n", average);
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>
using namespace std;

int main() {
    vector<int> numbers = {5, 3, 8, 1, 9, 2, 7, 4, 6};

    // Filter: keep even numbers
    vector<int> evens;
    copy_if(numbers.begin(), numbers.end(), back_inserter(evens),
            [](int n) { return n % 2 == 0; });
    cout << "Evens: ";
    for (int n : evens) cout << n << " ";
    cout << endl;

    // Map: double each number
    vector<int> doubled(numbers.size());
    transform(numbers.begin(), numbers.end(), doubled.begin(),
              [](int n) { return n * 2; });
    cout << "Doubled: ";
    for (int n : doubled) cout << n << " ";
    cout << endl;

    // Reduce: sum
    int total = accumulate(numbers.begin(), numbers.end(), 0);
    cout << "Sum: " << total << endl;

    // Find: first > 5
    auto it = find_if(numbers.begin(), numbers.end(),
                      [](int n) { return n > 5; });
    if (it != numbers.end())
        cout << "First > 5: " << *it << endl;

    double average = (double)total / numbers.size();
    cout << "Average: " << average << endl;
    return 0;
}`,
      csharp: `using System;
using System.Linq;
using System.Collections.Generic;

class ArrayOperations {
    static void Main(string[] args) {
        var numbers = new List<int> {5, 3, 8, 1, 9, 2, 7, 4, 6};

        // Filter
        var evens = numbers.Where(n => n % 2 == 0).ToList();
        Console.WriteLine($"Evens: [{string.Join(", ", evens)}]");

        // Map
        var doubled = numbers.Select(n => n * 2).ToList();
        Console.WriteLine($"Doubled: [{string.Join(", ", doubled)}]");

        // Reduce
        int total = numbers.Aggregate(0, (sum, n) => sum + n);
        Console.WriteLine($"Sum: {total}");

        // Find
        int found = numbers.First(n => n > 5);
        Console.WriteLine($"First > 5: {found}");

        double average = (double)total / numbers.Count;
        Console.WriteLine($"Average: {average:F2}");
    }
}`,
      go: `package main

import "fmt"

func main() {
    numbers := []int{5, 3, 8, 1, 9, 2, 7, 4, 6}

    // Filter: even numbers
    var evens []int
    for _, n := range numbers {
        if n%2 == 0 {
            evens = append(evens, n)
        }
    }
    fmt.Println("Evens:", evens)

    // Map: double each
    doubled := make([]int, len(numbers))
    for i, n := range numbers {
        doubled[i] = n * 2
    }
    fmt.Println("Doubled:", doubled)

    // Reduce: sum
    total := 0
    for _, n := range numbers {
        total += n
    }
    fmt.Println("Sum:", total)

    // Find: first > 5
    for _, n := range numbers {
        if n > 5 {
            fmt.Println("First > 5:", n)
            break
        }
    }

    average := float64(total) / float64(len(numbers))
    fmt.Printf("Average: %.2f\\n", average)
}`,
      rust: `fn main() {
    let numbers = vec![5, 3, 8, 1, 9, 2, 7, 4, 6];

    // Filter: even numbers
    let evens: Vec<i32> = numbers.iter()
        .filter(|&&n| n % 2 == 0)
        .copied()
        .collect();
    println!("Evens: {:?}", evens);

    // Map: double each
    let doubled: Vec<i32> = numbers.iter()
        .map(|&n| n * 2)
        .collect();
    println!("Doubled: {:?}", doubled);

    // Reduce: sum
    let total: i32 = numbers.iter().sum();
    println!("Sum: {}", total);

    // Find: first > 5
    let found = numbers.iter().find(|&&n| n > 5);
    println!("First > 5: {:?}", found.unwrap());

    let average = total as f64 / numbers.len() as f64;
    println!("Average: {:.2}", average);
}`,
      typescript: `const numbers: number[] = [5, 3, 8, 1, 9, 2, 7, 4, 6];

// Filter: even numbers
const evens: number[] = numbers.filter((n) => n % 2 === 0);
console.log("Evens:", evens);

// Map: double each
const doubled: number[] = numbers.map((n) => n * 2);
console.log("Doubled:", doubled);

// Reduce: sum
const total: number = numbers.reduce((sum, n) => sum + n, 0);
console.log("Sum:", total);

// Find: first > 5
const found: number | undefined = numbers.find((n) => n > 5);
console.log("First > 5:", found);

const average: number = total / numbers.length;
console.log(\`Average: \${average.toFixed(2)}\`);`,
    },
  },

  api: {
    match: /\b(api|http|request|fetch|rest|endpoint|get\s*data|web\s*request)\b/i,
    pseudocode: `PROGRAM HttpRequest
  SET url TO "https://api.example.com/users"
  
  // GET request
  TRY
    SET response TO HTTP GET url
    SET users TO PARSE JSON FROM response
    FOR EACH user IN users
      DISPLAY user.name + " - " + user.email
    END FOR
  CATCH error
    DISPLAY "Error fetching data: " + error.message
  END TRY
  
  // POST request
  SET newUser TO {name: "Alice", email: "alice@example.com"}
  SET result TO HTTP POST url WITH BODY newUser
  DISPLAY "Created user: " + result.id
END PROGRAM`,
    code: {
      python: `import requests
import json

def fetch_users(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        users = response.json()
        for user in users:
            print(f"{user['name']} - {user['email']}")
        return users
    except requests.RequestException as e:
        print(f"Error fetching data: {e}")
        return []

def create_user(url, name, email):
    new_user = {"name": name, "email": email}
    response = requests.post(url, json=new_user)
    result = response.json()
    print(f"Created user: {result.get('id')}")
    return result

url = "https://api.example.com/users"
users = fetch_users(url)
create_user(url, "Alice", "alice@example.com")`,
      javascript: `async function fetchUsers(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    const users = await response.json();
    users.forEach(user => {
      console.log(\`\${user.name} - \${user.email}\`);
    });
    return users;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return [];
  }
}

async function createUser(url, name, email) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  const result = await response.json();
  console.log(\`Created user: \${result.id}\`);
  return result;
}

const url = "https://api.example.com/users";
fetchUsers(url);
createUser(url, "Alice", "alice@example.com");`,
      java: `import java.net.http.*;
import java.net.URI;

public class HttpExample {
    private static final HttpClient client = HttpClient.newHttpClient();

    public static String fetchUsers(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();
        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Users: " + response.body());
        return response.body();
    }

    public static String createUser(String url, String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Created: " + response.body());
        return response.body();
    }

    public static void main(String[] args) throws Exception {
        String url = "https://api.example.com/users";
        fetchUsers(url);
        createUser(url, "{\\"name\\":\\"Alice\\",\\"email\\":\\"alice@example.com\\"}");
    }
}`,
      cpp: `// Note: Requires libcurl
#include <iostream>
#include <string>
#include <curl/curl.h>
using namespace std;

size_t writeCallback(void* contents, size_t size, size_t nmemb, string* data) {
    data->append((char*)contents, size * nmemb);
    return size * nmemb;
}

string httpGet(const string& url) {
    CURL* curl = curl_easy_init();
    string response;
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK)
            cerr << "Error: " << curl_easy_strerror(res) << endl;
        curl_easy_cleanup(curl);
    }
    return response;
}

int main() {
    string url = "https://api.example.com/users";
    string data = httpGet(url);
    cout << "Response: " << data << endl;
    return 0;
}`,
      csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class HttpExample {
    private static readonly HttpClient client = new HttpClient();

    static async Task<string> FetchUsers(string url) {
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        string body = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Users: {body}");
        return body;
    }

    static async Task<string> CreateUser(string url, string name, string email) {
        var user = new { name, email };
        var json = JsonSerializer.Serialize(user);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content);
        string body = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Created: {body}");
        return body;
    }

    static async Task Main(string[] args) {
        string url = "https://api.example.com/users";
        await FetchUsers(url);
        await CreateUser(url, "Alice", "alice@example.com");
    }
}`,
      go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func fetchUsers(url string) (string, error) {
    resp, err := http.Get(url)
    if err != nil {
        return "", fmt.Errorf("error fetching: %w", err)
    }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    fmt.Println("Users:", string(body))
    return string(body), nil
}

func createUser(url, name, email string) (string, error) {
    user := map[string]string{"name": name, "email": email}
    jsonData, _ := json.Marshal(user)
    resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        return "", fmt.Errorf("error creating: %w", err)
    }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    fmt.Println("Created:", string(body))
    return string(body), nil
}

func main() {
    url := "https://api.example.com/users"
    fetchUsers(url)
    createUser(url, "Alice", "alice@example.com")
}`,
      rust: `use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    email: String,
}

async fn fetch_users(url: &str) -> Result<Vec<User>, reqwest::Error> {
    let users: Vec<User> = reqwest::get(url)
        .await?
        .json()
        .await?;
    for user in &users {
        println!("{} - {}", user.name, user.email);
    }
    Ok(users)
}

async fn create_user(url: &str, name: &str, email: &str) -> Result<String, reqwest::Error> {
    let user = User {
        name: name.to_string(),
        email: email.to_string(),
    };
    let client = reqwest::Client::new();
    let response = client.post(url)
        .json(&user)
        .send()
        .await?
        .text()
        .await?;
    println!("Created: {}", response);
    Ok(response)
}

#[tokio::main]
async fn main() {
    let url = "https://api.example.com/users";
    let _ = fetch_users(url).await;
    let _ = create_user(url, "Alice", "alice@example.com").await;
}`,
      typescript: `interface User {
  id?: number;
  name: string;
  email: string;
}

async function fetchUsers(url: string): Promise<User[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    const users: User[] = await response.json();
    users.forEach((user) => {
      console.log(\`\${user.name} - \${user.email}\`);
    });
    return users;
  } catch (error) {
    console.error("Error:", (error as Error).message);
    return [];
  }
}

async function createUser(url: string, name: string, email: string): Promise<User> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  const result: User = await response.json();
  console.log(\`Created user: \${result.id}\`);
  return result;
}

const url = "https://api.example.com/users";
fetchUsers(url);
createUser(url, "Alice", "alice@example.com");`,
    },
  },

  math: {
    match: /\b(calculate|math|sum|average|mean|median|factorial|fibonacci|compute)\b/i,
    pseudocode: `PROGRAM MathOperations
  FUNCTION factorial(n)
    IF n <= 1 THEN RETURN 1
    RETURN n * factorial(n - 1)
  END FUNCTION

  FUNCTION fibonacci(n)
    IF n <= 0 THEN RETURN 0
    IF n == 1 THEN RETURN 1
    SET a TO 0, b TO 1
    FOR i FROM 2 TO n
      SET temp TO a + b
      SET a TO b
      SET b TO temp
    END FOR
    RETURN b
  END FUNCTION

  FUNCTION statistics(numbers)
    SET sum TO SUM of numbers
    SET avg TO sum / LENGTH(numbers)
    SORT numbers
    SET median TO numbers[LENGTH/2]
    RETURN {sum, average: avg, median}
  END FUNCTION

  DISPLAY factorial(10)
  DISPLAY fibonacci(10)
  DISPLAY statistics([4, 7, 2, 9, 1, 5, 8, 3, 6])
END PROGRAM`,
    code: {
      python: `import statistics as stats

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    if n <= 0:
        return 0
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

def compute_stats(numbers):
    return {
        "sum": sum(numbers),
        "average": sum(numbers) / len(numbers),
        "median": stats.median(numbers),
        "min": min(numbers),
        "max": max(numbers),
    }

print(f"10! = {factorial(10)}")
print(f"Fib(10) = {fibonacci(10)}")
numbers = [4, 7, 2, 9, 1, 5, 8, 3, 6]
result = compute_stats(numbers)
for key, value in result.items():
    print(f"{key}: {value}")`,
      javascript: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function fibonacci(n) {
  if (n <= 0) return 0;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function computeStats(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((s, n) => s + n, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    sum,
    average: sum / numbers.length,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

console.log(\`10! = \${factorial(10)}\`);
console.log(\`Fib(10) = \${fibonacci(10)}\`);
const numbers = [4, 7, 2, 9, 1, 5, 8, 3, 6];
console.log("Stats:", computeStats(numbers));`,
      java: `import java.util.Arrays;

public class MathOperations {
    public static long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static long fibonacci(int n) {
        if (n <= 0) return 0;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            long temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }

    public static void computeStats(int[] numbers) {
        int[] sorted = numbers.clone();
        Arrays.sort(sorted);
        int sum = Arrays.stream(numbers).sum();
        double avg = (double) sum / numbers.length;
        double median = sorted.length % 2 == 1
            ? sorted[sorted.length / 2]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2.0;
        System.out.printf("Sum: %d, Avg: %.2f, Median: %.1f%n", sum, avg, median);
    }

    public static void main(String[] args) {
        System.out.println("10! = " + factorial(10));
        System.out.println("Fib(10) = " + fibonacci(10));
        computeStats(new int[]{4, 7, 2, 9, 1, 5, 8, 3, 6});
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

long long fibonacci(int n) {
    if (n <= 0) return 0;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

void computeStats(vector<int> numbers) {
    sort(numbers.begin(), numbers.end());
    int sum = accumulate(numbers.begin(), numbers.end(), 0);
    double avg = (double)sum / numbers.size();
    int mid = numbers.size() / 2;
    double median = numbers.size() % 2
        ? numbers[mid]
        : (numbers[mid - 1] + numbers[mid]) / 2.0;
    cout << "Sum: " << sum << ", Avg: " << avg << ", Median: " << median << endl;
}

int main() {
    cout << "10! = " << factorial(10) << endl;
    cout << "Fib(10) = " << fibonacci(10) << endl;
    computeStats({4, 7, 2, 9, 1, 5, 8, 3, 6});
    return 0;
}`,
      csharp: `using System;
using System.Linq;

class MathOperations {
    static long Factorial(int n) => n <= 1 ? 1 : n * Factorial(n - 1);

    static long Fibonacci(int n) {
        if (n <= 0) return 0;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            (a, b) = (b, a + b);
        }
        return b;
    }

    static void ComputeStats(int[] numbers) {
        var sorted = numbers.OrderBy(n => n).ToArray();
        int sum = numbers.Sum();
        double avg = numbers.Average();
        double median = sorted.Length % 2 == 1
            ? sorted[sorted.Length / 2]
            : (sorted[sorted.Length / 2 - 1] + sorted[sorted.Length / 2]) / 2.0;
        Console.WriteLine($"Sum: {sum}, Avg: {avg:F2}, Median: {median}");
    }

    static void Main(string[] args) {
        Console.WriteLine($"10! = {Factorial(10)}");
        Console.WriteLine($"Fib(10) = {Fibonacci(10)}");
        ComputeStats(new[] {4, 7, 2, 9, 1, 5, 8, 3, 6});
    }
}`,
      go: `package main

import (
    "fmt"
    "sort"
)

func factorial(n int) int64 {
    if n <= 1 {
        return 1
    }
    return int64(n) * factorial(n-1)
}

func fibonacci(n int) int64 {
    if n <= 0 {
        return 0
    }
    a, b := int64(0), int64(1)
    for i := 2; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}

func computeStats(numbers []int) {
    sorted := make([]int, len(numbers))
    copy(sorted, numbers)
    sort.Ints(sorted)
    sum := 0
    for _, n := range numbers {
        sum += n
    }
    avg := float64(sum) / float64(len(numbers))
    mid := len(sorted) / 2
    var median float64
    if len(sorted)%2 == 1 {
        median = float64(sorted[mid])
    } else {
        median = float64(sorted[mid-1]+sorted[mid]) / 2.0
    }
    fmt.Printf("Sum: %d, Avg: %.2f, Median: %.1f\\n", sum, avg, median)
}

func main() {
    fmt.Printf("10! = %d\\n", factorial(10))
    fmt.Printf("Fib(10) = %d\\n", fibonacci(10))
    computeStats([]int{4, 7, 2, 9, 1, 5, 8, 3, 6})
}`,
      rust: `fn factorial(n: u64) -> u64 {
    if n <= 1 { return 1; }
    n * factorial(n - 1)
}

fn fibonacci(n: u32) -> u64 {
    if n == 0 { return 0; }
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 2..=n {
        let temp = a + b;
        a = b;
        b = temp;
    }
    b
}

fn compute_stats(numbers: &[i32]) {
    let mut sorted = numbers.to_vec();
    sorted.sort();
    let sum: i32 = numbers.iter().sum();
    let avg = sum as f64 / numbers.len() as f64;
    let mid = sorted.len() / 2;
    let median = if sorted.len() % 2 == 1 {
        sorted[mid] as f64
    } else {
        (sorted[mid - 1] + sorted[mid]) as f64 / 2.0
    };
    println!("Sum: {}, Avg: {:.2}, Median: {:.1}", sum, avg, median);
}

fn main() {
    println!("10! = {}", factorial(10));
    println!("Fib(10) = {}", fibonacci(10));
    compute_stats(&[4, 7, 2, 9, 1, 5, 8, 3, 6]);
}`,
      typescript: `function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function fibonacci(n: number): number {
  if (n <= 0) return 0;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

interface Stats { sum: number; average: number; median: number; }

function computeStats(numbers: number[]): Stats {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((s, n) => s + n, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return { sum, average: sum / numbers.length, median };
}

console.log(\`10! = \${factorial(10)}\`);
console.log(\`Fib(10) = \${fibonacci(10)}\`);
console.log("Stats:", computeStats([4, 7, 2, 9, 1, 5, 8, 3, 6]));`,
    },
  },
};

export function generateCode(instruction, selectedLanguages) {
  const lower = instruction.toLowerCase();

  for (const template of Object.values(TEMPLATES)) {
    if (template.match.test(lower)) {
      const code = {};
      for (const lang of selectedLanguages) {
        code[lang] = template.code[lang] || `// ${instruction}\n// (Code for ${lang} not yet available)`;
      }
      return { pseudocode: template.pseudocode, code };
    }
  }

  // Default fallback
  const pseudocode = `PROGRAM CustomTask\n  // ${instruction}\n  \n  FUNCTION execute()\n    // TODO: Implement the logic for:\n    // "${instruction}"\n    DISPLAY "Task completed"\n  END FUNCTION\n  \n  CALL execute()\nEND PROGRAM`;

  const code = {};
  for (const lang of selectedLanguages) {
    code[lang] = getDefaultCode(lang, instruction);
  }
  return { pseudocode, code };
}

function getDefaultCode(lang, instruction) {
  const defaults = {
    python: `# ${instruction}\n\ndef execute():\n    """TODO: Implement the logic"""\n    print("Task completed")\n\nif __name__ == "__main__":\n    execute()`,
    javascript: `// ${instruction}\n\nfunction execute() {\n  // TODO: Implement the logic\n  console.log("Task completed");\n}\n\nexecute();`,
    java: `// ${instruction}\n\npublic class CustomTask {\n    public static void execute() {\n        // TODO: Implement the logic\n        System.out.println("Task completed");\n    }\n\n    public static void main(String[] args) {\n        execute();\n    }\n}`,
    cpp: `// ${instruction}\n#include <iostream>\nusing namespace std;\n\nvoid execute() {\n    // TODO: Implement the logic\n    cout << "Task completed" << endl;\n}\n\nint main() {\n    execute();\n    return 0;\n}`,
    csharp: `// ${instruction}\nusing System;\n\nclass CustomTask {\n    static void Execute() {\n        // TODO: Implement the logic\n        Console.WriteLine("Task completed");\n    }\n\n    static void Main(string[] args) {\n        Execute();\n    }\n}`,
    go: `// ${instruction}\npackage main\n\nimport "fmt"\n\nfunc execute() {\n    // TODO: Implement the logic\n    fmt.Println("Task completed")\n}\n\nfunc main() {\n    execute()\n}`,
    rust: `// ${instruction}\n\nfn execute() {\n    // TODO: Implement the logic\n    println!("Task completed");\n}\n\nfn main() {\n    execute();\n}`,
    typescript: `// ${instruction}\n\nfunction execute(): void {\n  // TODO: Implement the logic\n  console.log("Task completed");\n}\n\nexecute();`,
  };
  return defaults[lang] || `// ${instruction}\n// TODO: Implement`;
}
