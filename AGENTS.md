## Code Guidelines
Do not write code for legacy browser compatibility. You are encouraged to use the latest features provided by **modern browsers**, **React**, and the **ESNext** specification.

* **JavaScript / TypeScript:** Use modern APIs and syntax (e.g. optional chaining `?.`, nullish coalescing `??`, `Promise.allSettled`, etc.) without worrying about polyfills for outdated browsers.
* **React:** Prefer modern React patterns such as function components, hooks, and idiomatic composition. Avoid legacy patterns like class components or compatibility-driven abstractions unless there is a clear project-specific reason.
* **CSS / SCSS:** Utilize modern layout and styling techniques (e.g. CSS Grid, `:has()`, `aspect-ratio`, Container Queries, and Native Nesting) over legacy workarounds or heavy library dependencies.
* **Principle:** If it is supported by the latest versions of Chrome, Edge, Safari, and Firefox, it is preferred over "safe" but verbose legacy patterns.

## Code Style Guidelines

To ensure consistency, readability, and maintainability across the codebase, please adhere to the following coding standards:

### 1. Function Syntax
Prefer **Arrow Functions** (`const task = () => {}`) over traditional function declarations (`function task() {}`). This promotes a consistent style and keeps function patterns aligned across utilities, hooks, components, and event handlers.

### 2. Naming Conventions
Variable and function names must be **descriptive and self-explanatory**. A developer should be able to understand the purpose of a variable or the action of a function simply by reading its name. Avoid vague abbreviations.

### 3. Event Handler Naming
Event handlers must follow the **`handle + Action`** pattern. Names should describe *what* the logic does rather than *which* event triggered it. Avoid generic names like `onClick` or `handleSubmit`.
* **Correct:** `<button onClick={handleCheckAndSubmitForm}></button>`
* **Incorrect:** `<button onClick={onClickButton}></button>` or `<button onClick={submit}></button>`

### 4. Control Flow Braces
Always use curly braces for block statements. Even for single-line conditions, do not omit the braces.
* **Correct:**
  ```javascript
  if (condition) {
    return;
  }
  ```
* **Incorrect:** `if (condition) return;`

### 5. Switch Statements
Every `case` and `default` block within a `switch` statement must be wrapped in **curly braces** to create a block scope. This prevents variable hoisting issues and improves clarity.
```javascript
switch (action) {
  case 'UPDATE': {
    const data = getData();
    process(data);
    break;
  }
  default: {
    break;
  }
}
```

### 6. Boolean Type Casting
Unless a variable is explicitly known to be a boolean type, use the **double negation operator (`!!`)** to cast values to a boolean for truthiness evaluations.
* `!!foo === true` represents a truthy value.
* `!!bar === false` represents a falsy value.
```javascript
const hasAccess = !!userPermissions === true;

const isUserNotExist = !!user === false;
```

### 7. Variable Declarations
Always prioritize **`const`** for variable declarations. Only use **`let`** if you are certain that the variable's value will be reassigned later. This practice helps prevent accidental mutations and makes the code's intent clearer. Avoid using `var` entirely.
* **Correct:** `const totalCount = 10;`
* **Correct (when reassignment is needed):** `let offset = 0; offset += 10;`

### 8. Dynamic Styling and Overridability
Prefer using **CSS Variables** (Custom Properties) to handle dynamic styles instead of applying visual values directly via inline `style` attributes. Additionally, design components such that their internal styles can be customized by external consumers without requiring the use of `!important`.

* **Correct (Dynamic Styling):**
  ```tsx
  <div
    style={{ '--theme-color': dynamicColor } as React.CSSProperties}
    className="container"
  ></div>
  ```
  ```scss
  .container {
    color: var(--theme-color, black);
  }
  ```
* **Incorrect:** `<div style={{ color: dynamicColor }}></div>`

### 9. List Rendering
When rendering lists in React, you must follow these mandatory practices to ensure optimal performance and predictable behavior:

- **Use `.map()` for Rendering**: Always use `Array.prototype.map()` to render list items in JSX.
- **Mandatory `key` Prop**: The `key` prop is **required** for every rendered list item. Never omit it.
- **Key Source Priority**: The `key` value must be derived from a **unique identifier field** (e.g. `id`, `uid`, `uuid`) from the rendered data. **Never use array indices** as keys.
- **Fallback for Missing IDs**: If the data source does not provide a unique identifier, you must generate one using the following expression:
  ```javascript
  window.crypto?.randomUUID?.() || (new Date().getTime() * Math.random()).toFixed(0)
  ```
  Assign this generated value to a new property on each item during data processing, and use that property as the key.

* **Correct:**
  ```tsx
  {items.map((item) => (
    <div key={item.id}>
      {item.name}
    </div>
  ))}
  ```
