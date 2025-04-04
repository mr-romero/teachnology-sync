import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CELEBRATION_PRESETS, CelebrationSettings } from '@/services/userSettingsService';
import { Sparkles, Music, PartyPopper } from 'lucide-react';

interface CelebrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: CelebrationSettings) => void;
  initialConfig?: CelebrationSettings;
}

export const CelebrationConfigDialog: React.FC<CelebrationConfigDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialConfig
}) => {
  const [celebrationType, setCelebrationType] = useState<'custom' | 'preset' | 'default'>(
    initialConfig?.type || 'default'
  );
  const [customPhrase, setCustomPhrase] = useState(initialConfig?.phrase || '');
  const [customEmoji, setCustomEmoji] = useState(initialConfig?.emoji || '🎉');
  const [selectedPreset, setSelectedPreset] = useState(initialConfig?.preset || CELEBRATION_PRESETS[0].id);
  const [effects, setEffects] = useState(initialConfig?.effects || {
    confetti: true,
    sound: true,
    screenEffect: 'gold'
  });

  const handleSave = () => {
    const config: CelebrationSettings = {
      type: celebrationType,
      effects
    };

    if (celebrationType === 'custom') {
      config.phrase = customPhrase;
      config.emoji = customEmoji;
    } else if (celebrationType === 'preset') {
      config.preset = selectedPreset;
    }

    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Your Victory Celebration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={celebrationType}
            onValueChange={(value: 'custom' | 'preset' | 'default') => setCelebrationType(value)}
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default">Default Celebration</Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="preset" id="preset" />
                <Label htmlFor="preset">Choose a Preset</Label>
              </div>

              {celebrationType === 'preset' && (
                <div className="ml-6 grid grid-cols-2 gap-2">
                  {CELEBRATION_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      onClick={() => setSelectedPreset(preset.id)}
                      className="justify-start"
                    >
                      {preset.phrase}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Message</Label>
              </div>

              {celebrationType === 'custom' && (
                <div className="ml-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Your Victory Phrase</Label>
                    <Input
                      value={customPhrase}
                      onChange={(e) => setCustomPhrase(e.target.value)}
                      placeholder="e.g., You're brilliant!"
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Choose an Emoji</Label>
                    <Input
                      value={customEmoji}
                      onChange={(e) => setCustomEmoji(e.target.value)}
                      placeholder="🎉"
                      maxLength={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </RadioGroup>

          <div className="space-y-4">
            <Label>Effects</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PartyPopper className="h-4 w-4" />
                  <Label htmlFor="confetti">Confetti</Label>
                </div>
                <Switch
                  id="confetti"
                  checked={effects.confetti}
                  onCheckedChange={(checked) => 
                    setEffects(prev => ({ ...prev, confetti: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4" />
                  <Label htmlFor="sound">Sound Effects</Label>
                </div>
                <Switch
                  id="sound"
                  checked={effects.sound}
                  onCheckedChange={(checked) => 
                    setEffects(prev => ({ ...prev, sound: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <Label htmlFor="screenEffect">Screen Effect</Label>
                </div>
                <select
                  id="screenEffect"
                  value={effects.screenEffect}
                  onChange={(e) => 
                    setEffects(prev => ({ 
                      ...prev, 
                      screenEffect: e.target.value as 'none' | 'gold' | 'stars' | 'rainbow' 
                    }))
                  }
                  className="rounded-md border px-2 py-1"
                >
                  <option value="none">None</option>
                  <option value="gold">Gold</option>
                  <option value="stars">Stars</option>
                  <option value="rainbow">Rainbow</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CelebrationConfigDialog;