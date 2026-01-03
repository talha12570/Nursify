const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signup',
        required: true
    },
    caregiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signup',
        required: true
    },
    serviceType: {
        type: String,
        required: true,
        enum: ['Home Caregiver', 'Hospital Assistant', 'IV Therapy', 'Wound Care', 'ICU Care', 'Elderly Care']
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true,
        enum: ['hourly', 'daily', 'weekly', 'monthly']
    },
    location: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['jazzcash', 'easypaisa', 'card', 'cash']
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed', 'completed_confirmed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    // Service lifecycle timestamps
    onTheWayAt: {
        type: Date
    },
    arrivedAt: {
        type: Date
    },
    serviceStartedAt: {
        type: Date
    },
    serviceCompletedAt: {
        type: Date
    },
    completedConfirmedAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signup'
    },
    cancellationReason: {
        type: String
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
bookingSchema.index({ patient: 1, createdAt: -1 });
bookingSchema.index({ caregiver: 1, createdAt: -1 });
bookingSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
