import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Users } from 'lucide-react';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, age: parseInt(age), tags }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const user = await response.json();
      setUser(user);
      navigate('/');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-red flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Welcome to FeastMeet
        </h2>
        <p className="mt-2 text-center text-sm text-white/80">
          Create events, coordinate preferences, and bring people together.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="box py-8 px-4 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm transition-colors"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-white">
                Age
              </label>
              <div className="mt-1">
                <input
                  id="age"
                  name="age"
                  type="number"
                  required
                  min="13"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm transition-colors"
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-white">
                Preferences & Requirements (comma separated)
              </label>
              <div className="mt-1">
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm transition-colors"
                  placeholder="Vegan, Wheelchair Access, No Alcohol"
                />
              </div>
              <p className="mt-2 text-xs text-white/70">
                Add your preferences or restrictions. You can edit these later.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-red hover:bg-brand-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Get Started'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
