import { useState } from 'react';
import Card from '../components/Card';
import { Star, Flag, Eye } from 'lucide-react';

const tabs = ['Patient → Nurse/Caregiver', 'Nurse/Caregiver → Patient'];

const reviews = [
  { id: 1, reviewer: 'John Doe', reviewee: 'Sarah Johnson', rating: 5, comment: 'Excellent care and very professional!', date: '2025-12-10', status: 'approved' },
  { id: 2, reviewer: 'Emily Chen', reviewee: 'Michael Brown', rating: 4, comment: 'Good service, on time', date: '2025-12-09', status: 'approved' },
  { id: 3, reviewer: 'David Lee', reviewee: 'Sarah Johnson', rating: 2, comment: 'Not satisfied with the service', date: '2025-12-08', status: 'flagged' },
];

export default function Reviews() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reviews & Feedback</h1>
        <p className="text-gray-500 mt-1">Moderate reviews and feedback from users</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === tab ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
            )}
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1824b6] to-[#14b8a6] rounded-full flex items-center justify-center text-white font-semibold">
                      {review.reviewer[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.reviewer}</p>
                      <p className="text-sm text-gray-500">reviewed {review.reviewee}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">{review.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    review.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {review.status}
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg">
                    <Flag className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
