const User = require("../modals/user-modals");
const Booking = require("../modals/booking-modals");

// Get approved patients for caregiver dashboard
const getApprovedPatients = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        
        const query = {
            userType: 'patient',
            isApproved: true,
            isVerified: true
        };

        const patients = await User.find(query)
            .select('fullName email phone userType')
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Transform data to match frontend expectations (mock job requests from patients)
        const formattedJobRequests = patients.map((patient, index) => ({
            id: patient._id.toString(),
            patient: patient.fullName,
            service: ['ICU Care', 'Elderly Care', 'Wound Care', 'Home Care', 'Post-Surgery Care'][index % 5],
            date: 'Today',
            time: ['3:00 PM', '5:00 PM', '10:00 AM', '2:00 PM', '7:00 PM'][index % 5],
            duration: ['4 hours', '2 hours', '6 hours', '3 hours', '5 hours'][index % 5],
            location: ['DHA Phase 2, Lahore', 'Gulberg, Lahore', 'Model Town, Lahore', 'Johar Town, Lahore', 'Bahria Town, Lahore'][index % 5],
            distance: ['2.3 km', '4.1 km', '1.8 km', '3.5 km', '5.2 km'][index % 5],
            payment: ['Rs. 3,200', 'Rs. 1,600', 'Rs. 2,400', 'Rs. 4,000', 'Rs. 2,800'][index % 5],
            status: 'pending',
            patientEmail: patient.email,
            patientPhone: patient.phone
        }));

        res.status(200).json({
            success: true,
            count: formattedJobRequests.length,
            jobRequests: formattedJobRequests
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
        next(error);
    }
};

// Get caregiver dashboard data
const getDashboardData = async (req, res, next) => {
    try {
        const userId = req.user._id; // from auth middleware
        
        // Update lastActive timestamp for the caregiver
        await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        
        // Get user info
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Get total patients count
        const totalPatients = await User.countDocuments({ 
            userType: 'patient',
            isApproved: true,
            isVerified: true
        });

        res.status(200).json({
            success: true,
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                userType: user.userType,
                specialty: user.specialty,
                licenseNumber: user.licenseNumber,
                professionalImage: user.professionalImage
            },
            stats: {
                totalPatients,
                pendingJobs: 0, // TODO: Implement real booking system
                completedJobs: 0, // TODO: Implement real booking system
                earnings: 0 // TODO: Implement real payment system
            }
        });
    } catch (error) {
        console.error("Error fetching caregiver dashboard data:", error);
        next(error);
    }
};

// Get caregiver profile
const getCaregiverProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Check if profile fields exist
        const hasProfile = user.workExperience || user.about || user.institution || user.licenseType;
        
        if (!hasProfile) {
            return res.status(200).json({
                success: true,
                message: "Profile not set up yet",
                profile: {
                    isAvailable: user.isAvailable !== undefined ? user.isAvailable : true,
                }
            });
        }

        res.status(200).json({
            success: true,
            profile: {
                workExperience: user.workExperience,
                about: user.about,
                education: user.education,
                institution: user.institution,
                licenseType: user.licenseType,
                hourlyRate: user.hourlyRate,
                dailyRate: user.dailyRate,
                weeklyRate: user.weeklyRate,
                monthlyRate: user.monthlyRate,
                isAvailable: user.isAvailable !== undefined ? user.isAvailable : true,
            }
        });
    } catch (error) {
        console.error("Error fetching caregiver profile:", error);
        next(error);
    }
};

