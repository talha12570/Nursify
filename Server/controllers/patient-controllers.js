const Caregiver = require("../modals/caregiver-modals");
const Service = require("../modals/service-modals");
const User = require("../modals/user-modals");
const Booking = require("../modals/booking-modals");

// Get caregiver by ID with full details
const getCaregiverById = async (req, res, next) => {
    try {
        const { caregiverId } = req.params;

        const caregiver = await User.findOne({
            _id: caregiverId,
            $or: [{ userType: 'nurse' }, { userType: 'caretaker' }],
            isApproved: true,
            isVerified: true
        }).select('-password');

        if (!caregiver) {
            return res.status(404).json({
                success: false,
                message: 'Caregiver not found or not approved'
            });
        }

        // Format caregiver data with all details including profile data
        const caregiverDetails = {
            id: caregiver._id.toString(),
            fullName: caregiver.fullName,
            name: caregiver.fullName,
            email: caregiver.email,
            phone: caregiver.phone,
            role: caregiver.userType === 'nurse' ? 
                (caregiver.licenseNumber?.includes('RN') ? 'Registered Nurse' : 'Licensed Practical Nurse') : 
                'Medical Caregiver',
            specialization: caregiver.specialty || 'General Care',
            rating: 4.8, // TODO: Implement real rating system
            reviews: 0, // TODO: Implement real review count
            image: caregiver.professionalImage || 'https://via.placeholder.com/400',
            verified: caregiver.isVerified,
            isAvailable: true, // TODO: Implement real availability
            userType: caregiver.userType,
            licenseNumber: caregiver.licenseNumber,
            cnicNumber: caregiver.cnicNumber,
            
            // Profile data fields
            workExperience: caregiver.workExperience || null,
            about: caregiver.about || `Experienced ${caregiver.userType} specializing in ${caregiver.specialty || 'general care'}. Dedicated to providing quality healthcare services.`,
            education: caregiver.education || null,
            institution: caregiver.institution || null,
            licenseType: caregiver.licenseType || (caregiver.licenseNumber ? (caregiver.userType === 'nurse' ? 'RN' : 'CNA') : null),
            
            // Service rates
            hourlyRate: caregiver.hourlyRate || null,
            dailyRate: caregiver.dailyRate || null,
            weeklyRate: caregiver.weeklyRate || null,
            monthlyRate: caregiver.monthlyRate || null,
            
            // Additional fields
            languages: ['English', 'Urdu'], // TODO: Add to user schema
            certifications: caregiver.licenseNumber ? 
                [caregiver.userType === 'nurse' ? 'RN License' : 'Certified Caregiver'] : [],
            services: [caregiver.specialty || 'General Care', 'Patient Monitoring', 'Medication Management']
        };

        res.status(200).json({
            success: true,
            caregiver: caregiverDetails
        });
    } catch (error) {
        console.error('Get caregiver by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch caregiver details',
            error: error.message
        });
    }
};

// Add caregiver to favorites
const addFavoriteCaregiver = async (req, res, next) => {
    try {
        const { caregiverId } = req.body;
        const patientId = req.user._id;

        // Check if caregiver exists
        const caregiver = await User.findOne({
            _id: caregiverId,
            $or: [{ userType: 'nurse' }, { userType: 'caretaker' }],
            isApproved: true
        });

        if (!caregiver) {
            return res.status(404).json({
                success: false,
                message: 'Caregiver not found'
            });
        }

        // Add favorite to user's favorites array
        const patient = await User.findById(patientId);
        if (!patient.favorites) {
            patient.favorites = [];
        }

        // Check if already favorited
        if (patient.favorites.includes(caregiverId)) {
            return res.status(400).json({
                success: false,
                message: 'Caregiver already in favorites'
            });
        }

        patient.favorites.push(caregiverId);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Caregiver added to favorites'
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add favorite',
            error: error.message
        });
    }
};

// Remove caregiver from favorites
const removeFavoriteCaregiver = async (req, res, next) => {
    try {
        const { caregiverId } = req.params;
        const patientId = req.user._id;

        const patient = await User.findById(patientId);
        if (!patient.favorites || !patient.favorites.includes(caregiverId)) {
            return res.status(404).json({
                success: false,
                message: 'Caregiver not in favorites'
            });
        }

        patient.favorites = patient.favorites.filter(id => id.toString() !== caregiverId);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Caregiver removed from favorites'
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove favorite',
            error: error.message
        });
    }
};

