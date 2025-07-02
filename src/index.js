import dotenv from "dotenv";

import connectDB from "./db/windex.js";
// database se kabhi bhi app baat karne ki koshish kre tohh try and catch lo yaa phir promise use karo 
// dusri baat database hamesha dusri continent me rehta he
//using iife


dotenv.config({
    path:'./env'
})

connectDB()










//this is for connecting database but this is a naive way and it had polluted the index.js file 

//better to use another way that is making it in another file and import it

/*
import express from "express"
const app = express()

(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",() =>{
            console.log("ERROR: ",error);
            throw error
        })

        app.listen(process.env.PORT,() => {
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})()

*/