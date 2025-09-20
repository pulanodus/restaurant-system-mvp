'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Settings, Bell } from 'lucide-react';
import { useAudioNotification } from '@/lib/audio-notifications';

interface AudioSettingsProps {
  className?: string;
}

export default function AudioSettings({ className = '' }: AudioSettingsProps) {
  const { setEnabled, setVolume, getEnabled, getVolume, playSound } = useAudioNotification();
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.3);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsEnabled(getEnabled());
    setVolumeState(getVolume());
  }, [getEnabled, getVolume]);

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    setEnabled(newEnabled);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  const testSound = (type: 'payment-request' | 'help-request' | 'food-ready') => {
    playSound(type);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Audio Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isEnabled 
            ? 'bg-[#00d9ff] text-white hover:bg-[#00c4e6]' 
            : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
        }`}
        title={isEnabled ? 'Audio notifications enabled' : 'Audio notifications disabled'}
      >
        {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* Audio Settings Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Audio Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="mb-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Enable Audio Notifications</span>
              <button
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-[#00d9ff]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Volume Control */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={!isEnabled}
            />
          </div>

          {/* Test Sounds */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Sounds</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => testSound('payment-request')}
                disabled={!isEnabled}
                className="px-3 py-2 text-xs bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Payment
              </button>
              <button
                onClick={() => testSound('help-request')}
                disabled={!isEnabled}
                className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Help
              </button>
              <button
                onClick={() => testSound('food-ready')}
                disabled={!isEnabled}
                className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Food Ready
              </button>
            </div>
          </div>

          {/* Sound Descriptions */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
              <span>Payment Request: Soft, high-priority "ding"</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              <span>Help Request: Slightly urgent "chime"</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span>Food Ready: Positive "ting"</span>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
