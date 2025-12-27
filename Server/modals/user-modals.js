// const { type } = require("@testing-library/user-event/dist/type");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



const SignUp = new mongoose.Schema({

    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    userType: {
        type: String,
        enum: ['patient', 'nurse', 'caretaker'],
        default: 'patient'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isRejected: {
        type: Boolean,
        default: false
    },
    isAdmin:{
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    // CNIC fields (all users)
    cnicNumber: {
        type: String,
        required: false,
        sparse: true,
        index: true
    },
    cnicFront: {
        type: String,
        required: false
    },
    cnicBack: {
        type: String,
        required: false
    },
    // Nurse/Caretaker fields
    specialty: {
        type: String,
        required: false
    },
    // Nurse only fields
    licenseNumber: {
        type: String,
        required: false,
        sparse: true,
        index: true
    },
    licensePhoto: {
        type: String,
        required: false
    },
    experienceLetter: {
        type: String,
        required: false
    },
    // Caretaker only field
    experienceImage: {
        type: String,
        required: false
    },
    // Professional personal image (for nurses and caretakers)
    professionalImage: {
        type: String,
        required: false
    },
    // Patient optional field
    medicalRecord: {
        type: String,
        required: false
    },
    // Admin review fields
    rejectionReason: {
        type: String,
        required: false
    },
    approvedAt: {
        type: Date,
        required: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signup',
        required: false
    },
    // Patient favorites (for saving favorite caregivers)
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signup'
    }],
    // Caregiver profile fields
    workExperience: {
        type: String,
        required: false
    },
    about: {
        type: String,
        required: false
    },
    education: {
        type: String,
        required: false
    },
    institution: {
        type: String,
        required: false
    },
    licenseType: {
        type: String,
        required: false
    },
    // Service rates
    hourlyRate: {
        type: Number,
        required: false
    },
    dailyRate: {
        type: Number,
        required: false
    },
    weeklyRate: {
        type: Number,
        required: false
    },
    monthlyRate: {
        type: Number,
        required: false
    },
    // Availability status (for caregivers)
    isAvailable: {
        type: Boolean,
        default: true // Default to available when account is created
    }
}, {
    timestamps: true
});



SignUp.pre('save', async function () {
    const user = this;

    // If password is not modified, move on
    if (!user.isModified('password')) return;

    const saltRound = await bcrypt.genSalt(10);
    const hash_password = await bcrypt.hash(user.password, saltRound);
    user.password = hash_password;
});

    SignUp.methods.comparePassword = async function(password){
        return  bcrypt.compare(password,this.password);
    }

    SignUp.methods.generateToken =async function(){
    try {
        return jwt.sign({
            user_id:this._id.toString(),
            email:this.email,
            isAdmin:this.isAdmin,
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn:"30d"
        }
    );
    } catch (error) {
        console.log(error);
    }

};



const Signup = new mongoose.model('Signup',SignUp);

module.exports = Signup;