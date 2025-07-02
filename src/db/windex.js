import mongoose, { mongo } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() =>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST:${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("MONGODB connection ERROR",error);
        process.exit(1);//alag alag process se exit he padh lena acche se iske baare me
    }
}


export default connectDB