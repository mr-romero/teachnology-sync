import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { getUserSettings, updateUserSettings } from '@/services/userSettingsService';
import { KeyRound, Bot, Link } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings = () => {
  const { user } = useAuth();
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [openrouterEndpoint, setOpenrouterEndpoint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const settings = await getUserSettings(user.id);
        if (settings) {
          setOpenRouterKey(settings.openrouter_api_key || '');
          setDefaultModel(settings.default_model || 'mistralai/mistral-small');
          setOpenrouterEndpoint(settings.openrouter_endpoint || 'https://openrouter.ai/api/v1/chat/completions');
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
        openrouter_api_key: openRouterKey,
        default_model: defaultModel,
        openrouter_endpoint: openrouterEndpoint
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
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure your AI settings and API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-2">
            <label htmlFor="default-model" className="text-sm font-medium flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Default AI Model
            </label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a default model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mistralai/mistral-small">Mistral Small</SelectItem>
                <SelectItem value="mistralai/mistral-medium">Mistral Medium</SelectItem>
                <SelectItem value="anthropic/claude-2">Claude 2</SelectItem>
                <SelectItem value="google/gemini-pro">Gemini Pro</SelectItem>
                <SelectItem value="meta-llama/codellama-34b">CodeLlama 34B</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This model will be used as the default for new AI chat blocks
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="openrouter-endpoint" className="text-sm font-medium flex items-center">
              <Link className="h-4 w-4 mr-2" />
              OpenRouter Endpoint
            </label>
            <Input
              id="openrouter-endpoint"
              type="text"
              value={openrouterEndpoint}
              onChange={(e) => setOpenrouterEndpoint(e.target.value)}
              placeholder="https://openrouter.ai/api/v1/chat/completions"
            />
            <p className="text-xs text-muted-foreground">
              The API endpoint for OpenRouter requests
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