/**
 * Java Learning Curriculum & Code Snippets Dataset
 * Designed specifically for Java learners to practice authentic syntax, idioms,
 * and key concepts while boosting muscle memory and typing speed.
 */

const JAVA_CATEGORIES = {
  all: { id: 'all', name: 'All Topics', icon: '☕' },
  basics: { id: 'basics', name: 'Basics & Flow', icon: '🌱' },
  oop: { id: 'oop', name: 'OOP & Classes', icon: '🏛️' },
  collections: { id: 'collections', name: 'Collections & Generics', icon: '📦' },
  methods_dsa: { id: 'methods_dsa', name: 'Methods & DSA', icon: '⚡' },
  exceptions: { id: 'exceptions', name: 'Exceptions & I/O', icon: '🛡️' },
  streams: { id: 'streams', name: 'Streams & Lambdas', icon: '🌊' },
  keywords: { id: 'keywords', name: 'Keywords Drill', icon: '🔑' },
  symbols: { id: 'symbols', name: 'Symbols & Operators', icon: '🔣' }
};

const JAVA_KEYWORDS = [
  'public', 'private', 'protected', 'static', 'final', 'void', 'class', 'interface',
  'extends', 'implements', 'abstract', 'int', 'boolean', 'double', 'float', 'char',
  'byte', 'short', 'long', 'import', 'package', 'return', 'throw', 'throws', 'try',
  'catch', 'finally', 'new', 'instanceof', 'synchronized', 'volatile', 'transient',
  'super', 'this', 'default', 'switch', 'case', 'break', 'continue', 'if', 'else',
  'while', 'for', 'do', 'enum', 'record', 'var', 'yield', 'sealed', 'permits'
];

const JAVA_COMMON_IDENTIFIERS = [
  'System', 'out', 'println', 'print', 'String', 'Integer', 'Double', 'Boolean',
  'Math', 'Scanner', 'ArrayList', 'List', 'HashMap', 'Map', 'HashSet', 'Set',
  'Collections', 'Arrays', 'StringBuilder', 'Thread', 'Runnable', 'Override',
  'length', 'size', 'get', 'set', 'add', 'remove', 'contains', 'isEmpty',
  'equals', 'hashCode', 'toString', 'compareTo', 'valueOf', 'parseInt',
  'stream', 'filter', 'map', 'collect', 'toList', 'forEach', 'Optional',
  'Exception', 'RuntimeException', 'NullPointerException', 'IOException'
];

const JAVA_SYMBOLS_DRILLS = [
  'for (int i = 0; i < n; i++) {',
  'List<String> list = new ArrayList<>();',
  'Map<String, Integer> map = new HashMap<>();',
  'if (a != null && a.equals(b)) {',
  'public static void main(String[] args) {',
  'return (x > 0) ? (x * 2) : 0;',
  'int[] arr = new int[]{ 1, 2, 3, 4, 5 };',
  'list.stream().filter(x -> x % 2 == 0).toList();',
  'throw new IllegalArgumentException("Invalid index: " + idx);',
  'try { process(); } catch (Exception e) { e.printStackTrace(); }',
  'this.id = id; this.name = name; this.score = score;',
  'while (left <= right) { int mid = left + (right - left) / 2; }'
];

const JAVA_SNIPPETS = [
  // BASICS & FLOW
  {
    id: 'hello-world',
    title: 'Hello World Entry Point',
    category: 'basics',
    difficulty: 'Beginner',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java Student!");
    }
}`,
    explanation: 'Every standalone Java program requires a `public static void main(String[] args)` method as the entry point called by the JVM.',
    tags: ['class', 'main', 'println', 'jvm']
  },
  {
    id: 'primitive-vars',
    title: 'Primitive Types & Operations',
    category: 'basics',
    difficulty: 'Beginner',
    code: `int age = 21;
double gpa = 3.85;
char grade = 'A';
boolean isEnrolled = true;
String studentName = "Alex";

