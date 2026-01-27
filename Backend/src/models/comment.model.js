import mongoose,{Schema} from "mongoose";

import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema=new Schema(
    {
        content:{
            type:String,
            required:[true,'Comment content cannot be empty'],
            trim:true,
            minlength:[1,'Comment must contain at least 1 character'],
            maxlength:[280,'Comment cannot exceed 280 characters'],
        },
        video:{
            types:Schema.Types.ObjectId,
            ref:'Video',
            required:[true,'Comment must be associated with a video'], 
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:'User',
            required:[true,'Comment owner is required'],
        },
    },
    {
        timestamps:true,
    }
);

commentSchema.plugin(aggregatePaginate);

export const Comment=mongoose.model('Comment',commentSchema);