import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CELEBRATION_PRESETS, CelebrationSettings } from '@/services/userSettingsService';
import confetti from 'canvas-confetti';

interface CelebrationOverlayProps {
  show: boolean;
  onComplete: () => void;
  style?: CelebrationSettings;
}

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  show,
  onComplete,
  style
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  // Helper function to get celebration text
  const getCelebrationText = () => {
    if (!style) return "Great job! 🎉";
    
    switch (style.type) {
      case 'custom':
        return `${style.phrase || 'Great job!'} ${style.emoji || '🎉'}`;
      case 'preset':
        const preset = CELEBRATION_PRESETS.find(p => p.id === style.preset);
        return preset?.phrase || "Great job! 🎉";
      default:
        return "Great job! 🎉";
    }
  };

  // Function to trigger sound effect
  const playSound = () => {
    if (!style?.effects?.sound || !audioRef.current) return;
    
    if (style.type === 'preset') {
      const preset = CELEBRATION_PRESETS.find(p => p.id === style.preset);
      audioRef.current.src = `/sounds/${preset?.sound || 'success'}.mp3`;
    } else {
      audioRef.current.src = '/sounds/success.mp3';
    }
    
    audioRef.current.play().catch(err => {
      console.error('Error playing celebration sound:', err);
    });
  };

  // Add randomized confetti colors based on theme
  const getConfettiColors = (theme: string = 'default') => {
    switch (theme) {
      case 'gold':
        return ['#FFD700', '#FFA500', '#FF8C00', '#FFDF00', '#F0E68C'];
      case 'rainbow':
        return ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
      case 'stars':
        return ['#FFD700', '#FFF8DC', '#FFFACD', '#FAFAD2', '#FFFFE0'];
      default:
        return ['#FF0000', '#00FF00', '#0000FF', '#FFD700', '#FF69B4'];
    }
  };

  // Function to trigger confetti
  const triggerConfetti = () => {
    if (!style?.effects?.confetti || !confettiCanvasRef.current) return;

    const canvasElement = confettiCanvasRef.current;
    const myConfetti = confetti.create(canvasElement, {
      resize: true,
      useWorker: true
    });

    // Get colors based on screen effect theme
    const colors = getConfettiColors(style.effects.screenEffect);

    // Fire confetti from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors,
      spread: 50,
      ticks: 100
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      myConfetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // Create more interesting confetti patterns
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
      startVelocity: 35,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 130,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });
  };

  useEffect(() => {
    if (show && !isVisible) {
      setIsVisible(true);
      playSound();
      triggerConfetti();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to hide overlay
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show]);

  // Get screen effect class based on settings
  const getScreenEffectClass = () => {
    if (!style?.effects?.screenEffect || style.effects.screenEffect === 'none') return '';

    switch (style.effects.screenEffect) {
      case 'gold':
        return 'bg-yellow-500/20';
      case 'stars':
        return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20';
      case 'rainbow':
        return 'bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-green-500/20';
      default:
        return '';
    }
  };

  // Add animation classes based on screen effect
  const getAnimationClass = () => {
    if (!style?.effects?.screenEffect || style.effects.screenEffect === 'none') return '';

    switch (style.effects.screenEffect) {
      case 'gold':
        return 'animate-pulse-gold';
      case 'stars':
        return 'animate-twinkle';
      case 'rainbow':
        return 'animate-rainbow';
      default:
        return '';
    }
  };

  if (!show && !isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center transition-all duration-500 z-50",
      getScreenEffectClass(),
      getAnimationClass(),
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Canvas for confetti */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-50"
      />
      
      {/* Audio element for sound effects */}
      <audio ref={audioRef} />
      
      {/* Celebration text */}
      <div className={cn(
        "text-4xl font-bold text-center transition-all duration-500 transform",
        "p-8 rounded-lg backdrop-blur-sm backdrop-brightness-125",
        isVisible ? "scale-100 translate-y-0" : "scale-90 translate-y-4"
      )}>
        {getCelebrationText()}
      </div>
    </div>
  );
};

export default CelebrationOverlay;