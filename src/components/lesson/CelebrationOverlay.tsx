import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { generateSuccessSound, generateChimeSound, generateApplauseSound } from '@/utils/generateSounds';
import { CELEBRATION_PRESETS } from '@/services/userSettingsService';

interface CelebrationOverlayProps {
  show: boolean;
  onComplete: () => void;
  style?: {
    type: 'custom' | 'preset' | 'default';
    phrase?: string;
    emoji?: string;
    preset?: string;
    effects?: {
      confetti: boolean;
      sound: boolean;
      screenEffect: 'none' | 'gold' | 'stars' | 'rainbow';
    };
  };
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  show,
  onComplete,
  style = {
    type: 'default',
    effects: {
      confetti: true,
      sound: true,
      screenEffect: 'gold'
    }
  }
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Play sound if enabled
      if (style.effects?.sound) {
        // Get sound type from preset if using one
        let soundType = 'success';
        if (style.type === 'preset' && style.preset) {
          const preset = CELEBRATION_PRESETS.find(p => p.id === style.preset);
          if (preset) {
            soundType = preset.sound;
          }
        }
        
        // Play the appropriate sound
        switch (soundType) {
          case 'success':
            generateSuccessSound();
            break;
          case 'chime':
            generateChimeSound();
            break;
          case 'applause':
            generateApplauseSound();
            break;
        }
      }
      
      // Trigger confetti if enabled
      if (style.effects?.confetti) {
        const duration = 1500;
        const end = Date.now() + duration;

        const colors = ['#ffd700', '#ffa500', '#ff69b4'];

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: colors
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: colors
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      }

      // Hide after animation
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500); // Wait for exit animation
      }, 2000);
    }
  }, [show, style]);

  const getBackgroundClass = () => {
    // Get effect from preset if using one
    let effectType = style.effects?.screenEffect || 'none';
    if (style.type === 'preset' && style.preset) {
      const preset = CELEBRATION_PRESETS.find(p => p.id === style.preset);
      if (preset) {
        effectType = preset.effect;
      }
    }

    switch (effectType) {
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500/20 via-yellow-300/30 to-yellow-500/20';
      case 'rainbow':
        return 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-yellow-500/20';
      case 'stars':
        return 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20';
      default:
        return 'bg-black/30';
    }
  };

  const getMessage = () => {
    if (style.type === 'custom' && style.phrase) {
      return `${style.phrase} ${style.emoji || ''}`;
    }
    
    if (style.type === 'preset' && style.preset) {
      const preset = CELEBRATION_PRESETS.find(p => p.id === style.preset);
      return preset ? preset.phrase : 'Correct! 🎉';
    }
    
    return 'Correct! 🎉';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 flex items-center justify-center z-50",
            getBackgroundClass()
          )}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white shadow-lg">
              {getMessage()}
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationOverlay;