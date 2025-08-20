const mongoose=require("mongoose")
const eventSchema=new mongoose.Schema({
    teamname:String,
    email:String,
    name: String,
    registrationNumber:String,
    room:String,
    type:String,
    lead:Object,
    GroupPic:String,
    teamMembers:Array,
    upiId:String,
    transtationId:String,
    imgUrl:String,
    verified:{type:Boolean,default:false},
    ProblemStatement:String,
    Domain:String,
    GameScore:Number,
    password:String,
    FirstReview:Object,
    SecoundReview:Object,
    ThirdReview:Object,
    FirstReviewScore:{type:Number,default:0},
    SecoundReviewScore:{type:Number,default:0},
    FinalScore:Number,
    Sector:String,
    
    // --- NEW FIELD FOR ISSUES ---
    issues: [{
        text: String,
        status: { type: String, default: 'Pending' },
        timestamp: { type: Date, default: Date.now }
    }]
})
const Event=mongoose.model("innov",eventSchema)
module.exports=Event;

async function data(){
    const teams= await Event.find({})
    let pass=[]
    for (let i of teams){
        const password=i.registrationNumber.slice(-1)+i.teamMembers.map((i)=>{return i.registrationNumber.slice(-1)}).join("")
        if(pass.includes(password)){
            console.log("Ammooooooooooo---------",password,i.teamname)
        }
        else{
        console.log(i.teamname,password)
        i.password=password
        }
        await i.save()
    }
    console.log("done")

}
// data()