* **Correct (with generated ID):**
  ```javascript
  const processedItems = rawItems.map((item) => ({
    ...item,
    id:
      item.id ??
      window.crypto?.randomUUID?.() ||
      (new Date().getTime() * Math.random()).toFixed(0),
  }));
  ```
  ```tsx
  {processedItems.map((item) => (
    <div key={item.id}>
      {item.name}
    </div>
  ))}
  ```
* **Incorrect:**
  ```tsx
  {items.map((item, index) => (
    <div key={index}>{item.name}</div>
  ))}
  ```

### 10. CSS/Styling
- **Preprocessor**: Always use **SCSS** for styling.
- **Explicit Background Color Property**: When setting only a background color, always use the explicit `background-color` property instead of the shorthand `background` property. The shorthand `background` property resets all background sub-properties and can lead to unintended side effects.
  - *Correct:* `background-color: #f0f0f0;`
  - *Incorrect:* `background: #f0f0f0;`

* **Correct:**
  ```scss
  .component {
    background-color: #f0f0f0;
  }
  ```
* **Incorrect:**
  ```scss
  .component {
    background: #f0f0f0;
  }
  ```

### 11. Array Manipulation
Adopt **immutable array operations** to ensure predictable state management and avoid unintended side effects. Follow these mandatory practices:

- **Transforming Arrays**: Use **`Array.prototype.map()`** when you need to update or transform elements within an array. This returns a new array with the transformed elements, preserving immutability.
- **Removing Elements**: Use **`Array.prototype.filter()`** when you need to remove elements from an array based on a condition. This returns a new array excluding the filtered-out elements.
- **Prohibition**: Never use mutating methods such as `splice()`, `pop()`, `shift()`, or direct index assignment (e.g. `array[index] = newValue`) for state updates. These mutate the original array, which can lead to bugs in state-driven systems like React.

* **Correct (Updating):**
  ```javascript
  const updatedItems = items.map((item) =>
    item.id === targetId ? { ...item, status: 'completed' } : item,
  );
  ```
* **Correct (Removing):**
  ```javascript
  const remainingItems = items.filter((item) => item.id !== targetId);
  ```
* **Incorrect:**
  ```javascript
  const index = items.findIndex((item) => item.id === targetId);
  items.splice(index, 1);

  items[index] = { ...items[index], status: 'completed' };
  ```

### 12. Web Storage API Usage
When interacting with `localStorage` or `sessionStorage`, you must **strictly use the official API methods** (`getItem()`, `setItem()`, `removeItem()`) instead of dot notation or bracket notation for property access. This ensures consistent behavior, avoids potential conflicts with Storage prototype properties, and maintains code clarity.

- **Mandatory Correction**: If you encounter code that uses dot notation or bracket notation for storage access during modifications, you must refactor it to use the proper API methods.

* **Correct:**
  ```javascript
  const token = localStorage.getItem('authToken');
  const userData = JSON.parse(sessionStorage.getItem('user'));

  localStorage.setItem('authToken', token);
  sessionStorage.setItem('user', JSON.stringify(userData));

  localStorage.removeItem('authToken');
  ```
* **Incorrect:**
  ```javascript
  const token = localStorage.authToken;
  localStorage.authToken = token;

  const user = sessionStorage['user'];
  sessionStorage['user'] = JSON.stringify(userData);
  ```

### 13. API Service Functions
All API service functions in `service.ts` files must adhere to a **structured, Promise-based pattern** to ensure consistency, readability, and proper error propagation across the codebase.

#### Core Principles
- **Explicit Promise Chaining**: Always use explicit `.then()` chains. The use of `async/await` syntax is **strictly prohibited** in service functions.
- **Mandatory Promise Return**: Every service function must return a `Promise`. Use `Promise.resolve()` for successful outcomes and `Promise.reject()` for failures.
- **Structured Function Body**: Service functions must follow a three-part structure: URL definition, parameter definition (if applicable), and the HTTP request with standardized response handling.

### 14. File and Folder Structure
To keep the project structure consistent, all UI modules must follow a strict folder-based convention.

#### Core Principles
- **Components Directory**: All reusable components must be placed under `components`.
- **Pages Directory**: All route-level pages must be placed under `pages`.
- **Folder Naming**: Each component or page must use its own dedicated folder, and the folder name must match the component or page name.
- **Index File Convention**: Use `index` as the base filename for module files. This convention applies broadly across the project structure.

#### Required Files for Components and Pages
Every component or page folder must contain at least:

- `index.tsx`
- `index.module.scss`

#### HTTP Request Files
If a component or page is responsible for sending HTTP requests, it must additionally contain:

- `index.service.ts`

#### Scope Clarification
- The `folder-name/index.*` convention applies to all structured modules.
- Only **components** and **pages** are required to include `index.module.scss`.

#### Correct Examples
```text
components/
  UserCard/
    index.tsx
    index.module.scss

pages/
  LoginPage/
    index.tsx
    index.module.scss
    index.service.ts
```

#### Incorrect Examples
```text
components/
  UserCard.tsx

pages/
  login/
    LoginPage.tsx
    style.scss
```
