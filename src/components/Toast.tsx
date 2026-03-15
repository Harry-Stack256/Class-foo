import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { cn } from './Layout';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const styles = {
    success: "bg-emerald-50 border-emerald-100 text-emerald-900",
    error: "bg-rose-50 border-rose-100 text-rose-900",
    info: "bg-blue-50 border-blue-100 text-blue-900",
  };

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-300 transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        styles[type]
      )}
    >
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 opacity-50" />
      </button>
    </div>
  );
}
