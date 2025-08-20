const mongoose = require("mongoose");

const RegistrationFormSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email:{
        type:String,
        required:true
    },
    regnum:{
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    upiId: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    transactionPhotoUrl: {
        type: String,
        required: true
    },
    verifyed:{
        type:Boolean,
        default:false
    },
    firstAttd:{
        type:Boolean,
        default:false
    },secAttd:{
        type:Boolean,
        default:false
    },
    hostel:{
        type:String,
    },
    roomNumber:{
        type:String
    },
});

module.exports = mongoose.model("RegistrationForm", RegistrationFormSchema);