System.out.printf("%s is %d years old with GPA %.2f\\n", studentName, age, gpa);`,
    explanation: 'Java is strongly typed. `int`, `double`, `char`, and `boolean` are 4 of Java\'s 8 primitive types. `String` is an object reference type.',
    tags: ['primitives', 'printf', 'variables']
  },
  {
    id: 'for-loop-array',
    title: 'Indexed & Enhanced For-Loops',
    category: 'basics',
    difficulty: 'Beginner',
    code: `int[] scores = { 92, 85, 78, 96, 88 };
int total = 0;

for (int i = 0; i < scores.length; i++) {
    total += scores[i];
}

double average = (double) total / scores.length;
System.out.println("Class Average: " + average);`,
    explanation: 'Arrays have a fixed `.length` field. Explicit cast `(double) total` prevents integer truncation during division.',
    tags: ['arrays', 'for-loop', 'casting']
  },
  {
    id: 'switch-expression',
    title: 'Modern Java Switch Expression',
    category: 'basics',
    difficulty: 'Intermediate',
    code: `String dayType = switch (dayOfWeek) {
    case "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY" -> "Weekday";
    case "SATURDAY", "SUNDAY" -> "Weekend";
    default -> throw new IllegalArgumentException("Unknown day: " + dayOfWeek);
};`,
    explanation: 'Modern Java switch expressions use arrow syntax `->` without requiring explicit `break` statements and return a value directly.',
    tags: ['switch', 'java14', 'pattern']
  },

  // OOP & CLASSES
  {
    id: 'simple-class',
    title: 'Encapsulated Class & Constructor',
    category: 'oop',
    difficulty: 'Beginner',
    code: `public class BankAccount {
    private final String accountNumber;
    private double balance;

    public BankAccount(String accountNumber, double initialDeposit) {
        this.accountNumber = accountNumber;
        this.balance = initialDeposit;
    }

    public double getBalance() {
        return this.balance;
    }

    public void deposit(double amount) {
        if (amount > 0) {
            this.balance += amount;
        }
    }
}`,
    explanation: 'Encapsulation keeps fields `private` to safeguard internal state. The `this` keyword refers to the current object instance.',
    tags: ['class', 'encapsulation', 'constructor', 'getters']
  },
  {
    id: 'inheritance-override',
    title: 'Inheritance & Method Overriding',
    category: 'oop',
    difficulty: 'Intermediate',
    code: `public class Dog extends Animal {
    private final String breed;

    public Dog(String name, String breed) {
        super(name);
        this.breed = breed;
    }

    @Override
    public void makeSound() {
        System.out.println(getName() + " barks: Woof woof!");
    }
}`,
    explanation: '`extends` establishes an IS-A inheritance relationship. `super(name)` invokes the parent constructor, and `@Override` ensures compile-time check.',
    tags: ['inheritance', 'super', 'override', 'polymorphism']
  },
  {
    id: 'interface-contract',
    title: 'Interfaces & Default Methods',
    category: 'oop',
    difficulty: 'Intermediate',
    code: `public interface Printable {
    void printDetails();

    default void printHeader() {
        System.out.println("=== Java Report Document ===");
    }

    static boolean isValid(String content) {
        return content != null && !content.isBlank();
    }
}`,
    explanation: 'Interfaces define contracts. Since Java 8, interfaces can provide `default` method bodies and `static` utility methods.',
    tags: ['interface', 'default-method', 'polymorphism']
  },
  {
    id: 'java-record',
    title: 'Modern Java Record (DTO)',
    category: 'oop',
    difficulty: 'Intermediate',
    code: `public record Student(String id, String name, double gpa) {
    public Student {
        if (gpa < 0.0 || gpa > 4.0) {
            throw new IllegalArgumentException("GPA must be between 0.0 and 4.0");
        }
    }

    public boolean isHonorRoll() {
        return gpa >= 3.5;
    }
}`,
    explanation: '`record` classes automatically generate immutable fields, constructor, getters (`name()`), `equals()`, `hashCode()`, and `toString()`.',
    tags: ['record', 'immutable', 'dto', 'java17']
  },

  // COLLECTIONS & GENERICS
  {
    id: 'arraylist-ops',
    title: 'ArrayList Operations & Iteration',
    category: 'collections',
    difficulty: 'Beginner',
    code: `List<String> fruits = new ArrayList<>();