// Get patient's favorite caregivers
const getFavoriteCaregivers = async (req, res, next) => {
    try {
        const patientId = req.user._id;

        const patient = await User.findById(patientId).populate({
            path: 'favorites',
            select: 'fullName email phone userType specialty professionalImage isVerified'
        });

        if (!patient || !patient.favorites || patient.favorites.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                favorites: []
            });
        }

        // Format favorites
        const formattedFavorites = patient.favorites.map(caregiver => ({
            id: caregiver._id.toString(),
            name: caregiver.fullName,
            role: caregiver.userType === 'nurse' ? 'Registered Nurse' : 'Medical Caregiver',
            specialization: caregiver.specialty || 'General Care',
            rating: 4.8,
            image: caregiver.professionalImage || 'https://via.placeholder.com/200',
            verified: caregiver.isVerified,
            phone: caregiver.phone,
            email: caregiver.email
        }));

        res.status(200).json({
            success: true,
            count: formattedFavorites.length,
            favorites: formattedFavorites
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch favorites',
            error: error.message
        });
    }
};

// Get approved nurses and caretakers for patient dashboard
const getApprovedCaregivers = async (req, res, next) => {
    try {
        const { userType, limit = 10 } = req.query;
        
        const query = {
            $or: [
                { userType: 'nurse' },
                { userType: 'caretaker' }
            ],
            isApproved: true,
            isVerified: true,
            isAvailable: true // Only show available caregivers
        };

        // Filter by specific user type if provided
        if (userType && (userType === 'nurse' || userType === 'caretaker')) {
            query.$or = [{ userType: userType }];
        }

        const caregivers = await User.find(query)
            .select('fullName email phone userType specialty licenseNumber professionalImage')
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Transform data to match frontend expectations
        const formattedCaregivers = caregivers.map(caregiver => ({
            id: caregiver._id.toString(),
            name: caregiver.fullName,
            role: caregiver.userType === 'nurse' ? 
                (caregiver.licenseNumber?.includes('RN') ? 'Registered Nurse' : 'Licensed Practical Nurse') : 
                'Medical Caregiver',
            specialization: caregiver.specialty || 'General Care',
            rating: 4.8, // TODO: Implement real rating system
            reviews: 0, // TODO: Implement real review system
            distance: '2.5 km', // TODO: Implement real distance calculation
            price: 'Rs. 800/hr', // TODO: Implement real pricing
            image: caregiver.professionalImage || 'https://via.placeholder.com/200',
            verified: true,
            email: caregiver.email,
            phone: caregiver.phone
        }));

        res.status(200).json({
            success: true,
            count: formattedCaregivers.length,
            caregivers: formattedCaregivers
        });
    } catch (error) {
        console.error("Error fetching approved caregivers:", error);
        next(error);
    }
};

// Get patient dashboard data
const getDashboardData = async (req, res, next) => {
    try {
        const userId = req.userId; // from auth middleware
        
        // Get user info
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Get quick stats
        const totalCaregivers = await Caregiver.countDocuments({ 
            isApproved: true, 
            isActive: true 
        });

        res.status(200).json({
            success: true,
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                userType: user.userType
            },
            stats: {
                totalCaregivers
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        next(error);
    }
};

// Get quick services
const getQuickServices = async (req, res, next) => {
    try {
        const services = await Service.find({ isActive: true })
            .sort({ displayOrder: 1 })
            .limit(8);

        res.status(200).json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        next(error);
    }
};

// Get nearby caregivers/nurses
const getNearbyCaregivers = async (req, res, next) => {
    try {
        const { 
            latitude, 
            longitude, 
            maxDistance = 10000, // 10km default
            userType, // 'nurse' or 'caretaker'
            specialization,
            minRating,
            limit = 10,
            page = 1
        } = req.query;

        const query = {
            isApproved: true,
            isActive: true,
            verified: true,
            isAvailable: true // Only show available caregivers
        };

        // Filter by user type
        if (userType) {
            query.userType = userType;
        }

        // Filter by specialization
        if (specialization) {
            query.specialization = new RegExp(specialization, 'i');
        }

        // Filter by minimum rating
        if (minRating) {
            query.rating = { $gte: parseFloat(minRating) };
        }

        let caregivers;

        // If location provided, find nearby caregivers
        if (latitude && longitude) {
            caregivers = await Caregiver.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [parseFloat(longitude), parseFloat(latitude)]
                        },
                        distanceField: "distance",
                        maxDistance: parseInt(maxDistance),
                        spherical: true,
                        query: query
                    }
                },
                {
                    $project: {
                        fullName: 1,
                        role: 1,
                        specialization: 1,
                        rating: 1,
                        totalReviews: 1,
                        hourlyRate: 1,
                        profileImage: 1,
                        verified: 1,
                        userType: 1,
                        services: 1,
                        availability: 1,
                        distance: {
                            $divide: ["$distance", 1000] // Convert to km
                        }
                    }
                },
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
            ]);
        } else {
            // If no location, just get top-rated caregivers
            const skip = (parseInt(page) - 1) * parseInt(limit);
            caregivers = await Caregiver.find(query)
                .select('fullName role specialization rating totalReviews hourlyRate profileImage verified userType services availability')
                .sort({ rating: -1, totalReviews: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        }

        // Get total count for pagination
        const totalCount = await Caregiver.countDocuments(query);

        res.status(200).json({
            success: true,
            count: caregivers.length,
            totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            caregivers
        });
    } catch (error) {
        console.error("Error fetching nearby caregivers:", error);
        next(error);
    }
};

