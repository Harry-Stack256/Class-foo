# Server-side logic for Todo application

sv {
    node Todo { has title: str, done: bool = False; }

    def greet(name: str) -> str {
        return f"Hello, {name}!";
    }

    with entry {
        root ++> Todo(title="Learn Jac");
        print("Server: Todo added to database");
        print(greet("Server"));
    }
}