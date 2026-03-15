import express from 'express';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// MongoDB Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not defined. Database operations will fail.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Models
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  tags: [String],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: {
    lat: Number,
    lng: Number,
  },
  maxDistance: { type: Number, default: 50 }, // in miles
  filterKeywords: String, // comma separated
});
const User = mongoose.model('User', userSchema);

const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  location: String,
  locationCoords: {
    lat: Number,
    lng: Number,
  },
  isPublic: { type: Boolean, default: true },
  tags: [String],
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['yes', 'maybe', 'no', 'invited'] }
  }]
});
const Event = mongoose.model('Event', eventSchema);

// Middleware to ensure DB is connected
const requireDB = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  await connectDB();
  if (!isConnected) {
    return res.status(500).json({ error: 'Database connection failed. Please configure MONGODB_URI.' });
  }
  next();
};

// API Routes
app.post('/api/users', requireDB, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/:id', requireDB, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('friends', 'name tags');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/search', requireDB, async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const users = await User.find({ name: { $regex: q, $options: 'i' } }).limit(10);
    res.json(users);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Friend Request Endpoints
app.post('/api/friend-requests', requireDB, async (req, res) => {
  try {
    const { fromId, toId } = req.body;
    
    // Check if already friends
    const user = await User.findById(fromId);
    if (user?.friends.includes(toId)) {
      return res.status(400).json({ error: 'Already friends' });
    }
    
    // Check if request already exists
    const existing = await FriendRequest.findOne({
      from: fromId,
      to: toId,
      status: 'pending'
    });
    if (existing) return res.status(400).json({ error: 'Request already pending' });
    
    const request = new FriendRequest({ from: fromId, to: toId });
    await request.save();
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/:id/friend-requests', requireDB, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.params.id,
      status: 'pending'
    }).populate('from', 'name tags');
    res.json(requests);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/:id/sent-requests', requireDB, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      from: req.params.id,
      status: 'pending'
    });
    res.json(requests);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/friend-requests/:id', requireDB, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = status;
    await request.save();
    
    if (status === 'accepted') {
      const user1 = await User.findById(request.from);
      const user2 = await User.findById(request.to);
      
      if (user1 && user2) {
        if (!user1.friends.includes(user2._id)) user1.friends.push(user2._id);
        if (!user2.friends.includes(user1._id)) user2.friends.push(user1._id);
        await user1.save();
        await user2.save();
      }
    }
    
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/users/:id/friends', requireDB, async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findById(req.params.id);
    const friend = await User.findById(friendId);
    
    if (!user || !friend) return res.status(404).json({ error: 'User not found' });
    
    if (!user.friends.includes(friend._id)) {
      user.friends.push(friend._id);
      await user.save();
    }
    if (!friend.friends.includes(user._id)) {
      friend.friends.push(user._id);
      await friend.save();
    }
    
    const updatedUser = await User.findById(req.params.id).populate('friends', 'name tags');
    res.json(updatedUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id/friends/:friendId', requireDB, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const friend = await User.findById(req.params.friendId);
    
    if (!user || !friend) return res.status(404).json({ error: 'User not found' });
    
    user.friends = user.friends.filter(id => id.toString() !== friend._id.toString()) as any;
    await user.save();
    
    friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString()) as any;
    await friend.save();
    
    const updatedUser = await User.findById(req.params.id).populate('friends', 'name tags');
    res.json(updatedUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireDB, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/seed', requireDB, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Create example friends
    const friendsData = [
      { name: 'Alice Chen', age: 28, tags: ['Vegetarian', 'Gluten-Free', 'Board Games', 'Early Bird', 'Coffee Lover'] },
      { name: 'Bob Smith', age: 32, tags: ['Halal', 'Night Owl', 'Outdoor Enthusiast', 'Dog Friendly', 'Spicy Food'] },
      { name: 'Charlie Davis', age: 25, tags: ['Vegan', 'Nut Allergy', 'Introvert', 'Movie Buff', 'Cat Person'] },
      { name: 'Diana Prince', age: 30, tags: ['Pescatarian', 'Fitness Enthusiast', 'Wine Lover', 'Extrovert', 'Live Music'] },
      { name: 'Elena Rodriguez', age: 27, tags: ['Keto', 'Dairy-Free', 'Yoga', 'Early Bird'] },
      { name: 'Frank Miller', age: 45, tags: ['BBQ Expert', 'Craft Beer', 'Classic Rock'] }
    ];

    const createdFriends = await User.insertMany(friendsData);
    const friendIds = createdFriends.map(f => f._id);

    // Create some strangers
    const strangersData = [
      { name: 'Ethan Hunt', age: 35, tags: ['Action Movies', 'Rock Climbing', 'Keto', 'Dog Friendly'] },
      { name: 'Fiona Gallagher', age: 29, tags: ['Vegetarian', 'Art', 'Coffee Lover', 'Night Owl'] },
      { name: 'George Miller', age: 40, tags: ['BBQ', 'Craft Beer', 'Board Games', 'Extrovert'] },
      { name: 'Hannah Abbott', age: 24, tags: ['Baking', 'Gardening', 'Introvert'] }
    ];
    const createdStrangers = await User.insertMany(strangersData);

    // Add friends to current user
    const currentFriendIds = currentUser.friends.map(id => id.toString());
    const newFriendIds = friendIds.map(id => id.toString());
    const combinedIds = [...new Set([...currentFriendIds, ...newFriendIds])];
    currentUser.friends = combinedIds as any;
    await currentUser.save();

    // Add current user to friends
    for (const friend of createdFriends) {
      friend.friends.push(currentUser._id);
      await friend.save();
    }

    // Helper to get random coord within a range (approx miles to degrees)
    const baseLat = currentUser.location?.lat || 34.0522;
    const baseLng = currentUser.location?.lng || -118.2437;
    const getRandomCoord = (miles: number) => {
      const deg = miles / 69; // rough approx
      return {
        lat: baseLat + (Math.random() - 0.5) * deg * 2,
        lng: baseLng + (Math.random() - 0.5) * deg * 2
      };
    };

    // Create events
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(18, 0, 0, 0);

    const event1 = new Event({
      title: 'Backyard Pizza Night',
      description: 'Firing up the Ooni! I\'ll have classic margherita and some veggie options. Feel free to bring your own toppings if you have specific dietary needs. We have gluten-free dough available too!',
      date: nextWeek,
      location: 'Frank\'s Backyard',
      locationCoords: getRandomCoord(3),
      isPublic: true,
      tags: ['Pizza', 'Casual', 'Family Friendly', 'Gluten-Free Options'],
      hostId: createdFriends[5]._id, // Frank
      attendees: [
        { userId: createdFriends[5]._id, status: 'yes' },
        { userId: createdFriends[0]._id, status: 'yes' },
        { userId: currentUser._id, status: 'invited' }
      ]
    });

    const event2Date = new Date();
    event2Date.setDate(event2Date.getDate() + 3);
    event2Date.setHours(19, 0, 0, 0);

    const event2 = new Event({
      title: 'Neighborhood Taco Tuesday',
      description: 'Weekly taco stand meetup. They have great carnitas but also amazing grilled cactus for the vegetarians. It\'s a local favorite, very low-key.',
      date: event2Date,
      location: 'El Barrio Taco Stand',
      locationCoords: getRandomCoord(14.2),
      isPublic: true,
      tags: ['Tacos', 'Street Food', 'Vegetarian Options'],
      hostId: createdFriends[1]._id, // Bob
      attendees: [
        { userId: createdFriends[1]._id, status: 'yes' },
        { userId: createdStrangers[2]._id, status: 'yes' }
      ]
    });

    const event3Date = new Date();
    event3Date.setDate(event3Date.getDate() + 10);
    event3Date.setHours(12, 0, 0, 0);

    const event3 = new Event({
      title: 'Community Garden Potluck',
      description: 'Harvest celebration! Bring a dish made with something grown in a garden. We\'ll have a big table set up under the oak tree. Please label all ingredients for those with allergies.',
      date: event3Date,
      location: 'Green Valley Community Garden',
      locationCoords: getRandomCoord(8.5),
      isPublic: true,
      tags: ['Potluck', 'Outdoors', 'Community', 'Allergy Aware'],
      hostId: createdFriends[4]._id, // Elena
      attendees: [
        { userId: createdFriends[4]._id, status: 'yes' },
        { userId: createdFriends[2]._id, status: 'yes' },
        { userId: createdStrangers[3]._id, status: 'yes' }
      ]
    });

    const event4Date = new Date();
    event4Date.setDate(event4Date.getDate() + 5);
    event4Date.setHours(17, 30, 0, 0);

    const event4 = new Event({
      title: 'Sunset BBQ & Brews',
      description: 'Just a simple grill-out at the park. I\'m bringing burgers and dogs (including beyond meat). Bring a chair and your favorite beverage!',
      date: event4Date,
      location: 'Sunset View Park - Picnic Area B',
      locationCoords: getRandomCoord(19.8),
      isPublic: true,
      tags: ['BBQ', 'Park', 'Casual', 'Vegan Options'],
      hostId: createdStrangers[2]._id, // George
      attendees: [
        { userId: createdStrangers[2]._id, status: 'yes' },
        { userId: createdFriends[3]._id, status: 'maybe' }
      ]
    });

    await Event.insertMany([event1, event2, event3, event4]);

    res.json({ message: 'Seeded successfully', friends: createdFriends, strangers: createdStrangers, events: [event1, event2, event3, event4] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed/clear', requireDB, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Delete all events
    await Event.deleteMany({});

    // Delete all users except current user
    await User.deleteMany({ _id: { $ne: currentUser._id } });

    // Clear current user's friends
    currentUser.friends = [];
    await currentUser.save();

    res.json({ message: 'Cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', requireDB, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Helper for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get('/api/events', requireDB, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const hostId = req.query.hostId as string;
    let query: any = {};
    
    let currentUser: any = null;
    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (hostId) {
      query.hostId = hostId;
      if (userId && userId !== hostId) {
        query.isPublic = true;
      }
    } else if (userId) {
      query = {
        $or: [
          { hostId: userId },
          { 'attendees.userId': userId },
          { isPublic: true }
        ]
      };
    }
    
    let events = await Event.find(query).populate('hostId', 'name').sort({ date: 1 });

    // Apply distance and keyword filtering if userId is provided
    if (currentUser) {
      const userLat = currentUser.location?.lat;
      const userLng = currentUser.location?.lng;
      const maxDist = currentUser.maxDistance || 50;
      const keywords = currentUser.filterKeywords ? currentUser.filterKeywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean) : [];

      events = events.filter(event => {
        // 1. Distance Filter
        let distance = null;
        if (userLat != null && userLng != null && event.locationCoords?.lat != null && event.locationCoords?.lng != null) {
          distance = getDistance(userLat, userLng, event.locationCoords.lat, event.locationCoords.lng);
          if (distance > maxDist) return false;
        }

        // 2. Keyword Filter (Counter-matching: if user has keywords, event MUST match at least one)
        if (keywords.length > 0) {
          const content = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
          const matches = keywords.some(keyword => {
            try {
              const regex = new RegExp(keyword, 'i');
              return regex.test(content);
            } catch (e) {
              return content.includes(keyword);
            }
          });
          if (!matches) return false;
        }

        // Attach distance to the object for frontend
        if (distance != null) {
          (event as any)._doc.distance = distance;
        }
        return true;
      });
    }

    res.json(events);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/events/:id', requireDB, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('hostId', 'name tags')
      .populate('attendees.userId', 'name tags');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/events/:id/rsvp', requireDB, async (req, res) => {
  try {
    const { userId, status } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existingAttendee = event.attendees.find(a => a.userId?.toString() === userId);
    if (existingAttendee) {
      existingAttendee.status = status;
    } else {
      event.attendees.push({ userId, status });
    }
    
    await event.save();
    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/events/:id/invite', requireDB, async (req, res) => {
  try {
    const { userId, email } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (userId) {
      const existingAttendee = event.attendees.find(a => a.userId?.toString() === userId);
      if (!existingAttendee) {
        event.attendees.push({ userId, status: 'invited' });
        await event.save();
      }
    } else if (email) {
      // Just simulate sending an email for now
      console.log(`Simulating email invite to ${email} for event ${event.title}`);
    }
    
    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/events/:id/analyze', requireDB, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('hostId', 'name tags')
      .populate('attendees.userId', 'name tags');
      
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (!process.env.FEATHERLESS_API_KEY) {
      return res.status(500).json({ error: 'FEATHERLESS_API_KEY is not configured.' });
    }

    const openai = new OpenAI({
      baseURL: "https://api.featherless.ai/v1",
      apiKey: process.env.FEATHERLESS_API_KEY
    });

    const attendees = event.attendees
      .filter(a => a.status === 'yes')
      .map(a => a.userId);
      
    const prompt = `
    Event: ${event.title}
    Description: ${event.description}
    Date: ${event.date}
    Location: ${event.location || 'Not specified'}
    
    Attendees and their preferences/requirements:
    ${attendees.map((u: any) => `- ${u.name}: ${u.tags.join(', ')}`).join('\n')}
    
    Please analyze the event description against the attendees' preferences and requirements.
    Return ONLY a valid JSON object with the following structure (do not include markdown code blocks):
    {
      "attendee_profiles": [
        {
          "guest": "Name",
          "tags": ["tag1", "tag2"]
        }
      ],
      "audit_summary": {
        "critical_count": number,
        "dietary_count": number,
        "beverage_count": number
      },
      "report": {
        "critical_safety_gaps": [
          { "guest": "Name", "constraint": "...", "conflicting_items": ["..."], "reason": "..." }
        ],
        "dietary_conflicts": [
          { "guest": "Name", "constraint": "...", "conflicting_items": ["..."], "reason": "..." }
        ],
        "beverage_logistics": {
          "neutral_observations": [
            { "guest": "Name", "note": "..." }
          ]
        }
      },
      "recommendations": "A short, creative recommendation for accommodations, activities, or catering that works for everyone."
    }
    `;

    const response = await openai.chat.completions.create({
      model: "meta-llama/Llama-3-8B-Instruct", // A good default model on Featherless
      messages: [{ role: "user", content: prompt }],
    });

    let jsonStr = response.choices[0].message.content || '{}';
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let analysisData;
    try {
      analysisData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", jsonStr);
      analysisData = {
        audit_summary: { critical_count: 0, dietary_count: 0, beverage_count: 0 },
        report: {},
        recommendations: "Failed to parse AI response. Raw output: " + jsonStr
      };
    }

    res.json({ analysis: analysisData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
