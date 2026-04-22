const User = require("../modals/user-modals");
const Booking = require("../modals/booking-modals");
const Review = require("../modals/review-modals");

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

// Get dashboard statistics
const getDashboardStats = async (req, res, next) => {
    try {
        // Get current date for monthly calculations
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Total Users (all roles)
        const totalUsers = await User.countDocuments();
        const lastMonthUsers = await User.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const thisMonthUsers = await User.countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });
        const userGrowth = lastMonthUsers > 0 
            ? Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
            : 0;

        // Active Bookings (confirmed, on_the_way, arrived, service_started, service_completed)
        const activeBookings = await Booking.countDocuments({
            status: { $in: ['confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed'] }
        });
        const lastMonthActiveBookings = await Booking.countDocuments({
            status: { $in: ['confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed'] },
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const bookingGrowth = lastMonthActiveBookings > 0
            ? Math.round(((activeBookings - lastMonthActiveBookings) / lastMonthActiveBookings) * 100)
            : 0;

        // Pending Verifications
        const pendingVerifications = await User.countDocuments({
            isApproved: false,
            isRejected: false,
            userType: { $in: ['nurse', 'caregiver', 'caretaker'] }
        });
        const lastMonthPending = await User.countDocuments({
            isApproved: false,
            isRejected: false,
            userType: { $in: ['nurse', 'caregiver', 'caretaker'] },
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const pendingChange = pendingVerifications - lastMonthPending;

        // Monthly Revenue (sum of completed bookings this month)
        const completedBookings = await Booking.find({
            status: 'completed_confirmed',
            updatedAt: { $gte: firstDayOfMonth }
        });
        const monthlyRevenue = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        
        const lastMonthCompletedBookings = await Booking.find({
            status: 'completed_confirmed',
            updatedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const lastMonthRevenue = lastMonthCompletedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        const revenueGrowth = lastMonthRevenue > 0
            ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
            : 0;

        // Flagged Incidents (bookings with issues - for now using cancelled bookings as proxy)
        const flaggedIncidents = await Booking.countDocuments({
            status: 'cancelled'
        });
        const lastMonthFlagged = await Booking.countDocuments({
            status: 'cancelled',
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const flaggedChange = lastMonthFlagged - flaggedIncidents;

        // Growth Rate (based on new user registrations)
        const totalBookings = await Booking.countDocuments();
        const completedCount = await Booking.countDocuments({ status: 'completed_confirmed' });
        const growthRate = totalBookings > 0
            ? ((completedCount / totalBookings) * 100).toFixed(1)
            : 0;

        // Recent Activity (last 5 activities)
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .select('fullName userType isApproved createdAt');

        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .populate('patient', 'fullName')
            .select('patient status createdAt');

        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(1)
            .populate('reviewer', 'fullName')
            .select('reviewer rating createdAt');

        const activities = [];

        // Add user activities
        recentUsers.forEach(user => {
            activities.push({
                type: 'verification',
                user: user.fullName,
                action: user.isApproved 
                    ? `${user.userType} verification approved`
                    : `${user.userType} verification pending`,
                time: getRelativeTime(user.createdAt)
            });
        });

        // Add booking activities
        recentBookings.forEach(booking => {
            activities.push({
                type: 'booking',
                user: booking.patient?.fullName || 'Unknown',
                action: `New booking created - ${booking.status}`,
                time: getRelativeTime(booking.createdAt)
            });
        });

        // Add review activities
        recentReviews.forEach(review => {
            activities.push({
                type: 'payment',
                user: review.reviewer?.fullName || 'Anonymous',
                action: `Review submitted - ${review.rating} stars`,
                time: getRelativeTime(review.createdAt)
            });
        });

        // Sort by time and limit to 5
        activities.sort((a, b) => {
            const timeA = parseRelativeTime(a.time);
            const timeB = parseRelativeTime(b.time);
            return timeA - timeB;
        });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers: {
                    value: totalUsers,
                    change: userGrowth > 0 ? `+${userGrowth}%` : `${userGrowth}%`
                },
                activeBookings: {
                    value: activeBookings,
                    change: bookingGrowth > 0 ? `+${bookingGrowth}%` : `${bookingGrowth}%`
                },
                pendingVerifications: {
                    value: pendingVerifications,
                    change: pendingChange > 0 ? `+${pendingChange}` : `${pendingChange}`
                },
                monthlyRevenue: {
                    value: monthlyRevenue,
                    change: revenueGrowth > 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`
                },
                flaggedIncidents: {
                    value: flaggedIncidents,
                    change: flaggedChange > 0 ? `+${flaggedChange}` : `${flaggedChange}`
                },
                growthRate: {
                    value: growthRate,
                    change: '+2.3%' // Placeholder for comparison
                }
            },
            recentActivity: activities.slice(0, 5)
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        next(error);
    }
};

// Helper function to get relative time
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
}

// Helper to parse relative time for sorting
function parseRelativeTime(timeStr) {
    if (timeStr === 'just now') return 0;
    const match = timeStr.match(/(\d+)\s+(min|hour|day)/);
    if (!match) return 999999;
    const [, num, unit] = match;
    const multipliers = { min: 1, hour: 60, day: 1440 };
    return parseInt(num) * multipliers[unit];
}

// Get all reviews for admin panel
const getAllReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find()
            .populate('reviewer', 'fullName userType')
            .populate('reviewee', 'fullName userType')
            .populate('booking', 'status')
            .sort({ createdAt: -1 });

        const formattedReviews = reviews.map(review => ({
            _id: review._id,
            reviewer: {
                id: review.reviewer?._id,
                name: review.reviewer?.fullName || 'Anonymous',
                type: review.reviewer?.userType || 'unknown'
            },
            reviewee: {
                id: review.reviewee?._id,
                name: review.reviewee?.fullName || 'Unknown',
                type: review.reviewee?.userType || 'unknown'
            },
            rating: review.rating,
            reviewText: review.reviewText || '',
            categories: review.categories || {},
            bookingId: review.booking?._id,
            bookingStatus: review.booking?.status || 'unknown',
            createdAt: review.createdAt,
            updatedAt: review.updatedAt
        }));

        res.status(200).json({
            success: true,
            count: formattedReviews.length,
            reviews: formattedReviews
        });
    } catch (error) {
        console.error('Get all reviews error:', error);
        next(error);
    }
};

// Get all bookings for admin panel
const getAllBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .populate('patient', 'fullName email phone')
            .populate('caregiver', 'fullName email phone userType')
            .sort({ createdAt: -1 });

        const formattedBookings = bookings.map(booking => ({
            _id: booking._id,
            bookingId: `BK-${booking._id.toString().slice(-8).toUpperCase()}`,
            patient: {
                id: booking.patient?._id,
                name: booking.patient?.fullName || 'Unknown',
                email: booking.patient?.email || '',
                phone: booking.patient?.phone || ''
            },
            caregiver: {
                id: booking.caregiver?._id,
                name: booking.caregiver?.fullName || 'Not Assigned',
                email: booking.caregiver?.email || '',
                phone: booking.caregiver?.phone || '',
                type: booking.caregiver?.userType || 'caregiver'
            },
            serviceType: booking.serviceType || 'N/A',
            date: booking.date,
            time: booking.time,
            duration: booking.duration,
            location: booking.location || 'N/A',
            status: booking.status,
            amount: booking.amount || 0,
            paymentMethod: booking.paymentMethod || 'N/A',
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            patientReviewSubmitted: booking.patientReviewSubmitted || false,
            caregiverReviewSubmitted: booking.caregiverReviewSubmitted || false
        }));

        res.status(200).json({
            success: true,
            count: formattedBookings.length,
            bookings: formattedBookings
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        next(error);
    }
};

// Get payment statistics and transactions for admin panel
const getPaymentStats = async (req, res, next) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Total Revenue (all completed bookings)
        const completedBookings = await Booking.find({ 
            status: 'completed_confirmed' 
        });
        const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        // Pending Payouts (service_completed but not yet confirmed)
        const pendingBookings = await Booking.find({ 
            status: { $in: ['service_completed', 'on_the_way', 'arrived', 'service_started'] }
        });
        const pendingPayouts = pendingBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        // Completed Payouts (completed_confirmed bookings)
        const completedPayouts = totalRevenue; // Same as total revenue for now

        // This Month Revenue
        const thisMonthBookings = await Booking.find({
            status: 'completed_confirmed',
            updatedAt: { $gte: firstDayOfMonth }
        });
        const thisMonthRevenue = thisMonthBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        // Recent Transactions (last 20 bookings with payment info)
        const recentBookings = await Booking.find()
            .populate('patient', 'fullName')
            .populate('caregiver', 'fullName')
            .sort({ createdAt: -1 })
            .limit(20);

        const transactions = recentBookings.map(booking => {
            // Determine if it's a payment (from patient) or payout (to caregiver)
            const isCompleted = booking.status === 'completed_confirmed';
            
            return {
                _id: booking._id,
                transactionId: `TXN-${booking._id.toString().slice(-8).toUpperCase()}`,
                bookingId: `BK-${booking._id.toString().slice(-8).toUpperCase()}`,
                patient: booking.patient?.fullName || 'Unknown',
                caregiver: booking.caregiver?.fullName || 'Not Assigned',
                serviceType: booking.serviceType,
                amount: booking.amount || 0,
                paymentMethod: booking.paymentMethod || 'N/A',
                status: booking.status,
                isCompleted: isCompleted,
                date: booking.date,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue: totalRevenue,
                pendingPayouts: pendingPayouts,
                completedPayouts: completedPayouts,
                thisMonthRevenue: thisMonthRevenue
            },
            transactions: transactions
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        next(error);
    }
};

module.exports = { 
    getAllUser,  
    deleteUserById,
    GetUserById,
    UpdateUserById,
    getPendingUsers,
    approveUser,
    rejectUser,
    getUserDetailsForVerification,
    getDashboardStats,
    getAllReviews,
    getAllBookings,
    getPaymentStats
};
