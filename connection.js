const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://albinjoseph2015:albinmongodb333@albin.lrdjaop.mongodb.net/bookreview?retryWrites=true&w=majority&appName=Albin')
.then(()=>{
    console.log("mongo connect")
})
.catch((err)=>{
    console.log(err)
})