// Update caregiver profile
const updateCaregiverProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const {
            workExperience,
            about,
            education,
            institution,
            licenseType,
            hourlyRate,
            dailyRate,
            weeklyRate,
            monthlyRate
        } = req.body;

        // Validate required fields
        if (!about || !workExperience || !institution || !licenseType) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields (about, workExperience, institution, licenseType)"
            });
        }

        // At least one rate must be provided
        if (!hourlyRate && !dailyRate && !weeklyRate && !monthlyRate) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one service rate"
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                workExperience,
                about,
                education,
                institution,
                licenseType,
                hourlyRate: hourlyRate || null,
                dailyRate: dailyRate || null,
                weeklyRate: weeklyRate || null,
                monthlyRate: monthlyRate || null,
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                workExperience: updatedUser.workExperience,
                about: updatedUser.about,
                education: updatedUser.education,
                institution: updatedUser.institution,
                licenseType: updatedUser.licenseType,
                hourlyRate: updatedUser.hourlyRate,
                dailyRate: updatedUser.dailyRate,
                weeklyRate: updatedUser.weeklyRate,
                monthlyRate: updatedUser.monthlyRate,
            }
        });
    } catch (error) {
        console.error("Error updating caregiver profile:", error);
        next(error);
    }
};

// Update availability status
const updateAvailability = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { isAvailable } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "isAvailable must be a boolean value"
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                isAvailable,
                lastActive: new Date() // Update lastActive when toggling availability
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
            isAvailable: updatedUser.isAvailable
        });
    } catch (error) {
        console.error("Error updating availability:", error);
        next(error);
    }
};

// Get bookings for caregiver (filtered by status)
const getCaregiverBookings = async (req, res, next) => {
    try {
        const caregiverId = req.user._id;
        const { status } = req.query;

        const query = { caregiver: caregiverId };
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('patient', 'fullName email phone location')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error("Error fetching caregiver bookings:", error);
        next(error);
    }
};

// Accept a booking request
const acceptBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId 
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot accept booking with status: ${booking.status}`
            });
        }

        // Acceptance should move both sides into live tracking flow immediately.
        booking.status = 'confirmed';
        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: "Booking accepted. Service tracking is now active.",
            booking: populatedBooking
        });
    } catch (error) {
        console.error("Error accepting booking:", error);
        next(error);
    }
};

// Reject a booking request
const rejectBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { reason } = req.body;

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId 
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject booking with status: ${booking.status}`
            });
        }

        booking.status = 'rejected';
        if (reason) {
            booking.cancellationReason = reason;
        }
        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: "Booking rejected",
            booking: populatedBooking
        });
    } catch (error) {
        console.error("Error rejecting booking:", error);
        next(error);
    }
};

// Cancel booking (caregiver side, role-specific rules)
const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        if (booking.caregiver.toString() !== caregiverId.toString() && booking.patient.toString() !== caregiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You are not a party to this booking.'
            });
        }

        if (booking.caregiver.toString() !== caregiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You are not a party to this booking.'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This booking has already been cancelled.'
            });
        }

        if (booking.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'This booking was already rejected.'
            });
        }

        if (booking.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Use the reject action to decline a pending booking request.'
            });
        }

        const hardBlockedStatuses = ['on_the_way', 'arrived', 'service_started', 'service_completed', 'completed_confirmed'];
        if (hardBlockedStatuses.includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot cancel while en route. Please complete the visit.'
            });
        }

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                message: 'A cancellation reason is required.'
            });
        }

        const previousStatus = booking.status;

        booking.status = 'cancelled';
        booking.cancelledBy = 'caregiver';
        booking.cancelledByUser = caregiverId;
        booking.cancelledAt = new Date();
        booking.cancellationReason = String(reason).trim();
        booking.refundStatus = 'not_applicable';
        // Penalty applies only when caregiver cancels an already confirmed booking.
        booking.penaltyFlag = previousStatus === 'confirmed';

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone')
            .populate('caregiver', 'fullName email phone');

        return res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully.',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Error cancelling booking (caregiver):', error);
        next(error);
    }
};

