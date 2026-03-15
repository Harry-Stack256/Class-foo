import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { UserPlus, Search, User as UserIcon, Check } from 'lucide-react';

export default function FriendsList() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user._id}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch user with friends', error);
      }
    };
    fetchFriends();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.filter((u: any) => u._id !== user?._id));
        }
      } catch (error) {
        console.error('Failed to search users', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?._id]);

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    setAddingId(friendId);
    try {
      const res = await fetch(`/api/users/${user._id}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to add friend', error);
    } finally {
      setAddingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white shadow-sm rounded-3xl border border-stone-200 overflow-hidden mt-8">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-6">Friends</h2>
        
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Search users to add as friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-xl py-3 px-4 border transition-colors"
            />
          </div>
          
          {searchQuery && (
            <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {isSearching ? (
                <div className="p-4 text-sm text-stone-500 text-center">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-stone-100">
                  {searchResults.map((result) => {
                    const isFriend = user.friends?.some((f: any) => f._id === result._id);
                    return (
                      <li key={result._id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-indigo-500" />
                          </div>
                          <span className="font-medium text-stone-900">{result.name}</span>
                        </div>
                        {isFriend ? (
                          <span className="inline-flex items-center text-sm text-emerald-600 font-medium">
                            <Check className="w-4 h-4 mr-1" />
                            Friends
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(result._id)}
                            disabled={addingId === result._id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            {addingId === result._id ? 'Adding...' : 'Add Friend'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-4 text-sm text-stone-500 text-center">No users found.</div>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Your Friends List</h3>
          {(!user.friends || user.friends.length === 0) ? (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-100 border-dashed">
              <UserPlus className="mx-auto h-8 w-8 text-stone-300 mb-2" />
              <p className="text-sm text-stone-500">You haven't added any friends yet.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {user.friends.map((friend: any) => (
                <li key={friend._id} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900 truncate">{friend.name}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {friend.tags?.length ? friend.tags.join(', ') : 'No tags'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
