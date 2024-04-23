const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const MongoDBSession = require('connect-mongodb-session')(session)
const User = require('./models/user');
const cors = require('cors'); // Import the cors module
const app = express();
const port = 3000;
const isAuth = require('./middleware/verifyUser'); // Import the middleware
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/verifyToken')
const { body, validationResult } = require('express-validator');// Import validator library
const Task = require('./models/Task');





// Email and password validation middleware
const validateEmailAndPassword = [
  body('email').isEmail(),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 6 characters long'),
];


app.use(express.json());

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));


const mongoURI = "mongodb+srv://pothana:Vamsi123@cluster0.js2dojf.mongodb.net/project?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI,)
  .then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("Error connecting to MongoDB:", error));

const store = new MongoDBSession({
  uri: mongoURI,
  collection: "mySessions",
})

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
)

app.get("/", (req, res) => {
  res.render("landing")
})
app.get("/login", (req, res) => {
  res.render("login");
})
app.get("/register", (req, res) => {
  res.render("register");
})
app.get("/home", (req, res) => {
  res.render("home")
})
app.get("/profile", (req, res) => {
  res.render("profile")
})
app.get("/getprofile", verifyToken, isAuth, async (req, res) => {
  try {
    // Retrieve userId from the decoded payload attached to the request object by the middleware
    const userId = req.user.userId;

    // Fetch user information from the database using userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is found, return the user information
    res.status(200).json({
      username: user.username,
      email: user.email,
      // Add more user information fields as needed
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
})

app.post("/register", validateEmailAndPassword, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Extract user data from request body
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    // Save the user to the database
    await newUser.save();

    res.redirect("/login")
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }

})

app.post("/login", validateEmailAndPassword, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Extract user credentials from request body
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });

    req.session.isAuth = true
    req.session.user = { username: user.username, email: user.email };

    res.json({ token })
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }

})


app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  
  });
});


// Get all tasks for a user
app.get('/tasks', verifyToken, isAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tasks = await Task.find({ userId });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new task
app.post('/tasks', verifyToken, isAuth, async (req, res) => {
  try {
    const { description } = req.body;
    const userId = req.user.userId;
    const newTask = new Task({ userId, description });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a task
app.delete('/tasks/:id', verifyToken, isAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    await Task.findByIdAndDelete(taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a task (mark as completed/uncompleted)
app.put('/tasks/:id', verifyToken, isAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { completed } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(taskId, { completed }, { new: true });
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
