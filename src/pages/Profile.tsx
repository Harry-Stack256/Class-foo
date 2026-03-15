import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { User, Tag, Save, Bell, MapPin, Navigation } from 'lucide-react';
import FriendsList from '../components/FriendsList';
import Notifications from '../components/Notifications';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [ageInput, setAgeInput] = useState(user?.age?.toString() || '');
  const [tagsInput, setTagsInput] = useState(user?.tags?.join(', ') || '');
  const [latInput, setLatInput] = useState(user?.location?.lat?.toString() || '');
  const [lngInput, setLngInput] = useState(user?.location?.lng?.toString() || '');
  const [maxDistInput, setMaxDistInput] = useState(user?.maxDistance?.toString() || '50');
  const [keywordsInput, setKeywordsInput] = useState(user?.filterKeywords || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState('');

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatInput(position.coords.latitude.toString());
        setLngInput(position.coords.longitude.toString());
        setIsLocating(false);
        setMessage('Location updated from browser!');
      },
      (error) => {
        let errorMsg = 'Failed to get location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permission denied. Please allow location access in your browser settings. If you are in a preview window, try opening the app in a new tab.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg = 'The request to get user location timed out.';
            break;
        }
        console.error('Geolocation Error:', { code: error.code, message: error.message });
        setIsLocating(false);
        setMessage(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Auto-fetch location if not set
    if (!latInput || !lngInput || (latInput === '0' && lngInput === '0')) {
      fetchLocation();
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setMessage('');

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const longTags = tags.filter(t => t.length > 30);
    if (longTags.length > 0) {
      setMessage(`Tags must be 30 characters or less. Please shorten: ${longTags.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: nameInput, 
          age: parseInt(ageInput), 
          tags,
          location: {
            lat: parseFloat(latInput) || 0,
            lng: parseFloat(lngInput) || 0,
          },
          maxDistance: parseInt(maxDistInput) || 50,
          filterKeywords: keywordsInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Your Profile</h1>
        <p className="text-stone-500 mt-1">Manage your dietary preferences and account details.</p>
      </div>

      <div className="box overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-box-border">
            <div className="h-24 w-24 bg-brand-red/10 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-brand-red" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-white/80">{user.age} years old</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-700">
                  Name
                </label>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-stone-700">
                  Age
                </label>
                <div className="mt-2">
                  <input
                    id="age"
                    name="age"
                    type="number"
                    required
                    min="13"
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-stone-700 flex items-center">
                <Tag className="w-4 h-4 mr-2 text-stone-400" />
                Preferences & Requirements
              </label>
              <div className="mt-2">
                <textarea
                  id="tags"
                  name="tags"
                  rows={3}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
                  placeholder="Vegan, Gluten-Free, Nut Allergy"
                />
              </div>
              <p className="mt-2 text-sm text-stone-500">
                Separate tags with commas. Max 30 characters per tag. These will be shared with event hosts to accommodate your needs.
              </p>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-stone-900">Discovery Settings</h3>
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="inline-flex items-center px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  <Navigation className={`w-3 h-3 mr-1.5 ${isLocating ? 'animate-pulse' : ''}`} />
                  {isLocating ? 'Locating...' : 'Update from GPS'}
                </button>
              </div>
              
              <div className="mt-6">
                <label htmlFor="maxDist" className="block text-sm font-medium text-stone-700">
                  Maximum Distance (miles)
                </label>
                <div className="mt-2">
                  <input
                    id="maxDist"
                    type="number"
                    value={maxDistInput}
                    onChange={(e) => setMaxDistInput(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
                  />
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  Only events within this radius will be shown to you.
                </p>
              </div>

              <div className="mt-6">
                <label htmlFor="keywords" className="block text-sm font-medium text-stone-700">
                  Filter Keywords (Regex/Keywords)
                </label>
                <div className="mt-2">
                  <input
                    id="keywords"
                    type="text"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
                    placeholder="e.g. vegan, board games"
                  />
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  If set, only events matching at least one keyword will be shown.
                </p>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {message}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center items-center py-2.5 px-5 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Notifications />

      <FriendsList />
    </div>
  );
}
