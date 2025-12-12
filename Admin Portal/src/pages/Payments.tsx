import Card from '../components/Card';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

const stats = [
  { name: 'Total Revenue', value: '$142,580', icon: DollarSign, color: 'bg-green-500' },
  { name: 'Pending Payouts', value: '$5,240', icon: Clock, color: 'bg-yellow-500' },
  { name: 'Completed Payouts', value: '$137,340', icon: CheckCircle, color: 'bg-blue-500' },
  { name: 'This Month', value: '$45,231', icon: TrendingUp, color: 'bg-teal-500' },
];

const transactions = [
  { id: 'TXN-001', user: 'Sarah Johnson', type: 'payout', amount: '$1,250', date: '2025-12-12', status: 'completed' },
  { id: 'TXN-002', user: 'John Doe', type: 'payment', amount: '$250', date: '2025-12-12', status: 'completed' },
  { id: 'TXN-003', user: 'Michael Brown', type: 'payout', amount: '$890', date: '2025-12-11', status: 'pending' },
  { id: 'TXN-004', user: 'Emily Chen', type: 'payment', amount: '$180', date: '2025-12-10', status: 'completed' },
];

export default function Payments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments & Transactions</h1>
        <p className="text-gray-500 mt-1">Manage platform payments and payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} hover={true}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Recent Transactions" subtitle="Latest payment activities">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-primary-600">{txn.id}</td>
                  <td className="px-4 py-4 text-gray-900">{txn.user}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      txn.type === 'payout' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{txn.amount}</td>
                  <td className="px-4 py-4 text-gray-600">{txn.date}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      txn.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
