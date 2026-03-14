# Project Architecture: Multi-Target Jac


## Architecture Overview

| Codespace | Target | Ecosystem | Syntax |
| :--- | :--- | :--- | :--- |
| **Server** | Python Runtime | PyPI (numpy, pandas, fastapi) | `sv { }` or `.sv.jac` |
| **Client** | Browser/JavaScript | npm (react, tailwind, @mui) | `cl { }` or `.cl.jac` |
| **Native** | Compiled Binary | C ABI | `na { }` or `.na.jac` |

## Implementation Guidelines

### 1. Server-Side (`.sv.jac`)
Code that runs on the server.
* **Usage:** Use the `.sv.jac` extension for server-heavy modules or wrap logic in `sv { ... }`.
* **Purpose:** Backend logic, database interactions, and heavy data processing.

### 2. Client-Side (`.cl.jac`)
Code that runs in the browser.
* **Usage:** Use the `.cl.jac` extension for UI components or wrap logic in `cl { ... }`.
* **Purpose:** React-style components, state management, and user interaction.

### 3. Native & AI (`.na.jac`)
Code that compiles to native machine code.
* **Usage:** Use the `.na.jac` extension or wrap logic in `na { ... }`.
* **Purpose:** High-performance tasks, LLM orchestration, and low-level system control.

--- I know everything up there is true I need to verfiy the bootom is true 
*Note: Jac automatically handles the interop (serialization/routing) between these codespaces, so you don't have to write "glue code" for your frontend and backend to talk.*