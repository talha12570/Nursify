const Service = require("../modals/service-modals");
const User = require("../modals/user-modals");
const Booking = require("../modals/booking-modals");
const { processBookingRefund } = require('./payment-controller');
const { cache, getOrSet, invalidatePattern } = require("../utils/cache");

const DEFAULT_NEARBY_RADIUS_KM = 10;

const toFloatOrNull = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Great-circle distance in KM. Used when patient coordinates are available.
const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
};

const formatCaregiverForList = (caregiver, distanceKm = null) => ({
    id: caregiver._id.toString(),
    name: caregiver.fullName,
    role:
        caregiver.userType === 'nurse'
            ? caregiver.licenseNumber?.includes('RN')
                ? 'Registered Nurse'
                : 'Licensed Practical Nurse'
            : 'Medical Caregiver',
    specialization: caregiver.specialty || 'General Care',
    rating: caregiver.rating || 4.8,
    reviews: caregiver.totalReviews || 0,
    distanceKm,
    distanceLabel: distanceKm != null ? `${distanceKm} km` : null,
    availabilityStatus: caregiver.isAvailable ? 'available' : 'unavailable',
    isAvailable: caregiver.isAvailable,
    price: caregiver.hourlyRate ? `Rs. ${caregiver.hourlyRate}/hr` : 'Rs. 800/hr',
    image: caregiver.professionalImage || 'https://via.placeholder.com/200',
    verified: caregiver.isVerified,
    email: caregiver.email,
    phone: caregiver.phone,
    lastActive: caregiver.lastActive,
    userType: caregiver.userType,
    location: caregiver.location,
    latitude:
        Array.isArray(caregiver.location?.coordinates) && caregiver.location.coordinates.length >= 2
            ? caregiver.location.coordinates[1]
            : null,
    longitude:
        Array.isArray(caregiver.location?.coordinates) && caregiver.location.coordinates.length >= 2
            ? caregiver.location.coordinates[0]
            : null,
});

const fetchNearbyAvailableCaregivers = async ({
    userType,
    latitude,
    longitude,
    radiusKm,
    limit,
    onlyNurses = false,
}) => {
    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const baseQuery = {
        isApproved: true,
        isVerified: true,
        isAvailable: true,
        lastActive: { $gte: ninetySecondsAgo },
        locationUpdatedAt: { $gte: twoMinutesAgo },
        locationAccuracy: { $lte: 80 },
    };

    if (onlyNurses) {
        baseQuery.userType = 'nurse';
    } else if (userType && (userType === 'nurse' || userType === 'caretaker')) {
        baseQuery.userType = userType;
    } else {
        baseQuery.userType = { $in: ['nurse', 'caretaker'] };
    }

    const caregivers = await User.find(baseQuery)
        .select(
            'fullName email phone userType specialty licenseNumber professionalImage lastActive hourlyRate rating totalReviews isApproved isVerified isAvailable location'
        )
        .limit(Math.max(limit * 3, 50));

    const hasPatientLocation = latitude != null && longitude != null;

    const rows = caregivers
        .map((caregiver) => {
            if (!hasPatientLocation) {
                return {
                    caregiver,
                    distanceKm: null,
                };
            }

            const coords = caregiver.location?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) {
                return null;
            }

            const caregiverLng = toFloatOrNull(coords[0]);
            const caregiverLat = toFloatOrNull(coords[1]);
            if (caregiverLat == null || caregiverLng == null) {
                return null;
            }

            if (caregiverLat === 0 && caregiverLng === 0) {
                return null;
            }

            const distanceKm = haversineDistanceKm(
                latitude,
                longitude,
                caregiverLat,
                caregiverLng
            );

            return {
                caregiver,
                distanceKm,
            };
        })
        .filter(Boolean)
        .filter((row) => row.distanceKm == null || row.distanceKm <= radiusKm)
        .sort((a, b) => {
            if (a.distanceKm == null && b.distanceKm == null) {
                return new Date(b.caregiver.lastActive) - new Date(a.caregiver.lastActive);
            }
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
        })
        .slice(0, limit)
        .map((row) => formatCaregiverForList(row.caregiver, row.distanceKm));

    return {
        caregivers: rows,
        hasPatientLocation,
        radiusKm,
    };
};

