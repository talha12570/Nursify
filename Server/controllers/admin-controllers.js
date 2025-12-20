const User = require("../modals/user-modals");

const getAllUser = async (req, res, next) => {
    try {
        const user = await User.find();
        if (!user || user === 0) {
            res.status(200).json({ message: "No User Found" });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

const deleteUserById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const user = await User.deleteOne({ _id: id });

        if (!user) {
            res.status(200).json({ message: "User Not Found" });
        }
        res.status(200).json({ message: "Deleted Successfull" });
    } catch (error) {
        next(error);
    }
}

const GetUserById =async (req,res,next)=>{
    try{
        const id = req.params.id;
        const data = await User.findOne({_id:id},{password:0});
        res.status(200).json(data);
    }catch(error){
        next(error)
    }

}

const UpdateUserById = async (req,res,next)=>{
    try {
        console.log("called")
        const id=req.params.id;
        const data = req.body;
        const updatedData =await User.findOneAndUpdate(
            {_id:id},
            {$set:data}
        )
        if(updatedData.nModfied === 0){
            res.status(200).json({message:"User Not Found or data isthe same as before"})
        }
        res.status(200).json(updatedData);
        console.log("updatedData",updatedData)
    } catch (error) {
        console.log("error=>",error)
        next(error);
    }
}

// Get all pending users (nurses and caretakers awaiting approval)
const getPendingUsers = async (req, res, next) => {
    try {
        const pendingUsers = await User.find({
            isApproved: false,
            isVerified: true,
            userType: { $in: ['nurse', 'caretaker'] }
        }).select('-password').sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers
        });
    } catch (error) {
        next(error);
    }
}

// Approve a user (nurse or caretaker)
const approveUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id; // From auth middleware
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        if (user.isApproved) {
            return res.status(400).json({ message: "User is already approved" });
        }
        
        if (user.userType === 'patient') {
            return res.status(400).json({ message: "Patients are auto-approved" });
        }
        
        user.isApproved = true;
        user.isRejected = false;
        user.approvedAt = new Date();
        user.approvedBy = adminId;
        user.rejectionReason = undefined;
        
        await user.save();
        
        res.status(200).json({
            success: true,
            message: `${user.userType} approved successfully`,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType: user.userType,
                isApproved: user.isApproved
            }
        });
    } catch (error) {
        next(error);
    }
}

// Reject a user with reason
const rejectUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ message: "Rejection reason is required" });
        }
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        if (user.isApproved) {
            return res.status(400).json({ message: "Cannot reject an approved user" });
        }
        
        // Mark as rejected and set reason
        user.isRejected = true;
        user.isApproved = false;
        user.rejectionReason = reason;
        await user.save();
        
        res.status(200).json({
            success: true,
            message: "User rejected",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType: user.userType,
                isRejected: user.isRejected,
                rejectionReason: user.rejectionReason
            }
        });
    } catch (error) {
        next(error);
    }
}

// Get user details with documents for verification
const getUserDetailsForVerification = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { 
    getAllUser,  
    deleteUserById,
    GetUserById,
    UpdateUserById,
    getPendingUsers,
    approveUser,
    rejectUser,
    getUserDetailsForVerification
};
