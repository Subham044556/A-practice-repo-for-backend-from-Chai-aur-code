import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cluodinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async(userId)=>{
    try {
       const user = await User.findById(userId)
        
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false })

       return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Hamari taraf se kuxh galti he , sayad")//"Something went wrong while generating refresh and access token"
    }
}

const registerUser = asyncHandler( async (req , res) => {
    //get user details
    //validation - not empty
    //check if user already exists : username , email
    //check for images , check for avatar
    //upload them to , avatar 
    //create a object - create entry in db
    //remove password and refresh token field from response 
    //check for user creation
    //return response

    const {fullName,email ,username, password }= req.body
    console.log("email",email);

    if (
        [fullName, email, username,password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    
    if(existedUser){
    throw new ApiError(409, "User with email or username already exists!")
    }

    let avatarLocalPath;
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    if(req.files && Array.isArray(req.files.avatar)&& req.files.avatar.length > 0 ){
        avatarLocalPath = req.files.avatar[0].path
    }


    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage ) && req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }            

    // if(!avatarLocalPath){
    //     throw new ApiError(400, "Avatar Localpath of file is required")
    // }


    const avatar = await uploadOnCloudinary (avatarLocalPath);
    const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

    // if(!avatar){
    //     throw new ApiError(400, "Avatar file is required") 
    // }

    const user = await User.create({
        fullName,
        avatar:avatar?.url || "",
        coverImage:coverImage?.url || "", 
        email,
        password, 
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError
        (500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

} )


const loginUser = asyncHandler(async (req , res) => {
    //req body -> data
    //username or email 
    //find the user
    //password check
    //acess and refresh token generate
    //send cookies
    // response bhej do ho login ho gaya he karke 

    const{email, username, password} = req.body

    if(!(username || email)){
        throw new ApiError(400,"Userame or password is required" )
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"Beta tune pehle kabhi login nahi kiya he")
    }

    const isPasswordValid  =  await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Kuch galat he , phirse bhar")
    }

    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("acessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            }, 
            "User logged in successfully "
        )
    )

})

    const logoutUser = asyncHandler(async (req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
               $set:{
                refreshToken:undefined
               } 
            },
            {
                new: true
            }
        )

        const options = {
        httpOnly:true,
        secure: true,
        }

        return res 
        .status(200)
        .clearCookie("acessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{}, "User logged out successfully "))

    })

    const refreshAccessToken = asyncHandler(async (req, res) => {
        const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

        if(!incomingRefreshToken){
            throw new ApiError(401 , "Unauthorized request")
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken, 
                process.env.REFRESH_TOKEN_SECRET
            )
    
            const user = User.findById((decodedToken?._id))
    
             if(!user){
                throw new ApiError(401 , "Invalid refresh token")
            }
    
            if(incomingRefreshToken !== user.refreshToken){
                throw new ApiError(401, "Refresh token is expired or used")
            }
    
    
            const options = {
                httpOnly: true, 
                secure: true, 
            }
    
            const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
            return res
            .status(200)
            .cookie("acessToken",accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {accessToken, refreshToken:newRefreshToken}, 
                    "Access token refreshed"
                )
            )
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token")
        }

    })

    const changePassword = asyncHandler(async (req, res) => {
        const {oldPassword, newPassword} = req.body
        const user =  await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
        if(!isPasswordCorrect){
            throw new ApiError(401,"Invalid old password")
        }

        user.password = newPassword
       await user.save({validateBeforeSave:false})

        return res
        .status(200)
        .json(new ApiResponse(200,{}, "Password changed successfully"))
    });

    const getCurrentUser = asyncHandler(async(req, res)=> {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        ))
    })

    const updateAccountDetails = asyncHandler(async(req, res )=>{
        const {fullName, email} = req.body

        if(!fullName || !email){
            throw new ApiError(400,"All fields are required")
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName ,
                    email: email,

                }
            },
            {new:true} // ye karne se details update dikhana chahiye
        ).select("-password")


        return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfuly"))
    })

    const updateUserAvatar = asyncHandler(async(req, res) =>{
        const avatarLocalPath = req.file?.path
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file is missing ")
        }
        //TODO: delete old image 

        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if(avatar.url){
            throw new ApiError(400, "Error while uploading on cloudinary")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar :avatar.url
                }
            },
            {new:true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"CAvatar Updated")
        )


    })
    const updateUserCoverImage = asyncHandler(async(req, res) =>{
        const coverImageLocalPath = req.file?.path
        if(!coverImageLocalPath){
            throw new ApiError(400,"Cover image file is missing  ")
        }
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if(coverImage.url){
            throw new ApiError(400, "Error while uploading on cloudinary")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage :coverImage.url
                }
            },
            {new:true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"Cover Image Updated")
        )


    })


    const getUserChannelProfile = asyncHandler(async(req, res) =>{
        const {username } = req.params

        if(!username?.trim()){
            throw new ApiError(400,"Username is missing")
        }

        const channel = User.aggregate([
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    subscibersCount:{
                        $size:"$subscribers"
                    },
                    channelsSubscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    iSSubscribed:{
                        $cond:{
                            if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                            then:true,
                            else: false,
                        }
                    }
                }
            },
            {
                $project:{
                    fullName:1,
                    username:1,
                    subscibersCount:1,
                    channelsSubscribedToCount:1,
                    iSSubscribed:1,
                    avatar:1,
                    email:1,
                    coverImage:1 ,

                }
            }
        ])

    if(!channel?.length){
        throw new ApiError(404, "Channel doesnt exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0],"User channel fetched successfully")
    )

    })          

    const getwatchHistory = asyncHandler(async(req, res) => {

        // req.user._id  // isse kya milega id -> X , string milta he but mongoose in the back isko convert kar deti he koi id me 
        const user = await User.aggregate([
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(String(req.user._id))
                }
            },
            { 
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory  ",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:{
                                    $project:{
                                        fullName:1,username:1,
                                        avatar:1 ,
                                    }
                                }
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])


        return res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully"
        ))
    

    })


    


export {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile, 
    getwatchHistory,

}