// Search caregivers
const searchCaregivers = async (req, res, next) => {
    try {
        const { 
            query: searchQuery,
            limit = 10,
            page = 1
        } = req.query;

        if (!searchQuery || searchQuery.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const filter = {
            isApproved: true,
            isActive: true,
            verified: true,
            isAvailable: true, // Only show available caregivers
            $or: [
                { fullName: new RegExp(searchQuery, 'i') },
                { specialization: new RegExp(searchQuery, 'i') },
                { services: new RegExp(searchQuery, 'i') },
                { role: new RegExp(searchQuery, 'i') }
            ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const caregivers = await Caregiver.find(filter)
            .select('fullName role specialization rating totalReviews hourlyRate profileImage verified userType services availability')
            .sort({ rating: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await Caregiver.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: caregivers.length,
            totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            caregivers
        });
    } catch (error) {
        console.error("Error searching caregivers:", error);
        next(error);
    }
};

// Get caregiver profile details
const getCaregiverProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const caregiver = await Caregiver.findById(id)
            .select('-cnicFront -cnicBack -licensePhoto -experienceImage -experienceLetter');

        if (!caregiver) {
            return res.status(404).json({
                success: false,
                message: "Caregiver not found"
            });
        }

        if (!caregiver.isApproved || !caregiver.isActive) {
            return res.status(403).json({
                success: false,
                message: "Caregiver profile is not available"
            });
        }

        res.status(200).json({
            success: true,
            caregiver
        });
    } catch (error) {
        console.error("Error fetching caregiver profile:", error);
        next(error);
    }
};

// Get featured/top-rated caregivers
const getFeaturedCaregivers = async (req, res, next) => {
    try {
        const { limit = 5, userType } = req.query;

        const query = {
            isApproved: true,
            isActive: true,
            verified: true,
            rating: { $gte: 4.5 } // Only highly rated
        };

        if (userType) {
            query.userType = userType;
        }

        const caregivers = await Caregiver.find(query)
            .select('fullName role specialization rating totalReviews hourlyRate profileImage verified userType services')
            .sort({ rating: -1, totalReviews: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: caregivers.length,
            caregivers
        });
    } catch (error) {
        console.error("Error fetching featured caregivers:", error);
        next(error);
    }
};

// Create a new booking
const createBooking = async (req, res, next) => {
    try {
        console.log('=== Create Booking Request ===');
        console.log('Patient ID:', req.user?._id);
        console.log('Request Body:', req.body);
        
        const patientId = req.user._id;
        const { 
            caregiverId, 
            serviceType, 
            date, 
            time, 
            duration, 
            location, 
            paymentMethod,
            amount 
        } = req.body;

        // Validate required fields
        if (!caregiverId || !serviceType || !date || !time || !duration || amount === undefined || amount === null) {
            console.log('Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'All booking fields are required',
                missing: {
                    caregiverId: !caregiverId,
                    serviceType: !serviceType,
                    date: !date,
                    time: !time,
                    duration: !duration,
                    amount: amount === undefined || amount === null
                }
            });
        }
        
        // Validate amount is a positive number
        if (typeof amount !== 'number' || amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Amount must be a positive number.'
            });
        }

        // Check if caregiver exists and is approved
        const caregiver = await User.findOne({
            _id: caregiverId,
            $or: [{ userType: 'nurse' }, { userType: 'caretaker' }],
            isApproved: true,
            isVerified: true
        });

        if (!caregiver) {
            console.log('Caregiver not found or not approved');
            return res.status(404).json({
                success: false,
                message: 'Caregiver not found or not available'
            });
        }

        console.log('Caregiver found:', caregiver.fullName);
        console.log('Caregiver rates:', {
            hourly: caregiver.hourlyRate,
            daily: caregiver.dailyRate,
            weekly: caregiver.weeklyRate,
            monthly: caregiver.monthlyRate
        });

        // Verify the amount based on caregiver's rates (only if rates are set)
        const durationMap = {
            'hourly': caregiver.hourlyRate,
            'daily': caregiver.dailyRate,
            'weekly': caregiver.weeklyRate,
            'monthly': caregiver.monthlyRate
        };

        const expectedAmount = durationMap[duration];
        // Only validate amount if caregiver has set a rate for this duration
        if (expectedAmount && expectedAmount > 0 && Math.abs(expectedAmount - amount) > 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking amount'
            });
        }

        // If no rate is set, use the provided amount
        const finalAmount = expectedAmount && expectedAmount > 0 ? expectedAmount : amount;

        console.log('Final amount for booking:', finalAmount);

        // Create booking
        const booking = new Booking({
            patient: patientId,
            caregiver: caregiverId,
            serviceType,
            date: new Date(date),
            time,
            duration,
            location: location || 'To be confirmed', // Default for pending bookings
            paymentMethod: paymentMethod || 'cash', // Default payment method
            amount: finalAmount,
            status: req.body.status || 'pending', // Allow status to be set from request
            paymentStatus: (paymentMethod || 'cash') === 'cash' ? 'pending' : 'pending'
        });

        console.log('Saving booking...');
        await booking.save();
        console.log('Booking saved with ID:', booking._id);

        // Populate caregiver and patient details for response
        const populatedBooking = await Booking.findById(booking._id)
            .populate('patient', 'fullName email phone')
            .populate('caregiver', 'fullName email phone userType specialty professionalImage');

        console.log('Booking created successfully');
        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
};

