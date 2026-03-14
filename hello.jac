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
 node Todo { has title: str, done: bool = False; } #This would be for are database
with entry{
    root ++> Todo(title="Learn Jac");  # Automatically persisted this adds to the root node of our database
    print("Hello, World!");

}
# Use :__main__ to run only when this is the main module
with entry:__main__ {

    print("Only when run directly");
}

