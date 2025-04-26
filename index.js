const express = require("express");
var cors = require("cors");
require("./connection");
var User = require("./model/user");
const Review = require("./model/review");
const bcrypt = require("bcryptjs");
//initialize
var app = express();
app.use(express.json());
app.use(cors());

//api creation
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

app.post("/view", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!user) {
      return res.status(401).send({ message: "Invalid credentials." });
    } else if (!isMatch) {
      return res.status(401).send({ message: "Invalid credentials." });
    } else {
      res.status(200).send({ message: "Login successful!" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ message: "Login failed. Try again." });
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const newReview = new Review(req.body);
    await newReview.save();
    res.status(201).send(newReview);
  } catch (error) {
    res.status(500).send({ message: "Error saving review" });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Error fetching reviews" });
  }
});

app.get("/review/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    res.send(review);
  } catch (error) {
    res.status(500).send({ message: "Error fetching review" });
  }
});

app.delete("/review/:id", async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.send({ message: "Review deleted" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting review" });
  }
});

// UPDATE review
app.put("/review/:id", async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.send({ message: "Review updated" });
  } catch (error) {
    res.status(500).send({ message: "Error updating review" });
  }
});

app.get("/", (req, res) => {
  res.send("hello hii");
});

//port setting
app.listen(3004, () => {
  console.log("port is running");
});
