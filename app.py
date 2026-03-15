import os
from flask import Flask, render_template, redirect, url_for, request, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from functools import wraps
import urllib.parse

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "fallback-secret-key-change-this")
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI is not set! Please check your .env file")

# Global MongoDB connection
client = None
db = None

def init_mongo():
    """Initialize MongoDB connection"""
    global client, db
    try:
        # Create MongoDB client
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        
        # Get database (use 'justright' or extract from URI)
        db = client['justright']
        
        # Test database access
        db.list_collection_names()
        
        print(f"✅ MongoDB connected successfully to database: {db.name}")
        return True
        
    except ServerSelectionTimeoutError as e:
        print(f"❌ MongoDB connection timeout: {e}")
        print("   Check your network and MongoDB Atlas IP whitelist")
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("   Verify your connection string and credentials")
    except Exception as e:
        print(f"❌ Unexpected MongoDB error: {e}")
    
    return False

# Initialize on startup
if not init_mongo():
    print("⚠️  WARNING: MongoDB connection failed. App will run with limited functionality.")

# Decorator to ensure database connection
def with_db(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if db is None:
            return "Database connection error. Please try again later.", 500
        return f(*args, **kwargs)
    return decorated_function

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data['_id'])
        self.username = user_data['username']
        self.email = user_data['email']
        self.first_name = user_data.get('first_name', '')
        self.last_name = user_data.get('last_name', '')
        self.profile_pic = user_data.get('profile_pic', '')
        self.body_type = user_data.get('body_type', '')
        self.sizes = user_data.get('sizes', {'tshirt': 'L', 'pants': '32x32', 'shoes': '10.5'})
        self.brand_affinity = user_data.get('brand_affinity', [])
        self.friends = user_data.get('friends', [])
        self.recent_searches = user_data.get('recent_searches', [])
        self.purchases = user_data.get('purchases', [])

@login_manager.user_loader
def load_user(user_id):
    if db is None:
        return None
    try:
        user_data = db.users.find_one({'_id': ObjectId(user_id)})
        return User(user_data) if user_data else None
    except Exception as e:
        print(f"Error loading user: {e}")
        return None

@app.route('/register', methods=['GET', 'POST'])
@with_db
def register():
    if request.method == 'POST':
        try:
            # Check if user exists
            existing_user = db.users.find_one({'email': request.form['email']})
            if existing_user:
                return 'Email already exists'
            
            # Create new user
            hash_pass = generate_password_hash(request.form['password'])
            pic_hash = abs(hash(request.form['email'])) % 1000
            
            user_data = {
                'username': request.form['username'],
                'email': request.form['email'],
                'password_hash': hash_pass,
                'first_name': request.form.get('first_name', ''),
                'last_name': request.form.get('last_name', ''),
                'profile_pic': f'https://picsum.photos/200/200?random={pic_hash}',
                'body_type': request.form.get('body_type', ''),
                'sizes': {'tshirt': 'L', 'pants': '32x32', 'shoes': '10.5'},
                'brand_affinity': [],
                'friends': [],
                'recent_searches': [],
                'purchases': []
            }
            
            result = db.users.insert_one(user_data)
            print(f"✅ User created: {result.inserted_id}")
            return redirect(url_for('login'))
            
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return f"Registration failed: {str(e)}", 500
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
@with_db
def login():
    if request.method == 'POST':
        try:
            # Find user by email
            user_data = db.users.find_one({'email': request.form['email']})
            
            if user_data and check_password_hash(user_data['password_hash'], request.form['password']):
                user = User(user_data)
                login_user(user)
                print(f"✅ User logged in: {user.email}")
                
                # Redirect to the page they were trying to access
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('index'))
            else:
                return 'Invalid credentials'
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return f"Login failed: {str(e)}", 500
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
@with_db
def index():
    try:
        # Get current user's data
        user_data = db.users.find_one({'_id': ObjectId(current_user.id)})
        
        if not user_data:
            return "User not found", 404
        
        # Get friends' data
        friend_ids = user_data.get('friends', [])
        friends = []
        for fid in friend_ids:
            try:
                friend = db.users.find_one({'_id': ObjectId(fid)})
                if friend:
                    friends.append(friend)
            except:
                continue
        
        # Products list
        products = [
            {'img': 'https://picsum.photos/400/300?random=10', 'brand': 'Nike', 'name': 'Air Max 90', 'desc': 'Classic retro running shoe...', 'price': '$130'},
            {'img': 'https://picsum.photos/400/300?random=11', 'brand': 'Uniqlo', 'name': 'Supima Cotton Tee', 'desc': 'Ultra-soft cotton t-shirt...', 'price': '$14.90'},
            {'img': 'https://picsum.photos/400/300?random=12', 'brand': 'New Balance', 'name': '550', 'desc': 'Retro basketball sneaker...', 'price': '$110'},
        ]
        
        # Notifications
        notifications = [
            {'id': '1', 'text': 'Your friend Jordan tagged your T-Shirt size as a match.', 'actions': True},
            {'id': '2', 'text': 'Three friends just bought the Classic Black Tee.', 'actions': False},
        ]

        return render_template('index.html',
                               user=current_user,
                               friends=friends,
                               products=products,
                               purchases=user_data.get('purchases', []),
                               notifications=notifications)
                               
    except Exception as e:
        print(f"❌ Index error: {e}")
        return f"Error loading dashboard: {str(e)}", 500

@app.route('/test-db')
def test_db():
    if db is None:
        return "❌ Database not connected", 500
    
    try:
        # Test connection
        db.command('ping')
        
        # Get stats
        user_count = db.users.count_documents({})
        collections = db.list_collection_names()
        
        return f"""
        ✅ Database connected!<br>
        Database: {db.name}<br>
        Collections: {', '.join(collections)}<br>
        Users: {user_count}
        """
    except Exception as e:
        return f"❌ Database error: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True)