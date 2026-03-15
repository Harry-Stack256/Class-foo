import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { Feather, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUESTIONS = [
  { id: 'q1', text: 'Are you a vegetarian?', tag: 'Vegetarian' },
  { id: 'q2', text: 'Do you only eat Halal food?', tag: 'Halal' },
  { id: 'q3', text: 'Do you have a gluten allergy or intolerance?', tag: 'Gluten-Free' },
  { id: 'q4', text: 'Do you enjoy playing board games?', tag: 'Board Games' },
  { id: 'q5', text: 'Are you comfortable around dogs?', tag: 'Dog Friendly' },
];

export default function QuickQuestion() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if we've already shown a question this session
    const hasShown = sessionStorage.getItem('quickQuestionShown');
    if (hasShown) return;

    // Find a question the user hasn't answered (tag not in user.tags)
    const unanswered = QUESTIONS.filter(q => !user.tags?.includes(q.tag));
    
    if (unanswered.length > 0) {
      // Pick a random unanswered question
      const randomQ = unanswered[Math.floor(Math.random() * unanswered.length)];
      setCurrentQuestion(randomQ);
      
      // Delay showing it so it feels less intrusive
      const timer = setTimeout(() => {
        setIsVisible(true);
        sessionStorage.setItem('quickQuestionShown', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleAnswer = async (answer: 'yes' | 'no') => {
    if (!user || !currentQuestion) return;
    
    if (answer === 'no') {
      setIsVisible(false);
      return;
    }

    setIsAdding(true);
    try {
      const newTags = [...(user.tags || []), currentQuestion.tag];
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to add tag', error);
    } finally {
      setIsAdding(false);
      setIsVisible(false);
    }
  };

  if (!currentQuestion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3">
            <button 
              onClick={() => setIsVisible(false)}
              className="text-indigo-300 hover:text-indigo-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-start gap-4 pr-6">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-indigo-50">
              <Feather className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 mb-1">Quick Question</h3>
              <p className="text-sm text-indigo-700 mb-4">{currentQuestion.text}</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAnswer('yes')}
                  disabled={isAdding}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isAdding ? 'Adding...' : 'Yes, add to profile'}
                </button>
                <button
                  onClick={() => handleAnswer('no')}
                  disabled={isAdding}
                  className="inline-flex items-center px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-50 border border-indigo-200 transition-colors disabled:opacity-50 shadow-sm"
                >
                  No / Skip
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
