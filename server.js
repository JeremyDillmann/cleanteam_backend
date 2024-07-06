const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with a database in a production environment)
let schedule = {
  dailyTasks: [],
  robotPrep: [],
  weeks: [],
  deepCleaning: []
};

// Hardcoded credentials (replace with environment variables in a production environment)
const SHARED_USERNAME = 'jeremy_and_moana';
const SHARED_PASSWORD = 'your_secure_password'; // Replace with a strong password
const JWT_SECRET = 'your_jwt_secret'; // Replace with a secure random string

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
    req.userId = decoded.id;
    next();
  });
};

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username !== SHARED_USERNAME || !(await bcrypt.compare(password, await bcrypt.hash(SHARED_PASSWORD, 10)))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: 'shared_account' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// Get schedule
app.get('/schedule', verifyToken, (req, res) => {
  res.json(schedule);
});

// Update schedule
app.put('/schedule', verifyToken, (req, res) => {
  const { schedule: newSchedule } = req.body;
  schedule = newSchedule;
  res.json({ message: 'Schedule updated successfully' });
});

// Add task
app.post('/task', verifyToken, (req, res) => {
  const { category, subcategory, task, assignee } = req.body;
  const newTask = { task, assignee };

  if (category === 'dailyTasks') {
    const dailyTask = schedule.dailyTasks.find(item => item.time === subcategory);
    if (dailyTask) {
      dailyTask.tasks.push(newTask);
    } else {
      schedule.dailyTasks.push({ time: subcategory, tasks: [newTask] });
    }
  } else if (category === 'robotPrep') {
    schedule.robotPrep.push(newTask);
  } else if (category === 'weeks') {
    const [weekName, dayName] = subcategory.split('|');
    const week = schedule.weeks.find(w => w.name === weekName);
    if (week) {
      const day = week.days.find(d => d.name === dayName);
      if (day) {
        day.tasks.push(newTask);
      } else {
        week.days.push({ name: dayName, tasks: [newTask] });
      }
    } else {
      schedule.weeks.push({
        name: weekName,
        days: [{ name: dayName, tasks: [newTask] }]
      });
    }
  } else if (category === 'deepCleaning') {
    const deepCleaningItem = schedule.deepCleaning.find(item => item.week === subcategory);
    if (deepCleaningItem) {
      deepCleaningItem.tasks.push(newTask);
    } else {
      schedule.deepCleaning.push({ week: subcategory, tasks: [newTask] });
    }
  }

  res.json({ message: 'Task added successfully', schedule });
});

// Remove task
app.delete('/task', verifyToken, (req, res) => {
  const { category, subcategory, taskIndex } = req.body;

  if (category === 'dailyTasks') {
    const dailyTask = schedule.dailyTasks.find(item => item.time === subcategory);
    if (dailyTask) {
      dailyTask.tasks.splice(taskIndex, 1);
    }
  } else if (category === 'robotPrep') {
    schedule.robotPrep.splice(taskIndex, 1);
  } else if (category === 'weeks') {
    const [weekName, dayName] = subcategory.split('|');
    const week = schedule.weeks.find(w => w.name === weekName);
    if (week) {
      const day = week.days.find(d => d.name === dayName);
      if (day) {
        day.tasks.splice(taskIndex, 1);
      }
    }
  } else if (category === 'deepCleaning') {
    const deepCleaningItem = schedule.deepCleaning.find(item => item.week === subcategory);
    if (deepCleaningItem) {
      deepCleaningItem.tasks.splice(taskIndex, 1);
    }
  }

  res.json({ message: 'Task removed successfully', schedule });
});

// Edit task
app.put('/task', verifyToken, (req, res) => {
  const { category, subcategory, taskIndex, newTask, newAssignee } = req.body;

  if (category === 'dailyTasks') {
    const dailyTask = schedule.dailyTasks.find(item => item.time === subcategory);
    if (dailyTask) {
      dailyTask.tasks[taskIndex] = { task: newTask, assignee: newAssignee };
    }
  } else if (category === 'robotPrep') {
    schedule.robotPrep[taskIndex] = { task: newTask, assignee: newAssignee };
  } else if (category === 'weeks') {
    const [weekName, dayName] = subcategory.split('|');
    const week = schedule.weeks.find(w => w.name === weekName);
    if (week) {
      const day = week.days.find(d => d.name === dayName);
      if (day) {
        day.tasks[taskIndex] = { task: newTask, assignee: newAssignee };
      }
    }
  } else if (category === 'deepCleaning') {
    const deepCleaningItem = schedule.deepCleaning.find(item => item.week === subcategory);
    if (deepCleaningItem) {
      deepCleaningItem.tasks[taskIndex] = { task: newTask, assignee: newAssignee };
    }
  }

  res.json({ message: 'Task updated successfully', schedule });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});