// Get caregiver by ID with full details (cached for 5 minutes)
const getCaregiverById = async (req, res, next) => {
    try {
        const { caregiverId } = req.params;
        const cacheKey = `caregiver:${caregiverId}`;

        const { data: caregiverDetails, fromCache } = await getOrSet(
            cacheKey,
            async () => {
                const caregiver = await User.findOne({
                    _id: caregiverId,
                    $or: [{ userType: 'nurse' }, { userType: 'caretaker' }],
                    isApproved: true,
                    isVerified: true
                }).select('-password').lean();

                if (!caregiver) {
                    return null;
                }

                // Format caregiver data with all details including profile data
                return {
                    id: caregiver._id.toString(),
                    fullName: caregiver.fullName,
                    name: caregiver.fullName,
                    email: caregiver.email,
                    phone: caregiver.phone,
                    role: caregiver.userType === 'nurse' ? 
                        (caregiver.licenseNumber?.includes('RN') ? 'Registered Nurse' : 'Licensed Practical Nurse') : 
                        'Medical Caregiver',
                    specialization: caregiver.specialty || 'General Care',
                    rating: caregiver.rating || 0,
                    reviews: caregiver.totalReviews || 0,
                    totalReviews: caregiver.totalReviews || 0,
                    image: caregiver.professionalImage || 'https://via.placeholder.com/400',
                    verified: caregiver.isVerified,
                    isAvailable: true,
                    userType: caregiver.userType,
                    licenseNumber: caregiver.licenseNumber,
                    cnicNumber: caregiver.cnicNumber,
                    workExperience: caregiver.workExperience || null,
                    about: caregiver.about || `Experienced ${caregiver.userType} specializing in ${caregiver.specialty || 'general care'}. Dedicated to providing quality healthcare services.`,
                    education: caregiver.education || null,
                    institution: caregiver.institution || null,
                    licenseType: caregiver.licenseType || (caregiver.licenseNumber ? (caregiver.userType === 'nurse' ? 'RN' : 'CNA') : null),
                    hourlyRate: caregiver.hourlyRate || null,
                    dailyRate: caregiver.dailyRate || null,
                    weeklyRate: caregiver.weeklyRate || null,
                    monthlyRate: caregiver.monthlyRate || null,
                    languages: ['English', 'Urdu'],
                    certifications: caregiver.licenseNumber ? 
                        [caregiver.userType === 'nurse' ? 'RN License' : 'Certified Caregiver'] : [],
                    services: [caregiver.specialty || 'General Care', 'Patient Monitoring', 'Medication Management']
                };
            },
            300  // Cache for 5 minutes
        );

        if (!caregiverDetails) {
            return res.status(404).json({
                success: false,
                message: 'Caregiver not found or not approved'
            });
        }

        res.status(200).json({
            success: true,
            caregiver: caregiverDetails,
            cached: fromCache
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
        const userType = req.query.userType;
        const limit = toPositiveInt(req.query.limit, 20);
        const latitude =
            toFloatOrNull(req.query.lat) ?? toFloatOrNull(req.query.latitude);
        const longitude =
            toFloatOrNull(req.query.lng) ?? toFloatOrNull(req.query.longitude);

        const radiusKmFromM =
            toFloatOrNull(req.query.maxDistanceM) != null
                ? toFloatOrNull(req.query.maxDistanceM) / 1000
                : null;
        const radiusKm =
            toFloatOrNull(req.query.radiusKm) ?? radiusKmFromM ?? DEFAULT_NEARBY_RADIUS_KM;

        const { caregivers, hasPatientLocation } = await fetchNearbyAvailableCaregivers({
            userType,
            latitude,
            longitude,
            radiusKm,
            limit,
        });

        res.status(200).json({
            success: true,
            count: caregivers.length,
            locationFiltered: hasPatientLocation,
            radiusKm,
            caregivers,
        });
    } catch (error) {
        console.error('Error fetching approved caregivers:', error);
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

// Get quick services (cached for 10 minutes)
const getQuickServices = async (req, res, next) => {
    try {
        const cacheKey = 'services:quick';
        const { data: services, fromCache } = await getOrSet(
            cacheKey,
            async () => {
                return await Service.find({ isActive: true })
                    .sort({ displayOrder: 1 })
                    .limit(8)
                    .lean();  // Use lean() for better performance
            },
            600  // Cache for 10 minutes
        );

        res.status(200).json({
            success: true,
            count: services.length,
            services,
            cached: fromCache
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        next(error);
    }
};

// Get nearby caregivers/nurses
const getNearbyCaregivers = async (req, res, next) => {
    try {
        const userType = req.query.userType;
        const latitude =
            toFloatOrNull(req.query.lat) ?? toFloatOrNull(req.query.latitude);
        const longitude =
            toFloatOrNull(req.query.lng) ?? toFloatOrNull(req.query.longitude);
        const radiusKm =
            toFloatOrNull(req.query.radiusKm) ??
            (toFloatOrNull(req.query.maxDistance) != null
                ? toFloatOrNull(req.query.maxDistance) / 1000
                : DEFAULT_NEARBY_RADIUS_KM);
        const limit = toPositiveInt(req.query.limit, 20);

        const { caregivers, hasPatientLocation } = await fetchNearbyAvailableCaregivers({
            userType,
            latitude,
            longitude,
            radiusKm,
            limit,
        });

        res.status(200).json({
            success: true,
            count: caregivers.length,
            locationFiltered: hasPatientLocation,
            radiusKm,
            caregivers
        });
    } catch (error) {
        console.error("Error fetching nearby caregivers:", error);
        next(error);
    }
};

// Dedicated endpoint requested by product: nearby available nurses only.
const getNearbyNurses = async (req, res, next) => {
    try {
        const latitude =
            toFloatOrNull(req.query.lat) ?? toFloatOrNull(req.query.latitude);
        const longitude =
            toFloatOrNull(req.query.lng) ?? toFloatOrNull(req.query.longitude);
        const radiusKm =
            toFloatOrNull(req.query.radiusKm) ?? DEFAULT_NEARBY_RADIUS_KM;
        const limit = toPositiveInt(req.query.limit, 20);

        if (latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'lat and lng are required query params.',
            });
        }

        const { caregivers } = await fetchNearbyAvailableCaregivers({
            onlyNurses: true,
            latitude,
            longitude,
            radiusKm,
            limit,
        });

        return res.status(200).json({
            success: true,
            count: caregivers.length,
            radiusKm,
            nurses: caregivers,
        });
    } catch (error) {
        console.error('Error fetching nearby nurses:', error);
        next(error);
    }
};

const searchNurses = async (req, res, next) => {
    try {
        const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
        const {
            query: searchQuery,
            limit = 20,
            page = 1,
        } = req.query;

        if (!searchQuery || searchQuery.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
        }

        const escapedQuery = escapeRegex(searchQuery.trim());
        const parsedLimit = Math.min(toPositiveInt(limit, 20), 50);
        const parsedPage = toPositiveInt(page, 1);
        const skip = (parsedPage - 1) * parsedLimit;

        // Availability MUST be applied first: only currently online/active nurses.
        const onlineAvailabilityFilter = {
            isAvailable: true,
            lastActive: { $gte: ninetySecondsAgo },
            status: { $not: /^(offline|unavailable)$/i },
            availabilityStatus: { $not: /^(offline|unavailable)$/i },
        };

        const searchMatchFilter = {
            $or: [
                { fullName: new RegExp(escapedQuery, 'i') },
                { specialty: new RegExp(escapedQuery, 'i') },
                { specialization: new RegExp(escapedQuery, 'i') },
            ],
        };

        const filter = {
            userType: 'nurse',
            isApproved: true,
            isVerified: true,
            $and: [
                onlineAvailabilityFilter,
                searchMatchFilter,
            ],
        };

        const nurses = await User.find(filter)
            .select(
                'fullName email phone userType specialty licenseNumber professionalImage lastActive hourlyRate rating totalReviews isApproved isVerified isAvailable status availabilityStatus location'
            )
            .sort({ rating: -1, totalReviews: -1, lastActive: -1 })
            .skip(skip)
            .limit(parsedLimit);

        const totalCount = await User.countDocuments(filter);
        const formattedNurses = nurses.map((nurse) => formatCaregiverForList(nurse));

        res.status(200).json({
            success: true,
            count: formattedNurses.length,
            totalCount,
            page: parsedPage,
            totalPages: Math.ceil(totalCount / parsedLimit),
            nurses: formattedNurses,
            caregivers: formattedNurses,
        });
    } catch (error) {
        console.error('Error searching nurses:', error);
        next(error);
    }
};

// Backward-compatible alias for existing clients
const searchCaregivers = (req, res, next) => searchNurses(req, res, next);

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

// ── Booking Helpers ──────────────────────────────────────────────────────────

/**
 * Compute end datetime from a start datetime and booking duration.
 * hourly  → +1 h   (single nurse visit)
 * daily   → +8 h   (one full shift)
 * weekly  → +7 d
 * monthly → +30 d
 */
const computeEndDateTime = (startDateTime, duration) => {
    const end = new Date(startDateTime);
    switch (duration) {
        case 'hourly':  end.setHours(end.getHours() + 1);    break;
        case 'daily':   end.setHours(end.getHours() + 8);    break;
        case 'weekly':  end.setDate(end.getDate() + 7);      break;
        case 'monthly': end.setDate(end.getDate() + 30);     break;
        default:        end.setHours(end.getHours() + 1);    break;
    }
    return end;
};

// Check nurse availability for a given time window (no auth side-effect)
const checkNurseAvailability = async (req, res) => {
    try {
        const { caregiverId, startDateTime, endDateTime } = req.body;

        if (!caregiverId || !startDateTime || !endDateTime) {
            return res.status(400).json({
                success: false,
                message: 'caregiverId, startDateTime, and endDateTime are required'
            });
        }

        const start = new Date(startDateTime);
        const end   = new Date(endDateTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format. Use ISO 8601.' });
        }

        if (end <= start) {
            return res.status(400).json({ success: false, message: 'endDateTime must be after startDateTime.' });
        }

        // Overlap: existing.start < new.end  AND  existing.end > new.start
        const conflict = await Booking.findOne({
            caregiver: caregiverId,
            status:    { $nin: ['rejected', 'cancelled'] },
            startDateTime: { $lt: end },
            endDateTime:   { $gt: start }
        }).select('_id startDateTime endDateTime status');

        if (conflict) {
            return res.status(200).json({
                success:   true,
                available: false,
                message:   'This nurse is already booked for the selected time.'
            });
        }

        return res.status(200).json({
            success:   true,
            available: true,
            message:   'Nurse is available for the selected time.'
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ success: false, message: 'Failed to check availability', error: error.message });
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
            startDateTime: rawStartDateTime,
            duration, 
            location, 
            latitude,
            longitude,
            paymentMethod,
            amount 
        } = req.body;

        const parsedPatientLat = toFloatOrNull(latitude);
        const parsedPatientLng = toFloatOrNull(longitude);
        const hasValidPatientCoords =
            parsedPatientLat != null &&
            parsedPatientLng != null &&
            parsedPatientLat >= -90 && parsedPatientLat <= 90 &&
            parsedPatientLng >= -180 && parsedPatientLng <= 180 &&
            !(parsedPatientLat === 0 && parsedPatientLng === 0);

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

        // ── Compute UTC datetime window ──────────────────────────────────────
        let startDateTime;
        if (rawStartDateTime) {
            startDateTime = new Date(rawStartDateTime);
        } else {
            // Fallback: build from separate date + time string fields
            const [h, m] = time.split(':').map(Number);
            startDateTime = new Date(date);
            startDateTime.setHours(h, m, 0, 0);
        }

        if (isNaN(startDateTime.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid startDateTime.' });
        }

        const endDateTime = computeEndDateTime(startDateTime, duration);

        // ── Server-side conflict detection ──────────────────────────────────
        const conflictingBooking = await Booking.findOne({
            caregiver: caregiverId,
            status:    { $nin: ['rejected', 'cancelled'] },
            startDateTime: { $lt: endDateTime },
            endDateTime:   { $gt: startDateTime }
        }).select('_id');

        if (conflictingBooking) {
            return res.status(409).json({
                success: false,
                message: 'This nurse is already booked for the selected time. Please choose a different time slot.'
            });
        }

        // Create booking
        const booking = new Booking({
            patient: patientId,
            caregiver: caregiverId,
            serviceType,
            date: new Date(date),
            time,
            startDateTime,
            endDateTime,
            duration,
            location: location || 'To be confirmed', // Default for pending bookings
            patientLatitude: hasValidPatientCoords ? parsedPatientLat : null,
            patientLongitude: hasValidPatientCoords ? parsedPatientLng : null,
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

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        if (booking.patient.toString() !== patientId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You are not a party to this booking.'
            });
        }

        // Update fields if provided
        if (paymentMethod) {
            booking.paymentMethod = paymentMethod;

            // In the post-service payment flow, patient pays after confirming completion.
            if (booking.status === 'completed_confirmed') {
                booking.paymentStatus = 'paid';
            }
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

        const hardBlockedByStatus = {
            on_the_way: 'Cancellation is not allowed - the caregiver is already on the way to you.',
            arrived: 'Cancellation is not allowed - the caregiver has arrived at the location.',
            service_started: 'Cancellation is not allowed - the service is currently in progress.',
            service_completed: 'Cancellation is not allowed - the service has been completed.',
            completed_confirmed: 'This booking is already completed and confirmed.'
        };

        if (hardBlockedByStatus[booking.status]) {
            return res.status(400).json({
                success: false,
                message: hardBlockedByStatus[booking.status]
            });
        }

        const refundable = booking.status === 'confirmed' && booking.paymentMethod === 'card' && booking.paymentStatus === 'paid';

        booking.status = 'cancelled';
        booking.cancelledBy = 'patient';
        booking.cancelledByUser = patientId;
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason?.trim() || null;
        booking.penaltyFlag = false;

        if (booking.paymentMethod !== 'card') {
            booking.refundStatus = 'not_applicable';
        }

        await booking.save();

        let refund = null;
        if (refundable) {
            refund = await processBookingRefund(booking);
        }

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            booking,
            refund
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

// Get real-time nurse location for an active booking (on_the_way phase)
const getNurseLocation = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const patientId     = req.user._id;

        // Verify ownership — only the patient who made the booking can poll this
        const booking = await Booking.findOne({ _id: bookingId, patient: patientId })
            .populate('caregiver', 'fullName professionalImage location');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const trackingStatuses = ['on_the_way', 'arrived'];

        if (!trackingStatuses.includes(booking.status)) {
            return res.status(200).json({
                success: true,
                trackingActive: false,
                status: booking.status
            });
        }

        const caregiver = booking.caregiver;
        const coords    = caregiver?.location?.coordinates; // [lng, lat]
        const hasLocation = Array.isArray(coords) && (coords[0] !== 0 || coords[1] !== 0);

        return res.status(200).json({
            success: true,
            trackingActive: trackingStatuses.includes(booking.status),
            status: booking.status,
            nurse: {
                name:        caregiver?.fullName || 'Nurse',
                photo:       caregiver?.professionalImage || null,
                latitude:    hasLocation ? coords[1] : null,
                longitude:   hasLocation ? coords[0] : null,
                hasLocation
            }
        });
    } catch (error) {
        console.error('[NurseLocation] error:', error.message);
        next(error);
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
    getNearbyNurses,
    searchNurses,
    searchCaregivers,
    getCaregiverProfile,
    getFeaturedCaregivers,
    checkNurseAvailability,
    createBooking,
    getPatientBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    confirmServiceCompletion,
    getNurseLocation
};