fruits.add("Apple");
fruits.add("Banana");
fruits.add("Orange");

for (String fruit : fruits) {
    System.out.println("Fresh: " + fruit.toUpperCase());
}

if (fruits.contains("Banana")) {
    fruits.remove("Banana");
}`,
    explanation: 'Always program to the interface `List<String>` rather than the implementation `ArrayList` for flexible software design.',
    tags: ['list', 'arraylist', 'generics', 'foreach']
  },
  {
    id: 'hashmap-lookup',
    title: 'HashMap Key-Value Mapping',
    category: 'collections',
    difficulty: 'Intermediate',
    code: `Map<String, Integer> inventory = new HashMap<>();
inventory.put("Laptop", 14);
inventory.put("Keyboard", 35);
inventory.put("Mouse", 50);

int currentStock = inventory.getOrDefault("Monitor", 0);
inventory.put("Laptop", inventory.get("Laptop") - 1);

for (Map.Entry<String, Integer> entry : inventory.entrySet()) {
    System.out.println(entry.getKey() + " -> " + entry.getValue());
}`,
    explanation: '`HashMap` offers O(1) average lookup and insertion time. `getOrDefault()` avoids `NullPointerException` when a key is absent.',
    tags: ['hashmap', 'map', 'key-value', 'collections']
  },
  {
    id: 'generic-box',
    title: 'Generic Type Class Definition',
    category: 'collections',
    difficulty: 'Advanced',
    code: `public class Result<T> {
    private final T data;
    private final boolean isSuccess;
    private final String error;

    private Result(T data, boolean isSuccess, String error) {
        this.data = data;
        this.isSuccess = isSuccess;
        this.error = error;
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(data, true, null);
    }

    public static <T> Result<T> fail(String msg) {
        return new Result<>(null, false, msg);
    }
}`,
    explanation: 'Generics `<T>` allow code to work with multiple data types while providing full compile-time type safety without casting.',
    tags: ['generics', 'static-factory', 'design-pattern']
  },

  // METHODS & DSA
  {
    id: 'binary-search',
    title: 'Binary Search Algorithm',
    category: 'methods_dsa',
    difficulty: 'Intermediate',
    code: `public static int binarySearch(int[] arr, int target) {
    int left = 0;
    int right = arr.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}`,
    explanation: 'Using `left + (right - left) / 2` avoids potential integer overflow bugs that happen with `(left + right) / 2` in large arrays.',
    tags: ['dsa', 'binary-search', 'algorithms', 'while-loop']
  },
  {
    id: 'palindrome-check',
    title: 'String Palindrome Two-Pointer Check',
    category: 'methods_dsa',
    difficulty: 'Beginner',
    code: `public static boolean isPalindrome(String s) {
    int start = 0;
    int end = s.length() - 1;

    while (start < end) {
        if (s.charAt(start) != s.charAt(end)) {
            return false;
        }
        start++;
        end--;
    }
    return true;
}`,
    explanation: 'The two-pointer technique checks for symmetry in O(n) time and O(1) space without creating extra reversed String allocations.',
    tags: ['string', 'two-pointer', 'palindrome']
  },
  {
    id: 'factorial-recursion',
    title: 'Recursive Factorial with Base Case',
    category: 'methods_dsa',
    difficulty: 'Beginner',
    code: `public static long factorial(int n) {
    if (n < 0) {
        throw new IllegalArgumentException("n must be non-negative");
    }
    if (n == 0 || n == 1) {
        return 1L;
    }
    return n * factorial(n - 1);
}`,
    explanation: 'Every recursive method needs a verified base case (`n <= 1`) to prevent infinite recursion and a `StackOverflowError`.',
    tags: ['recursion', 'factorial', 'math']
  },

  // EXCEPTIONS & I/O
  {
    id: 'try-catch-finally',
    title: 'Exception Handling & Try-with-Resources',
    category: 'exceptions',
    difficulty: 'Intermediate',
    code: `try (BufferedReader reader = new BufferedReader(new FileReader("data.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println("Processing: " + line.trim());
    }
} catch (FileNotFoundException e) {
    System.err.println("File not found on disk: " + e.getMessage());
} catch (IOException e) {
    System.err.println("I/O error occurred: " + e.getMessage());
}`,
    explanation: 'Java\'s `try-with-resources` statement automatically closes any resource implementing `AutoCloseable`, preventing resource leaks.',
    tags: ['try-with-resources', 'exceptions', 'io', 'bufferedreader']
  },
  {
    id: 'custom-exception',
    title: 'Throwing Custom Checked Exceptions',
    category: 'exceptions',
    difficulty: 'Intermediate',
    code: `public class InsufficientFundsException extends Exception {
    private final double deficit;

    public InsufficientFundsException(double deficit) {
        super("Account is short by: $" + deficit);
        this.deficit = deficit;
    }

    public double getDeficit() {
        return deficit;
    }
}`,
    explanation: 'Extending `Exception` creates a checked exception that calling code must either catch or declare using the `throws` keyword.',
    tags: ['exceptions', 'checked', 'throw']
  },

  // STREAMS & LAMBDAS
  {
    id: 'stream-filter-map',
    title: 'Stream API Filter, Map & Collect',
    category: 'streams',
    difficulty: 'Intermediate',
    code: `List<String> names = List.of("Emma", "James", "Alexander", "Sophia", "Lucas");

List<String> result = names.stream()
    .filter(name -> name.length() > 4)
    .map(String::toUpperCase)
    .sorted()
    .toList();

result.forEach(System.out::println);`,
    explanation: 'Java Streams provide declarative processing pipelines. `String::toUpperCase` and `System.out::println` are method references.',
    tags: ['streams', 'lambdas', 'method-reference', 'filter']
  },
  {
    id: 'stream-reduce-stats',
    title: 'Stream Reduction & Numerical Stats',
    category: 'streams',
    difficulty: 'Advanced',
    code: `List<Integer> numbers = List.of(12, 45, 68, 23, 89, 34);

int sum = numbers.stream().reduce(0, Integer::sum);
int max = numbers.stream().max(Integer::compareTo).orElse(0);

long evenCount = numbers.stream()
    .filter(n -> n % 2 == 0)
    .count();

System.out.println("Sum: " + sum + ", Max: " + max + ", Evens: " + evenCount);`,
    explanation: '`.reduce(identity, accumulator)` folds elements into a single value. `.orElse(0)` handles empty collections safely via `Optional`.',
    tags: ['streams', 'reduction', 'optional', 'statistics']
  },

  // KEYWORDS DRILL
  {
    id: 'keywords-burst-1',
    title: 'Access Modifiers & Control Keywords',
    category: 'keywords',
    difficulty: 'Beginner',
    code: `public private protected static final
abstract synchronized volatile transient
class interface enum record extends implements
if else switch case default break continue return`,
    explanation: 'Train fast finger recognition for core Java modifiers, control statements, and class declaration keywords.',
    tags: ['keywords', 'modifiers', 'speed-drill']
  },
  {
    id: 'keywords-burst-2',
    title: 'Type Names & Exception Keywords',
    category: 'keywords',
    difficulty: 'Beginner',
    code: `byte short int long float double boolean char void
try catch finally throw throws new instanceof
super this package import var yield sealed permits`,
    explanation: 'Type names, object keywords, and exception handling triggers practiced in rapid succession.',
    tags: ['keywords', 'types', 'exceptions']
  },

  // SYMBOLS & OPERATORS
  {
    id: 'symbols-drill-1',
    title: 'Delimiters & Brackets Speed Drill',
    category: 'symbols',
    difficulty: 'Intermediate',
    code: `public void test() { int[] arr = { 1, 2 }; }
List<Map<String, Object>> list = new ArrayList<>();
if ((a > 0 && b < 10) || !(c == d)) { return; }
for (int i = 0; i <= n; i++) { sum += i; }`,
    explanation: 'Brackets, parentheses, and braces are the #1 source of syntax errors for Java beginners. Practice clean finger transitions.',
    tags: ['symbols', 'brackets', 'operators']
  },
  {
    id: 'symbols-drill-2',
    title: 'Lambdas, Method Refs & Ternary Drill',
    category: 'symbols',
    difficulty: 'Advanced',
    code: `list.forEach(item -> System.out.println(item));
Function<String, Integer> fn = Integer::parseInt;
int result = (val != null) ? val.hashCode() : -1;
boolean ok = (x >= 0) && (y <= 100) && (x != y);`,
    explanation: 'Focus on `->`, `::`, `? :`, `&&`, `||`, `!=`, `<=`, `>=` symbol accuracy.',
    tags: ['symbols', 'lambdas', 'operators']
  }
];

// Helper to generate word-based tests
function generateJavaWords(count = 25) {
  const combined = [...JAVA_KEYWORDS, ...JAVA_COMMON_IDENTIFIERS];
  const words = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * combined.length);
    words.push(combined[idx]);
  }
  return words.join(' ');
}

// Helper to get random snippet by category or difficulty
function getSnippetById(id) {
  return JAVA_SNIPPETS.find(s => s.id === id) || JAVA_SNIPPETS[0];
}

function filterSnippets(categoryId = 'all', difficulty = 'all') {
  return JAVA_SNIPPETS.filter(s => {
    const matchCat = categoryId === 'all' || s.category === categoryId;
    const matchDiff = difficulty === 'all' || s.difficulty.toLowerCase() === difficulty.toLowerCase();
    return matchCat && matchDiff;
  });
}

// Calculate Typist Ranking based on WPM and Accuracy
function getJavaTypistRank(wpm, accuracy) {
  if (wpm >= 95 && accuracy >= 97) {
    return { title: 'JVM Speed Demon', badge: '⚡🚀', description: 'Elite typing velocity with near-flawless compiler precision!' };
  } else if (wpm >= 75 && accuracy >= 95) {
    return { title: 'Senior Java Architect', badge: '💎☕', description: 'Exceptional speed and pristine syntactical discipline.' };
  } else if (wpm >= 55 && accuracy >= 92) {
    return { title: 'Clean Code Artisan', badge: '🛠️✨', description: 'Solid rhythm with strong control of Java syntax and brackets.' };
  } else if (wpm >= 35 && accuracy >= 88) {
    return { title: 'Java Byte Coder', badge: '🌱☕', description: 'Good developing speed! Keep practicing special characters.' };
  } else {
    return { title: 'Junior Java Typist', badge: '🐣💻', description: 'Great start! Focus on muscle memory for brackets and semicolons.' };
  }
}

// Global window exposure for browser environment
if (typeof window !== 'undefined') {
  window.JAVA_CATEGORIES = JAVA_CATEGORIES;
  window.JAVA_KEYWORDS = JAVA_KEYWORDS;
  window.JAVA_COMMON_IDENTIFIERS = JAVA_COMMON_IDENTIFIERS;
  window.JAVA_SYMBOLS_DRILLS = JAVA_SYMBOLS_DRILLS;
  window.JAVA_SNIPPETS = JAVA_SNIPPETS;
  window.generateJavaWords = generateJavaWords;
  window.getSnippetById = getSnippetById;
  window.filterSnippets = filterSnippets;
  window.getJavaTypistRank = getJavaTypistRank;
}
