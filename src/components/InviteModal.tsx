import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { X, Link as LinkIcon, Mail, UserPlus, Check } from 'lucide-react';

interface InviteModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export default function InviteModal({ eventId, isOpen, onClose, onInviteSent }: InviteModalProps) {
  const user = useAuthStore((state) => state.user);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setCopied(false);
      setInvitedFriends(new Set());
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmail('');
        onInviteSent();
        // Show a brief success message or just clear
      }
    } catch (error) {
      console.error('Failed to invite via email', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: friendId }),
      });
      if (res.ok) {
        setInvitedFriends(prev => new Set(prev).add(friendId));
        onInviteSent();
      }
    } catch (error) {
      console.error('Failed to invite friend', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Invite Friends</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* Share Link */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Share Link</h3>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={window.location.href}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl py-2 px-3 text-sm text-stone-500 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center px-4 py-2 border border-stone-200 shadow-sm text-sm font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4" />}
                <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Invite via Email */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Invite via Email</h3>
            <form onSubmit={handleInviteEmail} className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-9 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || !email}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>

          {/* Invite from Friends List */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Your Friends</h3>
            {(!user.friends || user.friends.length === 0) ? (
              <p className="text-sm text-stone-500 bg-stone-50 p-4 rounded-xl text-center border border-stone-100">
                You haven't added any friends yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {user.friends.map((friend: any) => {
                  const isInvited = invitedFriends.has(friend._id);
                  return (
                    <li key={friend._id} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors">
                      <span className="text-sm font-medium text-stone-900">{friend.name}</span>
                      <button
                        onClick={() => handleInviteFriend(friend._id)}
                        disabled={isInvited}
                        className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-lg shadow-sm transition-colors ${
                          isInvited 
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50' 
                            : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50'
                        }`}
                      >
                        {isInvited ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Invited
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Invite
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
