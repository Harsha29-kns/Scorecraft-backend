const mongoose=require("mongoose")
const Event = require("./modles/event")
const env=require("dotenv").config()
const connectDB=async()=>{
    try {
        await mongoose.connect(process.env.URI)
        console.log("connected to db")
    } catch (error) {
        console.log(error)
    }
}
module.exports=connectDB
// async function f(){
// const teams=await Event.find()
// for(let i of teams){
//     const team=await Event.findOne({teamName:i.teamName})
//     team.HuntScore=0
//     await team.save()
// }
// console.log("done")
// }
// f()