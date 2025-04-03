import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { getUserSettings, updateUserSettings } from '@/services/userSettingsService';
import { KeyRound } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const settings = await getUserSettings(user.id);
        if (settings?.openrouter_api_key) {
          setOpenRouterKey(settings.openrouter_api_key);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const success = await updateUserSettings(user.id, {
        openrouter_api_key: openRouterKey
      });

      if (success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your API keys for AI features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="openrouter-key" className="text-sm font-medium flex items-center">
              <KeyRound className="h-4 w-4 mr-2" />
              OpenRouter API Key
            </label>
            <Input
              id="openrouter-key"
              type="password"
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="Enter your OpenRouter API key"
            />
            <p className="text-xs text-muted-foreground">
              This key will be used for all AI features in your lessons
            </p>
          </div>

          <Button 
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;