// Get patient's bookings
const getPatientBookings = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const { status, limit = 10, page = 1 } = req.query;

        const query = { patient: patientId };
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bookings = await Booking.find(query)
            .populate('caregiver', 'fullName email phone userType specialty professionalImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await Booking.countDocuments(query);

        res.status(200).json({
            success: true,
            count: bookings.length,
            totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            bookings
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

// Get booking by ID
const getBookingById = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const patientId = req.user._id;

        const booking = await Booking.findOne({
            _id: bookingId,
            patient: patientId
        })
            .populate('patient', 'fullName email phone')
            .populate('caregiver', 'fullName email phone userType specialty professionalImage');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error('Get booking by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
};

// Update booking (e.g., confirm payment)
const updateBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const patientId = req.user._id;
        const { paymentMethod, status } = req.body;

        const booking = await Booking.findOne({
            _id: bookingId,
            patient: patientId
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Update fields if provided
        if (paymentMethod) {
            booking.paymentMethod = paymentMethod;
        }
        
        if (status) {
            // Validate status transitions
            if (booking.status === 'pending' && status === 'confirmed') {
                return res.status(400).json({
                    success: false,
                    message: 'Booking must be approved by caregiver before confirmation'
                });
            }
            
            if (booking.status === 'approved' && status === 'confirmed') {
                booking.status = status;
                booking.paymentStatus = 'paid'; // Mark payment as completed
            } else if (['pending', 'approved', 'in-progress', 'completed'].includes(status)) {
                booking.status = status;
            }
        }

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('caregiver', 'fullName email phone professionalImage')
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
};

// Cancel booking
const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const patientId = req.user._id;
        const { reason } = req.body;

        const booking = await Booking.findOne({
            _id: bookingId,
            patient: patientId
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (booking.status === 'completed' || booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a ${booking.status} booking`
            });
        }

        booking.status = 'cancelled';
        booking.cancelledBy = patientId;
        booking.cancellationReason = reason || 'No reason provided';
        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

// Confirm service completion (patient side)
const confirmServiceCompletion = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const patientId = req.user._id;

        const booking = await Booking.findOne({
            _id: bookingId,
            patient: patientId
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (booking.status !== 'service_completed') {
            return res.status(400).json({
                success: false,
                message: 'Service must be completed by caregiver before patient confirmation'
            });
        }

        booking.status = 'completed_confirmed';
        booking.completedConfirmedAt = new Date();
        booking.completedAt = new Date();
        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('caregiver', 'fullName email phone professionalImage')
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: 'Service completion confirmed successfully',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Confirm service completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm service completion',
            error: error.message
        });
    }
};

module.exports = {
    getCaregiverById,
    addFavoriteCaregiver,
    removeFavoriteCaregiver,
    getFavoriteCaregivers,
    getApprovedCaregivers,
    getDashboardData,
    getQuickServices,
    getNearbyCaregivers,
    searchCaregivers,
    getCaregiverProfile,
    getFeaturedCaregivers,
    createBooking,
    getPatientBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    confirmServiceCompletion
};
