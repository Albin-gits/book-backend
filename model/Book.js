  const mongoose = require("mongoose");

  const bookSchema = new mongoose.Schema({
    title: String,
    subtitle: String,
    isbn13: String,
    price: String,
    url: String,
    image: String,
  });

  module.exports = mongoose.model("Book", bookSchema);
