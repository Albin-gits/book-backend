const express = require("express");
const cors = require("cors");
const path = require("path"); // Import the 'path' module
const multer = require("multer"); // Import 'multer'
require("./connection");
const User = require("./model/user");
const Review = require("./model/review");
const bcrypt = require("bcryptjs");
const Book = require("./model/Book");

// Initialize express
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// API: User signup
app.post("/add", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Check if a user with the provided email or username already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res
        .status(409) // Conflict status code
        .send({ message: "Email or username already exists." });
    }

    // If no existing user is found, proceed with hashing and saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      username,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).send({ message: "Signup successful!" }); // Use 201 for successful creation
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send({ message: "Signup failed. Please try again." });
  }
});

// API: User login
app.post("/view", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ message: "Invalid credentials." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid credentials." });
    } else {
      res.status(200).send({ message: "Login successful!" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ message: "Login failed. Try again." });
  }
});

// API: Add a review
app.post("/reviews", async (req, res) => {
  try {
    const newReview = new Review(req.body);
    await newReview.save();
    res.status(201).send(newReview);
  } catch (error) {
    console.error("Error saving review", error); // Added console.error
    res.status(500).send({ message: "Error saving review" });
  }
});

// API: Get all reviews
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.send(reviews);
  } catch (error) {
    console.error("Error fetching reviews", error); // Added console.error
    res.status(500).send({ message: "Error fetching reviews" });
  }
});

// API: Get a review by ID
app.get("/review/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    res.send(review);
  } catch (error) {
    console.error("Error fetching review", error); // Added console.error
    res.status(500).send({ message: "Error fetching review" });
  }
});

// API: Delete a review by ID
app.delete("/review/:id", async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.send({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review", error); // Added console.error
    res.status(500).send({ message: "Error deleting review" });
  }
});

// API: Update a review by ID
app.put("/review/:id", async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.send({ message: "Review updated" });
  } catch (error) {
    console.error("Error updating review", error); // Added console.error
    res.status(500).send({ message: "Error updating review" });
  }
});

// API: Get the number of users
app.get("/usercount", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Error getting user count:", error);
    res.status(500).send({ message: "Error fetching user count" });
  }
});

// API: Get the number of reviews
app.get("/reviewcount", async (req, res) => {
  try {
    const count = await Review.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Error getting review count:", error);
    res.status(500).send({ message: "Error fetching review count" });
  }
});

// API: Get the number of books from external API
app.get("/bookcount", async (req, res) => {
  try {
    const response = await fetch("https://api.itbook.store/1.0/new");
    const data = await response.json();
    if (data && data.books) {
      const count = data.books.length;
      res.json({ count });
    } else {
      console.error(
        "Error: 'books' property not found in the API response:",
        data
      );
      res.status(500).send({ message: "Error processing book count from API" });
    }
  } catch (error) {
    console.error("Error getting book count:", error);
    res.status(500).send({ message: "Error fetching book count" });
  }
});

// API: Get reviews over time
app.get("/reviews-over-time", async (req, res) => {
  try {
    const reviewsByDay = await Review.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]);
    res.json(reviewsByDay);
  } catch (error) {
    console.error("Error fetching reviews over time:", error);
    res.status(500).send({ message: "Error fetching reviews over time data" });
  }
});

// API: Get most popular books
app.get("/most-popular-books", async (req, res) => {
  try {
    const popularBooks = await Review.aggregate([
      {
        $group: {
          _id: "$bookTitle",
          reviewCount: { $sum: 1 },
        },
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 10 },
      { $project: { title: "$_id", reviewCount: 1, _id: 0 } },
    ]);
    res.json(popularBooks);
  } catch (error) {
    console.error("Error fetching most popular books:", error);
    res.status(500).send({ message: "Error fetching most popular books data" });
  }
});

// API: Get all users except the first one
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().skip(1);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Error fetching users" });
  }
});

// API: Delete a user by ID
app.delete("/user/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.send({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ message: "Error deleting user" });
  }
});
app.post("/addbook", upload.single("image"), async (req, res) => {
  try {
    console.log("--- Received /addbook Request ---");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("--- End of Request Log ---");

    const { title, subtitle, isbn13, price, url } = req.body;
    const image = req.file ? req.file.filename : null;

    // Validate required fields
    if (!title || !price || !url) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Create and save the book
    const book = new Book({ title, subtitle, isbn13, price, url, image });
    await book.save();

    res.status(201).json({ message: "Book added successfully", book });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ message: error.message || "Failed to add book" });
  }
});
// API: Get all books from the database
app.get("/books", async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching books from database:", error);
    res.status(500).send({ message: "Error fetching books from database" });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("hello hii");
});

// Start the server
app.listen(3004, () => {
  console.log("port is running");
});
