# Simple import

import os;
import sys, json;

# Import with alias
import datetime as dt;

# Import specific items from a module
import from math { sqrt, pi, log as logarithm }



# Include merges a module's namespace into the current scope
include random;

#This is where the server will live 
 node Todo { has name: str, tag: str ;} #This would be for are database
 def greet(name: str) -> str {
    return f"Hello, {name}!";
}
with entry{
   root ++> Todo(name="Learn Jac", tag="Learn Jac");  # Automatically persisted this adds to the root node of our database
    print("Hello, World!");
    print(greet("Alice"));

}
cl{
    with entry {
        print("Client: Hello from the browser!");
}
}


##are server code would typically handle database interactions, business logic, and API endpoints, while client code would manage user interface and interactions.
sv {
   

    with entry{
        root ++> Todo(name="Learn Jac", tag="Learn Jac");
        print("Server: Todo added to database");
        print(greet("Server"));
    }
    
}


