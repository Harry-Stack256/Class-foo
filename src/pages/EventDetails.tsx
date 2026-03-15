import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../store';
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, HelpCircle, Sparkles, User as UserIcon, Tag, UserPlus, CalendarPlus, Globe, Lock, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../components/Layout';
import InviteModal from '../components/InviteModal';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        
        // Log event details to console as requested
        const logData = {
          title: data.title,
          date: format(new Date(data.date), 'yyyy-MM-dd'),
          time: format(new Date(data.date), 'HH:mm'),
          description: data.description,
          location: data.location || 'Not specified',
          attendees: data.attendees?.map((a: any) => ({
            name: a.userId?.name,
            tags: a.userId?.tags || []
          })) || []
        };
        console.log("Event Details:", JSON.stringify(logData, null, 2));
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch event', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/events/${id}/analyze`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      } else {
        alert('Failed to analyze event. Make sure FEATHERLESS_API_KEY is set.');
      }
    } catch (error) {
      console.error('Failed to analyze', error);
      alert('Failed to analyze event.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [id]);

  useEffect(() => {
    if (event && event.hostId?._id === user?._id) {
      handleAnalyze();
    }
  }, [event?.attendees, event?.tags, event?.hostId?._id, user?._id, handleAnalyze]);

  const handleRSVP = async (status: 'yes' | 'maybe' | 'no') => {
    try {
      const res = await fetch(`/api/events/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id, status }),
      });
      if (res.ok) {
        fetchEvent(); // Refresh event data
      }
    } catch (error) {
      console.error('Failed to RSVP', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!event) return null;

  const userRSVP = event.attendees?.find((a: any) => a.userId?._id === user?._id)?.status;
  const isHost = event.hostId?._id === user?._id;
  console.log('Debug isHost:', { 
    isHost, 
    hostId: event.hostId, 
    hostId_id: event.hostId?._id, 
    userId: user?._id,
    user: user
  });

  // Categorize and count tags from all 'yes' attendees
  const dietaryMedicalKeywords = [
    'allergy', 'keto', 'gluten', 'vegan', 'vegetarian', 'diabetic', 'nut', 'dairy', 
    'lactose', 'no ', 'free', 'medical', 'sugar', 'low carb', 'pescatarian', 'diet'
  ];
  
  const preferenceKeywords = [
    'beer', 'wine', 'spicy', 'halal', 'kosher', 'coffee', 'tea', 'soda', 'juice', 
    'meat', 'fish', 'poultry', 'dessert', 'snack', 'drink', 'alcohol'
  ];

  const tagCounts: Record<string, number> = {};
  event.attendees?.forEach((a: any) => {
    if (a.status === 'yes' && a.userId?.tags) {
      a.userId.tags.forEach((tag: string) => {
        const lowerTag = tag.toLowerCase();
        const isDietary = dietaryMedicalKeywords.some(k => lowerTag.includes(k));
        const isPreference = preferenceKeywords.some(k => lowerTag.includes(k));
        
        if (isDietary || isPreference) {
          // Normalize tag casing for counting but keep original for display if possible
          // For simplicity, we'll use the tag as provided
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    }
  });

  const categorizedTags = Object.entries(tagCounts).reduce((acc, [tag, count]) => {
    const lowerTag = tag.toLowerCase();
    const isDietary = dietaryMedicalKeywords.some(k => lowerTag.includes(k));
    
    const displayTag = count > 1 ? `${tag} (${count})` : tag;
    
    if (isDietary) {
      acc.dietary.push({ tag, displayTag, count });
    } else {
      acc.preferences.push({ tag, displayTag, count });
    }
    return acc;
  }, { dietary: [] as any[], preferences: [] as any[] });

  // Sort by count descending
  categorizedTags.dietary.sort((a, b) => b.count - a.count);
  categorizedTags.preferences.sort((a, b) => b.count - a.count);

  const filterRelevantTags = (tags: string[]) => {
    return tags.filter(tag => {
      const lowerTag = tag.toLowerCase();
      return dietaryMedicalKeywords.some(k => lowerTag.includes(k)) || 
             preferenceKeywords.some(k => lowerTag.includes(k));
    });
  };

  const isFriend = (userId: string) => {
    if (!user || !user.friends) return false;
    return user.friends.some((f: any) => {
      const fId = typeof f === 'string' ? f : f._id;
      return fId === userId;
    });
  };

  const AttendeeItem = ({ attendee }: { attendee: any }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-700 font-bold text-sm">
            {attendee.userId?.name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        <div>
          <Link 
            to={`/users/${attendee.userId?._id}`}
            className="text-sm font-medium text-stone-900 hover:text-indigo-600 hover:underline flex items-center gap-2"
          >
            {attendee.userId?.name}
            {isFriend(attendee.userId?._id) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                Friend
              </span>
            )}
          </Link>
          <p className="text-xs text-stone-500 mt-0.5">
            {filterRelevantTags(attendee.userId?.tags || []).join(', ') || 'No restrictions'}
          </p>
        </div>
      </div>
      {attendee.status === 'invited' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
          Invited
        </span>
      )}
    </div>
  );

  const getGoogleCalendarUrl = () => {
    if (!event) return '#';
    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      details: event.description,
      location: event.location || '',
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-purple-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-800">
              <Calendar className="w-4 h-4 mr-2" />
              {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">{event.title}</h1>
            <div className="flex flex-wrap items-center text-stone-500 gap-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-stone-400" />
                {format(new Date(event.date), 'h:mm a')}
              </div>
              {event.location && (
                <div className="flex flex-col gap-1">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-indigo-600 transition-colors group"
                    title="View on Google Maps"
                  >
                    <MapPin className="w-5 h-5 mr-2 text-stone-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="underline decoration-stone-300 underline-offset-4 group-hover:decoration-indigo-300">{event.location}</span>
                  </a>
                  {event.distance != null && (
                    <div className="flex items-center text-xs font-medium text-purple-600 ml-7">
                      {event.distance.toFixed(1)} miles from you
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-stone-400" />
                Hosted by 
                <Link 
                  to={`/users/${event.hostId?._id}`}
                  className="font-medium text-stone-900 ml-1 hover:text-indigo-600 hover:underline flex items-center"
                >
                  {event.hostId?.name}
                  {isFriend(event.hostId?._id) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 ml-2">
                      Friend
                    </span>
                  )}
                </Link>
              </div>
              <div className="flex items-center">
                {event.isPublic ? (
                  <Globe className="w-5 h-5 mr-2 text-stone-400" />
                ) : (
                  <Lock className="w-5 h-5 mr-2 text-stone-400" />
                )}
                {event.isPublic ? 'Public Event' : 'Private Event'}
              </div>
            </div>

            {event.tags && filterRelevantTags(event.tags).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {filterRelevantTags(event.tags).map((tag: string, i: number) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="pt-4 flex flex-wrap gap-3">
              {isHost && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/events/${id}/seed`, { method: 'POST' });
                      if (res.ok) {
                        fetchEvent();
                      } else {
                        alert('Failed to seed data.');
                      }
                    } catch (error) {
                      console.error('Failed to seed data', error);
                      alert('Failed to seed data.');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-stone-200 shadow-sm text-sm font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                  Seed Example Data
                </button>
              )}
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-stone-200 shadow-sm text-sm font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-2 text-indigo-500" />
                Invite Friends
              </button>
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-stone-200 shadow-sm text-sm font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <CalendarPlus className="w-4 h-4 mr-2 text-indigo-500" />
                Add to Google Calendar
              </a>
            </div>
          </div>

          {/* RSVP Actions */}
          {!isHost && (
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 min-w-[280px]">
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4">Your RSVP</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleRSVP('yes')}
                  className={cn(
                    "flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all",
                    userRSVP === 'yes' 
                      ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-500 shadow-sm" 
                      : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <CheckCircle2 className={cn("w-5 h-5 mr-2", userRSVP === 'yes' ? "text-emerald-600" : "text-stone-400")} />
                  Yes, I'm going
                </button>
                <button
                  onClick={() => handleRSVP('maybe')}
                  className={cn(
                    "flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all",
                    userRSVP === 'maybe' 
                      ? "bg-amber-100 text-amber-800 border-2 border-amber-500 shadow-sm" 
                      : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <HelpCircle className={cn("w-5 h-5 mr-2", userRSVP === 'maybe' ? "text-amber-600" : "text-stone-400")} />
                  Maybe
                </button>
                <button
                  onClick={() => handleRSVP('no')}
                  className={cn(
                    "flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all",
                    userRSVP === 'no' 
                      ? "bg-rose-100 text-rose-800 border-2 border-rose-500 shadow-sm" 
                      : "bg-white border border-purple-100 text-stone-700 hover:bg-purple-50/50"
                  )}
                >
                  <XCircle className={cn("w-5 h-5 mr-2", userRSVP === 'no' ? "text-rose-600" : "text-purple-300")} />
                  No, I can't
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="box p-8">
            <h2 className="text-xl font-bold text-white mb-4">About this event</h2>
            <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
          </div>

          {/* AI Analysis Section - ONLY FOR HOST */}
          {isHost && (
            <div className="box p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-red/5 rounded-full opacity-50 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Sparkles className="w-6 h-6 mr-2 text-white" />
                    AI Host Summary
                  </h2>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Generate Summary'}
                  </button>
                </div>
                
                {analysis ? (
                  <div className="space-y-8">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <div className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Critical</div>
                        <div className="text-3xl font-black text-rose-700">{analysis.audit_summary?.critical_count || 0}</div>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <div className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Dietary</div>
                        <div className="text-3xl font-black text-amber-700">{analysis.audit_summary?.dietary_count || 0}</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Logistics</div>
                        <div className="text-3xl font-black text-blue-700">{analysis.audit_summary?.beverage_count || 0}</div>
                      </div>
                    </div>

                    {/* Attendee Profiles */}
                    {analysis.attendee_profiles?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-indigo-500" /> Guest Profiles
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {analysis.attendee_profiles.map((profile: any, i: number) => (
                            <div key={i} className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                              <div className="font-bold text-indigo-900">{profile.guest}</div>
                              {profile.tags?.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {profile.tags.map((tag: string, j: number) => (
                                    <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-indigo-400 mt-1 italic">No tags listed</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Critical Gaps */}
                    {analysis.report?.critical_safety_gaps?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-rose-700 mb-3 flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2" /> Critical Safety Gaps
                        </h3>
                        <div className="space-y-3">
                          {analysis.report.critical_safety_gaps.map((gap: any, i: number) => (
                            <div key={i} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                              <div className="font-bold text-rose-900">{gap.guest} <span className="text-rose-600 font-normal">— {gap.constraint}</span></div>
                              <div className="text-sm text-rose-800 mt-1"><strong>Conflicts:</strong> {gap.conflicting_items?.join(', ')}</div>
                              <div className="text-sm text-rose-700 mt-1">{gap.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary Conflicts */}
                    {analysis.report?.dietary_conflicts?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-amber-700 mb-3 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2" /> Dietary Conflicts
                        </h3>
                        <div className="space-y-3">
                          {analysis.report.dietary_conflicts.map((conflict: any, i: number) => (
                            <div key={i} className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                              <div className="font-bold text-amber-900">{conflict.guest} <span className="text-amber-600 font-normal">— {conflict.constraint}</span></div>
                              <div className="text-sm text-amber-800 mt-1"><strong>Conflicts:</strong> {conflict.conflicting_items?.join(', ')}</div>
                              <div className="text-sm text-amber-700 mt-1">{conflict.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Beverage & Logistics */}
                    {analysis.report?.beverage_logistics?.neutral_observations?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center">
                          <Info className="w-5 h-5 mr-2" /> Logistics & Observations
                        </h3>
                        <div className="space-y-2">
                          {analysis.report.beverage_logistics.neutral_observations.map((obs: any, i: number) => (
                            <div key={i} className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-sm text-blue-800">
                              <strong>{obs.guest}:</strong> {obs.note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Side Note: Recommendations */}
                    {analysis.recommendations && (
                      <div className="mt-8 pt-6 border-t border-indigo-200/50">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Side Note: AI Recommendations</h4>
                        <p className="text-indigo-900/80 text-sm italic">{analysis.recommendations}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-indigo-700/80">
                    Click generate to get an AI-powered audit of your event based on attendee requirements. This is only visible to you as the host.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Aggregated Tags */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-indigo-500" />
              Attendee Requirements
            </h3>
            
            <div className="space-y-6">
              {/* Dietary & Medical Section */}
              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                  Dietary & Medical Considerations
                </h4>
                {categorizedTags.dietary.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categorizedTags.dietary.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-rose-50 text-rose-800 border border-rose-100"
                      >
                        {item.displayTag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">None reported</p>
                )}
              </div>

              {/* Attendee Preferences Section */}
              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                  Attendee Preferences
                </h4>
                {categorizedTags.preferences.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categorizedTags.preferences.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-amber-50 text-amber-800 border border-amber-100"
                      >
                        {item.displayTag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">None reported</p>
                )}
              </div>
            </div>

            {categorizedTags.dietary.length === 0 && categorizedTags.preferences.length === 0 && (
              <p className="text-sm text-stone-500 mt-4">No requirements from confirmed attendees yet.</p>
            )}
          </div>

          {/* Attendees List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Attendees ({event.attendees?.filter((a: any) => a.status !== 'no').length || 0})
            </h3>
            
            <div className="space-y-8">
              {/* Going Section */}
              {event.attendees?.some((a: any) => a.status === 'yes') && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    Going ({event.attendees.filter((a: any) => a.status === 'yes').length})
                  </h4>
                  <div className="space-y-4">
                    {event.attendees.filter((a: any) => a.status === 'yes').map((attendee: any, i: number) => (
                      <AttendeeItem key={i} attendee={attendee} />
                    ))}
                  </div>
                </div>
              )}

              {/* Maybe Section */}
              {event.attendees?.some((a: any) => a.status === 'maybe' || a.status === 'invited') && (
                <div>
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center">
                    <HelpCircle className="w-3 h-3 mr-1.5" />
                    Maybe / Invited ({event.attendees.filter((a: any) => a.status === 'maybe' || a.status === 'invited').length})
                  </h4>
                  <div className="space-y-4">
                    {event.attendees.filter((a: any) => a.status === 'maybe' || a.status === 'invited').map((attendee: any, i: number) => (
                      <AttendeeItem key={i} attendee={attendee} />
                    ))}
                  </div>
                </div>
              )}

              {/* Not Going Section */}
              {event.attendees?.some((a: any) => a.status === 'no') && (
                <div>
                  <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-4 flex items-center">
                    <XCircle className="w-3 h-3 mr-1.5" />
                    Not Going ({event.attendees.filter((a: any) => a.status === 'no').length})
                  </h4>
                  <div className="space-y-4">
                    {event.attendees.filter((a: any) => a.status === 'no').map((attendee: any, i: number) => (
                      <AttendeeItem key={i} attendee={attendee} />
                    ))}
                  </div>
                </div>
              )}

              {(!event.attendees || event.attendees.length === 0) && (
                <p className="text-sm text-stone-500">No one has RSVP'd yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <InviteModal 
        eventId={event._id} 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInviteSent={() => fetchEvent()}
      />
    </div>
  );
}
