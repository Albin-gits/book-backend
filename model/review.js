const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  username: String,
  isbn13: String,
  bookTitle: String,
  reviewText: String,
  image: String,
  price: String,
  subtitle: String,
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);