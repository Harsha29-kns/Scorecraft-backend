const express=require("express")
const router=express.Router()
const bcrypt=require("bcrypt")
const User=require("../modles/user")

router.post("/register",async(req,res)=>{
    const {name,email,password}=req.body
    password=await bcrypt.hash(password,10)
    const user=await User.findOne({email})
    if(user){
        return res.status(400).json({message:"user already exists"})
    }
    await User.create(req.body)
    res.status(201).json({message:"user created successfully"})
})
router.post("/login",async(req,res)=>{
    const {email,password}=req.body;
    const user=await User.findOne({email})
    if (user){
        const correct=await bcrypt.compare(password,user.password)
        if(correct){
            res.status(200).json({message:"user loggedin"})
        }else{
            res.status(400).json({message:"invalid password"})
        }
    }else{
        res.status(400).json({message:"user not found"})
    }
})
router.get("/AllUsers",async(req,res)=>{
    const users=await User.find()
    res.status(200).json(users)
})
module.exports=router   