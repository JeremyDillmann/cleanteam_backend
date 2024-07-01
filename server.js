const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Connect to MongoDB Atlas
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://dillmannjeremy:PJROyX3swbRJAiRC@cleaning.xr4w5fh.mongodb.net/cleaning_app?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// User model
const User = mongoose.model('User', {
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  schedule: {
    dailyTasks: [{ time: String, tasks: [String] }],
    robotPrep: [String],
    weeks: [{
      name: String,
      days: [{ name: String, tasks: [String] }]
    }],
    deepCleaning: [{ week: String, tasks: [String] }]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, schedule: {} });
    await user.save();
    res.status(201).send('User created');
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).send('Server error');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(400).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).send('Server error');
  }
});

app.get('/schedule', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json(user.schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Server error');
  }
});

app.put('/schedule', authenticateToken, async (req, res) => {
  try {
    const { schedule } = req.body;
    await User.findByIdAndUpdate(req.userId, { schedule });
    res.send('Schedule updated');
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).send('Server error');
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.userId = user.userId;
    next();
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
