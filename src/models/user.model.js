import mongoose, {mongo, Schema} from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    username:{
        type:String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,  // searching field ke liye optimisation
    },
    email:{
        type:String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type:String,
        required: true,
        trim: true,
        index: true,
    },
    avatar:{
        type:String, // cloudinary ka url use karenge
    },
    coverImage:{
        type:String, // cloudinary ka url use karenge
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video",
        }
    ],
    password:{
        type:String,
        required: [true, "Password is required"],
    },
    refreshToken:{
        type:String,
    }
},{
    timestamps: true,
})

userSchema.pre("save",async function (next) {
    if(!this.isModified("password")) return ;
    this.password = await bcrypt.hash(this.password,10)
    next()
}) // yahan pe jab bhi function likhte ho to context important he isliye  () => {} likhna risky he

userSchema.methods.isPasswordCorrect = async function(password){
 return await  bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email:this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(
){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);

//interview me puch sakte he -->