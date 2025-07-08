import multer from "multer";

const storage = multer.diskStorage({
    destination:function(req, file, cb) {
        cb(null,"./public/temp" )
    },
    filename: function (req ,file,cb){
        
        cb(null, file.originalname)//original name lagane se kai baar same naam ke file me confusions 
    
    }
})

export const upload = multer({
    storage, 
})