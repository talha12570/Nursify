import Card from '../components/Card';
import { Users, UserCheck, Calendar, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';

const stats = [
  { name: 'Total Users', value: '12,543', change: '+12%', icon: Users, color: 'bg-blue-500' },
  { name: 'Active Bookings', value: '342', change: '+8%', icon: Calendar, color: 'bg-teal-500' },
  { name: 'Pending Verifications', value: '23', change: '+5', icon: UserCheck, color: 'bg-orange-500' },
  { name: 'Monthly Revenue', value: '$45,231', change: '+18%', icon: DollarSign, color: 'bg-green-500' },
  { name: 'Flagged Incidents', value: '7', change: '-3', icon: AlertTriangle, color: 'bg-red-500' },
  { name: 'Growth Rate', value: '23.5%', change: '+2.3%', icon: TrendingUp, color: 'bg-purple-500' },
];

const recentActivity = [
  { type: 'verification', user: 'Sarah Johnson', action: 'Nurse verification approved', time: '5 min ago' },
  { type: 'booking', user: 'John Doe', action: 'New booking created', time: '12 min ago' },
  { type: 'payment', user: 'Emily Chen', action: 'Payment processed - $250', time: '23 min ago' },
  { type: 'alert', user: 'System', action: 'SOS alert resolved', time: '1 hour ago' },
  { type: 'verification', user: 'Michael Brown', action: 'Caregiver verification pending', time: '2 hours ago' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your platform's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} hover={true} padding="lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{stat.value}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
                      stat.change.startsWith('+') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500">from last month</span>
                  </div>
                </div>
                <div className={`${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" subtitle="Common tasks and shortcuts">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="group p-5 border-2 border-primary-200 rounded-xl hover:bg-gradient-to-br hover:from-[#1824b6] hover:to-[#14b8a6] hover:border-transparent transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary-100 group-hover:bg-white rounded-xl flex items-center justify-center mb-3 transition-colors">
              <UserCheck className="w-6 h-6 text-primary-600 group-hover:text-primary-600" />
            </div>
            <p className="font-bold text-gray-900 group-hover:text-white transition-colors">Approve Verifications</p>
            <p className="text-sm text-gray-500 group-hover:text-white/90 mt-2 transition-colors">Review 23 pending nurses</p>
          </button>
          <button className="group p-5 border-2 border-teal-200 rounded-xl hover:bg-gradient-to-br hover:from-[#1824b6] hover:to-[#14b8a6] hover:border-transparent transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 bg-teal-100 group-hover:bg-white rounded-xl flex items-center justify-center mb-3 transition-colors">
              <AlertTriangle className="w-6 h-6 text-teal-600 group-hover:text-teal-600" />
            </div>
            <p className="font-bold text-gray-900 group-hover:text-white transition-colors">Flagged Reviews</p>
            <p className="text-sm text-gray-500 group-hover:text-white/90 mt-2 transition-colors">12 reviews need attention</p>
          </button>
          <button className="group p-5 border-2 border-green-200 rounded-xl hover:bg-gradient-to-br hover:from-[#1824b6] hover:to-[#14b8a6] hover:border-transparent transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 bg-green-100 group-hover:bg-white rounded-xl flex items-center justify-center mb-3 transition-colors">
              <DollarSign className="w-6 h-6 text-green-600 group-hover:text-green-600" />
            </div>
            <p className="font-bold text-gray-900 group-hover:text-white transition-colors">Payout Requests</p>
            <p className="text-sm text-gray-500 group-hover:text-white/90 mt-2 transition-colors">5 pending payouts</p>
          </button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity" subtitle="Latest actions on your platform">
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'verification' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'booking' ? 'bg-teal-100 text-teal-600' :
                  activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {activity.type === 'verification' && <UserCheck className="w-5 h-5" />}
                  {activity.type === 'booking' && <Calendar className="w-5 h-5" />}
                  {activity.type === 'payment' && <DollarSign className="w-5 h-5" />}
                  {activity.type === 'alert' && <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{activity.user}</p>
                  <p className="text-sm text-gray-500">{activity.action}</p>
                </div>
              </div>
              <span className="text-sm text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
