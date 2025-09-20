/**
 * Audio notification system for staff notifications
 * Generates subtle audio cues for different notification types
 */

export type NotificationSound = 'payment-request' | 'help-request' | 'food-ready';

class AudioNotificationManager {
  private audioContext: AudioContext | null = null;
  private isEnabled = true;
  private volume = 0.3; // Default volume (30%)

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    
    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Generate a soft, high-priority "ding" for payment requests
   */
  private playPaymentRequestSound() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a soft, high-priority "ding" sound
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.8, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  /**
   * Generate a different, slightly urgent "chime" for help requests
   */
  private playHelpRequestSound() {
    if (!this.audioContext) return;

    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a slightly urgent "chime" with two tones
    oscillator1.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(800, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.6, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

    oscillator1.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.6);
    
    oscillator2.start(this.audioContext.currentTime + 0.1);
    oscillator2.stop(this.audioContext.currentTime + 0.6);
  }

  /**
   * Generate a positive "ting" for food ready notifications
   */
  private playFoodReadySound() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a positive "ting" sound
    oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1500, this.audioContext.currentTime + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.7, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.6);
  }

  /**
   * Play notification sound based on type
   */
  playNotificationSound(type: NotificationSound) {
    if (!this.isEnabled) return;

    this.ensureAudioContext();

    switch (type) {
      case 'payment-request':
        this.playPaymentRequestSound();
        break;
      case 'help-request':
        this.playHelpRequestSound();
        break;
      case 'food-ready':
        this.playFoodReadySound();
        break;
      default:
        console.warn('Unknown notification sound type:', type);
    }
  }

  /**
   * Enable/disable audio notifications
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current enabled state
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

// Create singleton instance
export const audioNotificationManager = new AudioNotificationManager();

/**
 * Hook for using audio notifications in React components
 */
export function useAudioNotification() {
  const playSound = (type: NotificationSound) => {
    audioNotificationManager.playNotificationSound(type);
  };

  const setEnabled = (enabled: boolean) => {
    audioNotificationManager.setEnabled(enabled);
  };

  const setVolume = (volume: number) => {
    audioNotificationManager.setVolume(volume);
  };

  const getEnabled = () => {
    return audioNotificationManager.getEnabled();
  };

  const getVolume = () => {
    return audioNotificationManager.getVolume();
  };

  return {
    playSound,
    setEnabled,
    setVolume,
    getEnabled,
    getVolume
  };
}

/**
 * Map notification types to sound types
 */
export function getNotificationSoundType(notificationType: string): NotificationSound {
  switch (notificationType) {
    case 'kitchen_ready':
      return 'food-ready';
    case 'payment_request':
      return 'payment-request';
    case 'customer_help':
      return 'help-request';
    default:
      return 'payment-request'; // Default fallback
  }
}
