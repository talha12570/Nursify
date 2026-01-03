const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiver-controllers');
const authMiddleware = require('../middleware/auth-middleware');

// All routes require authentication
router.use(authMiddleware);

// Get approved patients (for job requests)
router.get('/patients/approved', caregiverController.getApprovedPatients);

// Get caregiver dashboard data
router.get('/dashboard', caregiverController.getDashboardData);

// Get caregiver profile
router.get('/profile', caregiverController.getCaregiverProfile);

// Update caregiver profile
router.put('/profile', caregiverController.updateCaregiverProfile);

// Update availability status
router.put('/availability', caregiverController.updateAvailability);

// Get caregiver bookings (with optional status filter)
router.get('/bookings', caregiverController.getCaregiverBookings);

// Accept booking
router.put('/bookings/:bookingId/accept', caregiverController.acceptBooking);

// Reject booking
router.put('/bookings/:bookingId/reject', caregiverController.rejectBooking);

// Update service status (lifecycle)
router.put('/bookings/:bookingId/status', caregiverController.updateServiceStatus);

// Get caregiver earnings
router.get('/earnings', caregiverController.getCaregiverEarnings);

module.exports = router;
