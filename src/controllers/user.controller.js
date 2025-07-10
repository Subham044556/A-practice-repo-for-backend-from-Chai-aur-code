import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler( async (req , res) => {
    res.status(200).json({
        message:"Subham has sent this"
    })
} )

export {registerUser}