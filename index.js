const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
require("./connection");
const User = require("./model/user");
const Review = require("./model/review");
const bcrypt = require("bcryptjs");
const Book = require("./model/Book");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).send({ message: "Email or username already exists." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();
    res.status(201).send({ message: "Signup successful!" });
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

// API: Add a review with potential audio upload
app.post("/reviews", upload.single("audio"), async (req, res) => {
  try {
    const { username, isbn13, bookTitle, reviewText, image, price, subtitle } = req.body;
    const audio = req.file ? req.file.filename : null;

    const newReview = new Review({
      username,
      isbn13,
      bookTitle,
      reviewText,
      image,
      price,
      subtitle,
      audio,
    });

    await newReview.save();
    res.status(201).send(newReview);
  } catch (error) {
    console.error("Error saving review with audio", error);
    res.status(500).send({ message: "Error saving review with audio" });
  }
});

// API: Get all reviews
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.send(reviews);
  } catch (error) {
    console.error("Error fetching reviews", error);
    res.status(500).send({ message: "Error fetching reviews" });
  }
});

// API: Get a review by ID
app.get("/review/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    const book = await Book.findOne({ isbn13: review.isbn13 });
    const url = book ? book.url : "";
    const reviewWithUrl = { ...review.toObject(), url: url };
    res.status(200).json(reviewWithUrl);
  } catch (error) {
    console.error("Error fetching review", error);
    res.status(500).send({ message: "Error fetching review" });
  }
});

// API: Delete a review by ID
app.delete("/review/:id", async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.send({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review", error);
    res.status(500).send({ message: "Error deleting review" });
  }
});

// API: Update a review by ID with potential audio update
app.put("/review/:id", upload.single("audio"), async (req, res) => {
  try {
    const { username, isbn13, bookTitle, reviewText, image, price, subtitle } = req.body;
    const audio = req.file ? req.file.filename : null;

    const updateData = {
      username,
      isbn13,
      bookTitle,
      reviewText,
      image,
      price,
      subtitle,
    };

    if (audio) {
      updateData.audio = audio;
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedReview) {
      return res.status(404).send({ message: "Review not found" });
    }

    res.send({ message: "Review updated", updatedReview });
  } catch (error) {
    console.error("Error updating review with audio", error);
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

// API: Get the number of books
app.get("/bookcount", async (req, res) => {
  try {
    const count = await Book.countDocuments();
    res.json({ count });
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

// API: Add a book
app.post("/addbook", upload.single("image"), async (req, res) => {
  try {
    console.log("--- Received /addbook Request ---");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("--- End of Request Log ---");

    const { title, subtitle, isbn13, price, url } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!title || !price || !url) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const book = new Book({ title, subtitle, isbn13, price, url, image });
    await book.save();

    res.status(201).json({ message: "Book added successfully", book });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ message: error.message || "Failed to add book" });
  }
});

// API: Get all books
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Error fetching books", error: err });
  }
});

// API: Get a book by ISBN13
app.get("/books/:isbn13", async (req, res) => {
  try {
    const book = await Book.findOne({ isbn13: req.params.isbn13 });
    if (book) {
      res.status(200).json(book);
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  } catch (error) {
    console.error("Error fetching book by ISBN13:", error);
    res.status(500).send({ message: "Error fetching book details" });
  }
});

// API: Audio upload for a specific review (KEEP THIS FOR UPDATING AUDIO)
app.post("/upload-audio/:id", upload.single("audio"), async (req, res) => {
  try {
    const reviewId = req.params.id;
    const audioFile = req.file ? req.file.filename : null;

    if (!audioFile) {
      return res.status(400).json({ message: "No audio file uploaded" });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { audio: audioFile },
      { new: true }
    );

    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      message: "Audio uploaded successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({ message: "Failed to upload audio" });
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