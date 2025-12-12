import Card from '../components/Card';
import { Calendar, MapPin, Clock, DollarSign } from 'lucide-react';

const bookings = [
  { id: 'BK-001', patient: 'John Doe', nurse: 'Sarah Johnson', service: 'ICU Care', date: '2025-12-15', time: '10:00 AM', location: 'Downtown Medical Center', status: 'confirmed', amount: '$250' },
  { id: 'BK-002', patient: 'Emily Chen', nurse: 'Michael Brown', service: 'Elderly Care', date: '2025-12-16', time: '2:00 PM', location: 'Sunrise Care Home', status: 'pending', amount: '$180' },
  { id: 'BK-003', patient: 'David Lee', nurse: 'Sarah Johnson', service: 'Post-Surgery Care', date: '2025-12-14', time: '8:00 AM', location: 'City Hospital', status: 'completed', amount: '$320' },
];

export default function BookingManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-500 mt-1">View and manage all bookings</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Booking ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nurse/Caregiver</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-4 font-medium text-primary-600">{booking.id}</td>
                  <td className="px-4 py-4 text-gray-900">{booking.patient}</td>
                  <td className="px-4 py-4 text-gray-900">{booking.nurse}</td>
                  <td className="px-4 py-4 text-gray-600">{booking.service}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {booking.date} at {booking.time}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{booking.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