// Update service status (for service lifecycle)
const updateServiceStatus = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { status } = req.body;

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId 
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        // Validate status transitions
        const validTransitions = {
            'approved': ['on_the_way'],
            'confirmed': ['on_the_way'],
            'on_the_way': ['arrived'],
            'arrived': ['service_started'],
            'service_started': ['service_completed'],
        };

        const allowedNextStatuses = validTransitions[booking.status];
        
        if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${booking.status} to ${status}`
            });
        }

        // Update status and set timestamp
        booking.status = status;
        const now = new Date();

        switch(status) {
            case 'on_the_way':
                booking.onTheWayAt = now;
                break;
            case 'arrived':
                booking.arrivedAt = now;
                break;
            case 'service_started':
                booking.serviceStartedAt = now;
                break;
            case 'service_completed':
                booking.serviceCompletedAt = now;
                break;
        }

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone location')
            .populate('caregiver', 'fullName email phone professionalImage');

        res.status(200).json({
            success: true,
            message: "Service status updated successfully",
            booking: populatedBooking
        });
    } catch (error) {
        console.error("Error updating service status:", error);
        next(error);
    }
};

// Get caregiver earnings
const getCaregiverEarnings = async (req, res, next) => {
    try {
        const caregiverId = req.user._id;
        const { period = 'today' } = req.query; // today, week, month, all

        let dateFilter = {};
        const now = new Date();

        switch(period) {
            case 'today':
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                dateFilter = { completedConfirmedAt: { $gte: startOfDay } };
                break;
            case 'week':
                const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFilter = { completedConfirmedAt: { $gte: startOfWeek } };
                break;
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFilter = { completedConfirmedAt: { $gte: startOfMonth } };
                break;
            case 'all':
                dateFilter = {};
                break;
        }

        // Get completed and confirmed bookings
        const completedBookings = await Booking.find({
            caregiver: caregiverId,
            status: 'completed_confirmed',
            ...dateFilter
        }).populate('patient', 'fullName');

        // Calculate totals
        const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        const totalJobs = completedBookings.length;
        
        // Calculate total hours (assuming 1 hour per booking if not specified)
        const totalHours = completedBookings.reduce((sum, booking) => {
            // Extract hours from duration or default to 1
            if (booking.serviceStartedAt && booking.serviceCompletedAt) {
                const duration = (booking.serviceCompletedAt - booking.serviceStartedAt) / (1000 * 60 * 60);
                return sum + duration;
            }
            return sum + 1; // default 1 hour
        }, 0);

        res.status(200).json({
            success: true,
            period,
            earnings: {
                total: Math.round(totalEarnings),
                jobs: totalJobs,
                hours: Math.round(totalHours * 10) / 10 // round to 1 decimal
            },
            bookings: completedBookings.map(b => ({
                id: b._id,
                patient: b.patient?.fullName || 'N/A',
                serviceType: b.serviceType,
                date: b.date,
                amount: b.amount,
                completedAt: b.completedConfirmedAt
            }))
        });
    } catch (error) {
        console.error("Error fetching caregiver earnings:", error);
        next(error);
    }
};

// Heartbeat endpoint to update lastActive (and optionally location)
const updateHeartbeat = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { latitude, longitude, accuracy } = req.body;

        const update = { lastActive: new Date() };

        // Persist caregiver's GPS position if provided so distance queries work
        if (
            latitude !== undefined &&
            longitude !== undefined &&
            !isNaN(parseFloat(latitude)) &&
            !isNaN(parseFloat(longitude))
        ) {
            update.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            };
            update.locationUpdatedAt = new Date();

            const parsedAccuracy = parseFloat(accuracy);
            if (Number.isFinite(parsedAccuracy)) {
                update.locationAccuracy = parsedAccuracy;
            }
        }

        await User.findByIdAndUpdate(userId, update);

        res.status(200).json({
            success: true,
            message: 'Activity updated',
        });
    } catch (error) {
        console.error('Error updating heartbeat:', error);
        next(error);
    }
};

// Explicit endpoint to update caregiver location continuously.
const updateLocation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { latitude, longitude } = req.body;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required numeric values.',
            });
        }

        await User.findByIdAndUpdate(userId, {
            lastActive: new Date(),
            location: {
                type: 'Point',
                coordinates: [lng, lat],
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Location updated successfully.',
        });
    } catch (error) {
        console.error('Error updating caregiver location:', error);
        next(error);
    }
};

module.exports = {
    getApprovedPatients,
    getDashboardData,
    getCaregiverProfile,
    updateCaregiverProfile,
    updateAvailability,
    getCaregiverBookings,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    updateServiceStatus,
    getCaregiverEarnings,
    updateHeartbeat,
    updateLocation
};
