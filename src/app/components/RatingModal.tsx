'use client';

import { useState } from 'react';
import { X, Star, Home, SkipForward } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onReturnHome: () => void;
  onSubmitRating: (rating: number, comment: string) => void;
  sessionId: string;
  tableNumber?: string | undefined;
}

export default function RatingModal({
  isOpen,
  onClose,
  onSkip,
  onReturnHome,
  onSubmitRating,
  sessionId,
  tableNumber
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Handle star click
  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  // Handle rating submission
  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRating(rating, comment);
      setHasSubmitted(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle skip rating
  const handleSkip = () => {
    onSkip();
  };

  // Handle return home
  const handleReturnHome = () => {
    onReturnHome();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#00d9ff] rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Rate Your Experience</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Thank you message */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Thank you for dining with us!
            </h3>
            <p className="text-sm text-gray-600">
              We'd love to hear about your experience
            </p>
            {tableNumber && (
              <p className="text-sm text-gray-500 mt-1">
                Table {tableNumber}
              </p>
            )}
          </div>

          {!hasSubmitted ? (
            <>
              {/* Star Rating */}
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  How would you rate your experience?
                </h4>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      className={`w-12 h-12 rounded-full transition-all ${
                        star <= rating
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                      }`}
                    >
                      <Star className={`w-6 h-6 mx-auto ${
                        star <= rating ? 'fill-current' : ''
                      }`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-3">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Tell us more (optional)
                </h4>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about your dining experience..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
                />
              </div>
            </>
          ) : (
            /* Thank you after submission */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-green-600 fill-current" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Thank you for your feedback!
              </h3>
              <p className="text-sm text-gray-600">
                Your rating helps us improve our service
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="space-y-3">
            {!hasSubmitted ? (
              <>
                {/* Submit Rating Button */}
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    rating === 0 || isSubmitting
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[#00d9ff] text-white hover:bg-[#00c4e6]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      <span>Submit Rating</span>
                    </>
                  )}
                </button>

                {/* Skip Button */}
                <button
                  onClick={handleSkip}
                  className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Skip</span>
                </button>
              </>
            ) : (
              /* Return Home Button after submission */
              <button
                onClick={handleReturnHome}
                className="w-full bg-[#00d9ff] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
