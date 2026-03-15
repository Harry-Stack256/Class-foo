import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { UserCheck, UserX, UserPlus, Bell } from 'lucide-react';
import Toast, { ToastType } from './Toast';

export default function Notifications() {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser._id}/friend-requests`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser?._id]);

  const handleAction = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/friend-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        // Remove from local state
        setRequests(prev => prev.filter(r => r._id !== requestId));
        setToast({ 
          message: status === 'accepted' ? 'Friend request accepted!' : 'Friend request declined.', 
          type: status === 'accepted' ? 'success' : 'info' 
        });
        
        // If accepted, refresh user to update friends list
        if (status === 'accepted' && currentUser) {
          const userRes = await fetch(`/api/users/${currentUser._id}`);
          if (userRes.ok) {
            const updatedUser = await userRes.json();
            setUser(updatedUser);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update friend request', error);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-stone-500">Loading...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-sm">
        <Bell className="mx-auto h-12 w-12 text-stone-300 mb-2" />
        <h3 className="text-stone-900 font-medium">No new notifications</h3>
        <p className="text-stone-500 text-sm mt-1">When someone sends you a friend request, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <h2 className="text-xl font-bold text-stone-900 px-1">Friend Requests</h2>
      <div className="grid gap-4">
        {requests.map((request) => (
          <div key={request._id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {request.from?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <Link to={`/users/${request.from?._id}`} className="font-bold text-stone-900 hover:text-indigo-600">
                  {request.from?.name}
                </Link>
                <p className="text-xs text-stone-500">wants to be your friend</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction(request._id, 'accepted')}
                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Accept"
              >
                <UserCheck className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleAction(request._id, 'declined')}
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                title="Decline"
              >
                <UserX className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
