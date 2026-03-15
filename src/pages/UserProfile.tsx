import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { User as UserIcon, Calendar, MapPin, Users, ArrowRight, UserPlus, UserMinus, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
  const [sentRequest, setSentRequest] = useState<any>(null);
  const [receivedRequest, setReceivedRequest] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, eventsRes, sentRes, receivedRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/events?hostId=${id}&userId=${currentUser?._id || ''}`),
          fetch(`/api/users/${currentUser?._id}/sent-requests`),
          fetch(`/api/users/${currentUser?._id}/friend-requests`)
        ]);
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setProfileUser(userData);
        }
        
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setHostedEvents(eventsData);
        }

        if (sentRes.ok) {
          const sentData = await sentRes.json();
          setSentRequest(sentData.find((r: any) => r.to === id));
        }

        if (receivedRes.ok) {
          const receivedData = await receivedRes.json();
          setReceivedRequest(receivedData.find((r: any) => r.from?._id === id));
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id, currentUser?._id]);

  const isFriend = currentUser?.friends?.some((f: any) => {
    const fId = typeof f === 'string' ? f : f._id;
    return fId === id;
  });

  const isSelf = currentUser?._id === id;

  const handleFriendAction = async () => {
    if (!currentUser || isSelf) return;
    setIsFriendActionLoading(true);
    
    try {
      if (isFriend) {
        // Remove friend
        const res = await fetch(`/api/users/${currentUser._id}/friends/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const updatedUser = await res.json();
          setUser(updatedUser);
        }
      } else if (receivedRequest) {
        // Accept request
        const res = await fetch(`/api/friend-requests/${receivedRequest._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' })
        });
        if (res.ok) {
          // Refresh user data to get updated friends list
          const userRes = await fetch(`/api/users/${currentUser._id}`);
          if (userRes.ok) {
            const updatedUser = await userRes.json();
            setUser(updatedUser);
            setReceivedRequest(null);
          }
        }
      } else if (!sentRequest) {
        // Send request
        const res = await fetch(`/api/friend-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId: currentUser._id, toId: id })
        });
        if (res.ok) {
          const newRequest = await res.json();
          setSentRequest(newRequest);
        }
      }
    } catch (error) {
      console.error('Failed to update friend status', error);
    } finally {
      setIsFriendActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-stone-900">User not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="box p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-red font-bold text-3xl">
              {profileUser.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{profileUser.name}</h1>
              <p className="text-white/70 mt-1">
                {profileUser.age ? `${profileUser.age} years old` : 'Age not specified'}
              </p>
            </div>
            
            {profileUser.tags && profileUser.tags.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {profileUser.tags.map((tag: string, i: number) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!isSelf && currentUser && (
            <div className="flex-shrink-0">
              <button
                onClick={handleFriendAction}
                disabled={isFriendActionLoading || (!!sentRequest && !isFriend)}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${
                  isFriend 
                    ? 'border-stone-200 text-white-700 bg-white hover:bg-stone-50 focus:ring-stone-500'
                    : receivedRequest
                    ? 'border-transparent text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    : sentRequest
                    ? 'border-stone-200 text-white-400 bg-stone-50 cursor-not-allowed'
                    : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                }`}
              >
                {isFriend ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove Friend
                  </>
                ) : receivedRequest ? (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Accept Request
                  </>
                ) : sentRequest ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Request Sent
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hosted Events */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900">
          Events Hosted by {profileUser.name.split(' ')[0]}
        </h2>
        
        {hostedEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-stone-400" />
            <h3 className="mt-2 text-sm font-medium text-stone-900">No events</h3>
            <p className="mt-1 text-sm text-stone-500">This user isn't hosting any public events right now.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hostedEvents.map((event) => (
              <Link
                key={event._id}
                to={`/events/${event._id}`}
                className="group flex flex-col bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-all hover:border-brand-red/20"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-red/10 text-brand-red">
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.attendees?.length || 0}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-brand-red transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-stone-600 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                  {event.location && (
                    <div className="flex items-center text-sm text-stone-500 mb-2">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
                <div className="bg-stone-50 px-6 py-3 border-t border-stone-100 flex items-center justify-between text-sm text-brand-red font-bold group-hover:bg-brand-red group-hover:text-white transition-all">
                  View Details
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
