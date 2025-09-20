'use client';

import { useEffect, useState } from 'react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showDragHandle?: boolean;
  maxHeight?: string;
}

const BottomSheetModal = ({
  isOpen,
  onClose,
  title,
  children,
  showDragHandle = true,
  maxHeight = '90vh'
}: BottomSheetModalProps): React.JSX.Element | null => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to ensure DOM is ready for animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Bottom Sheet Modal */}
      <div 
        className={`fixed inset-0 z-[70] flex items-end justify-center transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className={`bg-white rounded-t-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-transform duration-300 ease-out ${
            isAnimating ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          {showDragHandle && (
            <div 
              className="flex justify-center pt-3 pb-2 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}

          {/* Header - Only show if title is not empty */}
          {title && (
            <div className="flex justify-between items-center px-6 pb-4 border-b border-gray-100">
              <h1 className="text-xl font-bold text-gray-800">{title}</h1>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 140px)` }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default BottomSheetModal;
