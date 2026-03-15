import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Calendar as CalendarIcon, Clock, FileText, Type, MapPin, Globe, Lock, Tag, Navigation } from 'lucide-react';

const EXAMPLES = [
  { title: "Team Offsite", description: "Let's get together and plan the next quarter." },
  { title: "Vegan Potluck", description: "Bring your favorite plant-based dish to share!" },
  { title: "Board Game Night", description: "A casual evening of strategy games and snacks." },
  { title: "Hiking Trip", description: "Morning hike followed by a picnic at the summit." },
  { title: "Book Club", description: "Discussing our latest read over coffee and pastries." },
];

type Phase = 'TYPING_TITLE' | 'TYPING_DESC' | 'PAUSED' | 'DELETING_DESC' | 'DELETING_TITLE';

function useTypewriterSequence(examples: typeof EXAMPLES) {
  const [index, setIndex] = useState(0);
  const [titleText, setTitleText] = useState('');
  const [descText, setDescText] = useState('');
  const [phase, setPhase] = useState<Phase>('TYPING_TITLE');

  useEffect(() => {
    const currentExample = examples[index];
    let timer: NodeJS.Timeout;

    switch (phase) {
      case 'TYPING_TITLE':
        if (titleText.length < currentExample.title.length) {
          timer = setTimeout(() => {
            setTitleText(currentExample.title.slice(0, titleText.length + 1));
          }, 50);
        } else {
          timer = setTimeout(() => setPhase('TYPING_DESC'), 300);
        }
        break;
      case 'TYPING_DESC':
        if (descText.length < currentExample.description.length) {
          timer = setTimeout(() => {
            setDescText(currentExample.description.slice(0, descText.length + 1));
          }, 30);
        } else {
          timer = setTimeout(() => setPhase('PAUSED'), 2500);
        }
        break;
      case 'PAUSED':
        setPhase('DELETING_DESC');
        break;
      case 'DELETING_DESC':
        if (descText.length > 0) {
          timer = setTimeout(() => {
            setDescText(descText.slice(0, -1));
          }, 15);
        } else {
          timer = setTimeout(() => setPhase('DELETING_TITLE'), 150);
        }
        break;
      case 'DELETING_TITLE':
        if (titleText.length > 0) {
          timer = setTimeout(() => {
            setTitleText(titleText.slice(0, -1));
          }, 20);
        } else {
          timer = setTimeout(() => {
            setIndex((prev) => (prev + 1) % examples.length);
            setPhase('TYPING_TITLE');
          }, 400);
        }
        break;
    }

    return () => clearTimeout(timer);
  }, [phase, titleText, descText, index, examples]);

  return { titleText, descText, phase };
}

function TypewriterPlaceholder({ text, isVisible, isActive, isTextArea = false }: { text: string, isVisible: boolean, isActive: boolean, isTextArea?: boolean }) {
  if (!isVisible) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden pl-10 pr-3 ${isTextArea ? 'pt-2.5' : 'flex items-center'}`}>
      <span  style={{ color: 'black' }} className="text-stone-400 sm:text-sm truncate">
        {text}
        {isActive && <span className="animate-pulse border-r border-stone-400 ml-0.5"></span>}
      </span>
    </div>
  );
}

export default function CreateEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const user = useAuthStore((state) => state.user);

  const navigate = useNavigate();

  const { titleText, descText, phase } = useTypewriterSequence(EXAMPLES);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const eventDate = new Date(`${date}T${time}`);
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      
      const longTags = tags.filter(t => t.length > 30);
      if (longTags.length > 0) {
        alert(`Tags must be 30 characters or less. Please shorten: ${longTags.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          date: eventDate.toISOString(),
          location,
          isPublic,
          tags,
          hostId: user?._id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const event = await response.json();
      navigate(`/events/${event._id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Create Event</h1>
        <p className="text-stone-500 mt-1">Host a gathering and invite others to join.</p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-stone-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-stone-700">
              Event Title
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Type className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                 style={{ color: 'black' }} 
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors bg-transparent relative z-10"
                placeholder=""
              />
              <TypewriterPlaceholder 
                text={titleText} 
                isVisible={!title} 
                isActive={phase === 'TYPING_TITLE' || phase === 'DELETING_TITLE'} 
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-stone-700">
              Location Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                name="location"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors text-stone-700"
                placeholder="Central Park, NY or Zoom Link"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-stone-700">
                Description
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-stone-700">
              Description
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                <FileText className="h-5 w-5 text-stone-400" />
              </div>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                 style={{ color: 'black' }} 
                className="focus:ring-brand-red focus:border-brand-red block w-full pl-10 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors bg-transparent relative z-10"
                placeholder=""
              />
              <TypewriterPlaceholder 
                text={descText} 
                isVisible={!description} 
                isTextArea 
                isActive={phase === 'TYPING_DESC' || phase === 'DELETING_DESC' || phase === 'PAUSED'} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-stone-700">
                Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="date"
                  name="date"
                  id="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="focus:ring-brand-red focus:border-brand-red block w-full pl-10 text-stone-700 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-stone-700">
                Time
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="time"
                  name="time"
                  id="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="focus:ring-brand-red focus:border-brand-red block w-full pl-10 text-stone-700 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-stone-700">
              Event Tags / Requirements
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                name="tags"
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="focus:ring-brand-red focus:border-brand-red block w-full pl-10 text-stone-700 sm:text-sm border-stone-300 rounded-xl py-2 px-3 border transition-colors"
                placeholder="Vegan, Halal, Alcohol-Free (comma separated)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Event Visibility
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${isPublic ? 'border-brand-red bg-brand-red/10 text-brand-red' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}>
                <input type="radio" name="visibility" className="sr-only" checked={isPublic} onChange={() => setIsPublic(true)} />
                <Globe className="w-5 h-5 mr-2" />
                <span  style={{ color: 'black' }} className="font-medium text-sm">Public (Friends can see)</span>
              </label>
              <label className={`flex-1 flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${!isPublic ? 'border-brand-red bg-brand-red/10 text-brand-red' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}>
                <input type="radio" name="visibility" className="sr-only" checked={!isPublic} onChange={() => setIsPublic(false)} />
                <Lock className="w-5 h-5 mr-2" />
                <span  style={{ color: 'black' }}  className="font-medium text-sm">Private (Invite only)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white py-2 px-4 border border-stone-300 rounded-xl shadow-sm text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red mr-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-brand-red hover:bg-brand-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
