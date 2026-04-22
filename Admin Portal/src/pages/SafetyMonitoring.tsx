import Card from '../components/Card';
import { MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const activeBookings = [
  { id: 'BK-001', nurse: 'Sarah Johnson', patient: 'John Doe', location: { lat: 40.7128, lng: -74.006 }, status: 'en-route' },
  { id: 'BK-002', nurse: 'Michael Brown', patient: 'Emily Chen', location: { lat: 40.7580, lng: -73.9855 }, status: 'in-progress' },
];

const sosAlerts = [
  { id: 'SOS-001', nurse: 'Sarah Johnson', location: 'Downtown Medical Center', time: '2 min ago', status: 'active' },
  { id: 'SOS-002', nurse: 'David Lee', location: 'City Hospital', time: '15 min ago', status: 'resolved' },
];

const checkInLogs = [
  { id: 1, user: 'Sarah Johnson', type: 'check-in', location: 'Downtown Medical Center', time: '10:05 AM', date: '2025-12-12' },
  { id: 2, user: 'Michael Brown', type: 'check-in', location: 'Sunrise Care Home', time: '2:03 PM', date: '2025-12-12' },
  { id: 3, user: 'Sarah Johnson', type: 'check-out', location: 'City Hospital', time: '11:45 AM', date: '2025-12-12' },
];

export default function SafetyMonitoring() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Safety Monitoring</h1>
        <p className="text-gray-500 mt-1">Monitor real-time location and safety alerts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Map */}
        <Card title="Live GPS Tracking" subtitle={`${activeBookings.length} active bookings`}>
          <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Map integration placeholder</p>
              <p className="text-sm text-gray-400 mt-2">Use Google Maps or Mapbox here</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {activeBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{booking.nurse}</p>
                  <p className="text-sm text-gray-600">Booking {booking.id} - {booking.patient}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  booking.status === 'en-route' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* SOS Alerts */}
        <div className="space-y-6">
          <Card title="SOS Alerts" subtitle="Emergency notifications">
            <div className="space-y-4">
              {sosAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-xl border-2 ${
                  alert.status === 'active' ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        alert.status === 'active' ? 'bg-red-500' : 'bg-green-500'
                      }`}>
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{alert.nurse}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {alert.location}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                    {alert.status === 'active' && (
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Safe Check-ins</p>
                  <p className="text-2xl font-bold text-gray-900">234</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Now</p>
                  <p className="text-2xl font-bold text-gray-900">{activeBookings.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Check-in/out Logs */}
      <Card title="Check-in/out Logs" subtitle="Recent location confirmations">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {checkInLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-900">{log.user}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      log.type === 'check-in' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{log.location}</td>
                  <td className="px-4 py-4 text-gray-600">{log.date} at {log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
