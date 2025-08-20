const mongoose=require("mongoose")
const eventSchema=new mongoose.Schema({
    teamName:String,
    lead:Object,
    members:Array,
    upiId:String,
    transtationId:String,
    imgUrl:String,
    verified:{type:Boolean,default:false},
    ProblemID:Number,
    Score:Number,
    password:String,
    FirstReview:Object,
    SecoundReview:Object,
    ThirdReview:Object,
    SecoundReviewScore:{type:Number,default:0},
    ThirdReviewScore:{type:Number,default:0},
    HuntScore:{type:Number,default:0},
    FeedBack:String,
    FinalScore:Number
})
const Event=mongoose.model("Event",eventSchema)
module.exports=Event;