import Card from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const bookingData = [
  { month: 'Jan', bookings: 65 },
  { month: 'Feb', bookings: 75 },
  { month: 'Mar', bookings: 85 },
  { month: 'Apr', bookings: 95 },
  { month: 'May', bookings: 110 },
  { month: 'Jun', bookings: 125 },
];

const revenueData = [
  { month: 'Jan', revenue: 25000 },
  { month: 'Feb', revenue: 30000 },
  { month: 'Mar', revenue: 35000 },
  { month: 'Apr', revenue: 38000 },
  { month: 'May', revenue: 42000 },
  { month: 'Jun', revenue: 45000 },
];

const serviceData = [
  { name: 'ICU Care', value: 400 },
  { name: 'Elderly Care', value: 300 },
  { name: 'Post-Surgery', value: 200 },
  { name: 'Home Care', value: 150 },
];

const COLORS = ['#1824b6', '#14b8a6', '#f59e0b', '#8b5cf6'];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1">Platform performance insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Chart */}
        <Card title="Bookings Over Time" subtitle="Monthly booking trends">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookings" fill="#1824b6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue Chart */}
        <Card title="Revenue Growth" subtitle="Monthly revenue trends">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Service Distribution */}
        <Card title="Service Distribution" subtitle="Bookings by service type">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Export Options */}
        <Card title="Export Reports" subtitle="Download data in various formats">
          <div className="space-y-4">
            <button className="w-full px-6 py-3 bg-gradient-to-r from-[#1824b6] to-[#14b8a6] text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5">
              Download Monthly Report (PDF)
            </button>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5">
              Export Data (CSV)
            </button>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5">
              Generate Custom Report
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
