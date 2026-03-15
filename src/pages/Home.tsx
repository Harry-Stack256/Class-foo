import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, ArrowRight, Database, Trash2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store';
import QuickQuestion from '../components/QuickQuestion';
import Toast, { ToastType } from '../components/Toast';

export default function Home() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const url = user ? `/api/events?userId=${user._id}` : '/api/events';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, [user]);

  const handleSeed = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, includeRandomUsers: true })
      });
      if (res.ok) {
        setToast({ message: 'Example data generated successfully!', type: 'success' });
        // Refresh events
        const url = `/api/events?userId=${user._id}`;
        const eventsRes = await fetch(url);
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data);
        }
      }
    } catch (error) {
      console.error('Failed to seed data', error);
      setToast({ message: 'Failed to generate example data.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSeed = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/seed/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      if (res.ok) {
        setToast({ message: 'All data cleared successfully.', type: 'info' });
        // Refresh events
        const url = `/api/events?userId=${user._id}`;
        const eventsRes = await fetch(url);
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data);
        }
      }
    } catch (error) {
      console.error('Failed to clear seeded data', error);
      setToast({ message: 'Failed to clear data.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const isFriend = (hostId: string) => {
    if (!user || !user.friends) return false;
    return user.friends.some((f: any) => {
      const fId = typeof f === 'string' ? f : f._id;
      return fId === hostId;
    });
  };

  const now = new Date();

  const hostingEvents = events.filter(e => 
    e.hostId?._id === user?._id && new Date(e.date) >= now
  );

  const attendingEvents = events.filter(e => 
    e.hostId?._id !== user?._id && 
    e.attendees?.some((a: any) => a.userId === user?._id) &&
    new Date(e.date) >= now
  );

  const pastEvents = events.filter(e => 
    (e.hostId?._id === user?._id || e.attendees?.some((a: any) => a.userId === user?._id)) &&
    new Date(e.date) < now
  );
  
  const friendEvents = events.filter(e => 
    e.hostId?._id !== user?._id && 
    !e.attendees?.some((a: any) => a.userId === user?._id) &&
    isFriend(e.hostId?._id) &&
    new Date(e.date) >= now
  );

  const localEvents = events.filter(e => 
    e.hostId?._id !== user?._id && 
    !e.attendees?.some((a: any) => a.userId === user?._id) &&
    !isFriend(e.hostId?._id) &&
    e.isPublic &&
    new Date(e.date) >= now
  );

  const EventCard = ({ event }: { event: any }) => (
    <div
      onClick={() => navigate(`/events/${event._id}`)}
      className="group flex flex-col box p-0 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
    >
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-red/10 text-brand-red">
              {format(new Date(event.date), 'MMM d, yyyy')}
            </span>
            {event.distance != null && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                {event.distance.toFixed(1)} miles away
              </span>
            )}
          </div>
          <span className="text-xs text-stone-400 flex items-center gap-1">
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
        <div className="mt-auto flex items-center text-sm text-stone-500">
          <span className="font-medium text-stone-900">Host:</span>
          <Link 
            to={`/users/${event.hostId?._id}`} 
            className="ml-1 truncate text-brand-red hover:underline flex items-center gap-1 relative z-10"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {event.hostId?.name || 'Unknown'}
            {isFriend(event.hostId?._id) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-red/10 text-brand-red ml-1">
                Friend
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className="bg-stone-50 px-6 py-3 border-t border-stone-100 flex items-center justify-between text-sm text-brand-red font-bold group-hover:bg-brand-red group-hover:text-white transition-all">
        View Details
        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      <QuickQuestion />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Events</h1>
          <p className="text-stone-500 mt-1">Discover and join gatherings.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClearSeed}
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-200 text-sm font-medium rounded-xl shadow-sm text-stone-400 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
            title="Clear all data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleSeed}
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-200 text-sm font-medium rounded-xl shadow-sm text-stone-700 bg-white hover:bg-stone-50 hover:border-indigo-200 transition-all group"
          >
            <Database className="w-4 h-4 mr-2 text-stone-400 group-hover:text-indigo-500 transition-colors" />
            Seed Example Data
          </button>
          <Link
            to="/events/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Create Event
          </Link>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-2 text-sm font-medium text-stone-900">No events</h3>
          <p className="mt-1 text-sm text-stone-500">Get started by creating a new event.</p>
          <div className="mt-6">
            <Link
              to="/events/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <Calendar className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              New Event
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {hostingEvents.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Events You're Hosting</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {hostingEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}

          {attendingEvents.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Events You're Attending</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {attendingEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}

          {friendEvents.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Friends' Public Events</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {friendEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}

          {localEvents.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-stone-900">Local Public Events</h2>
                <p className="text-sm text-stone-500 mt-1">
                  Hosted by people outside your network. You might not know anyone here, but it's a great way to meet locals!
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {localEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section className="pt-8 border-t border-stone-200">
              <h2 className="text-xl font-bold text-stone-400 mb-6">Past Events</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {pastEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
