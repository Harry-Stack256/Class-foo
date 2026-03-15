from pymongo import MongoClient
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()

# Get the URI from .env
uri = os.getenv("MONGO_URI")
print(f"URI from .env: {uri}")

try:
    # Try to connect
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✅ Connection successful!")
    
    # List databases
    dbs = client.list_database_names()
    print(f"Databases: {dbs}")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")