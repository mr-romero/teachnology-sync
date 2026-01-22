import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { getUserSettings, updateUserSettings } from '@/services/userSettingsService';
import { KeyRound, Bot, Link, Loader2, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { fetchAvailableModels } from '@/services/aiService';
import { saveElevenLabsApiKey, getTTSSettings, saveTTSSettings, getElevenLabsApiKey } from '@/services/ttsService';

interface ModelOption {
  id: string;
  name: string;
  context_length?: number;
}

const Settings = () => {
  const { user } = useAuth();
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [openrouterEndpoint, setOpenrouterEndpoint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [ttsEnabled, setTTSEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedTTSModel, setSelectedTTSModel] = useState('eleven_monolingual_v1');

  // Load settings and models when component mounts
  useEffect(() => {
    const initialize = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const settings = await getUserSettings(user.id);
        console.log('Loaded settings:', settings);

        if (settings) {
          setOpenRouterKey(settings.openrouter_api_key || '');
          setDefaultModel(settings.default_model || 'mistralai/mistral-small-3.1-24b-instruct');
          setOpenrouterEndpoint(settings.openrouter_endpoint || 'https://openrouter.ai/api/v1/chat/completions');

          // Load models after setting the API key
          await loadAvailableModels();
        }

        const ttsSettings = await getTTSSettings(user.id);
        if (ttsSettings) {
          const apiKey = await getElevenLabsApiKey(user.id);
          setElevenLabsKey(apiKey || '');
          setTTSEnabled(ttsSettings.enabled);
          setSelectedVoice(ttsSettings.voice_id);
          setSelectedTTSModel(ttsSettings.model_id || 'eleven_monolingual_v1');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await fetchAvailableModels();
      if (models && models.length > 0) {
        setAvailableModels(models);
        toast.success(`Successfully loaded ${models.length} available models`);
      } else {
        toast.error("Could not fetch available models. Please check your API key.");
      }
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error("Failed to load models. Please check your API key and endpoint.");
    } finally {
      setIsLoadingModels(false);
    }
  };

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
        // After saving settings successfully, fetch available models
        loadAvailableModels();
      } else {
        toast.error('Failed to save settings');
      }

      const ttsSuccess = await saveTTSSettings(user.id, {
        enabled: ttsEnabled,
        voice_id: selectedVoice,
        auto_play: true,
        model_id: selectedTTSModel
      });

      if (ttsSuccess) {
        // Save ElevenLabs API key separately
        const apiKeySuccess = await saveElevenLabsApiKey(user.id, elevenLabsKey);
        if (apiKeySuccess) {
          toast.success('TTS settings saved successfully');
        } else {
          toast.error('Failed to save ElevenLabs API key');
        }
      } else {
        toast.error('Failed to save TTS settings');
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
            Configure your AI settings. Works with any OpenAI-compatible API (OpenRouter, LiteLLM, OpenAI, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="openrouter-key" className="text-sm font-medium flex items-center">
              <KeyRound className="h-4 w-4 mr-2" />
              API Key
            </label>
            <Input
              id="openrouter-key"
              type="password"
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="Enter your API key (sk-...)"
            />
            <p className="text-xs text-muted-foreground">
              Your API key for the AI endpoint (OpenAI, OpenRouter, LiteLLM, etc.)
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
                {availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.context_length && (
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(model.context_length / 1000)}k ctx)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  // Fallback default models
                  <>
                    <SelectItem value="mistralai/mistral-small">Mistral Small</SelectItem>
                    <SelectItem value="mistralai/mistral-medium">Mistral Medium</SelectItem>
                    <SelectItem value="anthropic/claude-2">Claude 2</SelectItem>
                    <SelectItem value="google/gemini-pro">Gemini Pro</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                This model will be used as the default for new AI chat blocks
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAvailableModels}
                disabled={isLoadingModels}
                className="h-8"
              >
                {isLoadingModels ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Models
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="openrouter-endpoint" className="text-sm font-medium flex items-center">
              <Link className="h-4 w-4 mr-2" />
              API Base URL
            </label>
            <Input
              id="openrouter-endpoint"
              type="text"
              value={openrouterEndpoint}
              onChange={(e) => setOpenrouterEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <p className="text-xs text-muted-foreground">
              The chat completions endpoint. Examples: <br />
              • OpenAI: https://api.openai.com/v1/chat/completions <br />
              • OpenRouter: https://openrouter.ai/api/v1/chat/completions <br />
              • LiteLLM: http://your-proxy:4000/v1/chat/completions
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Text-to-Speech Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="elevenlabs-key" className="text-sm font-medium flex items-center">
                  ElevenLabs API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    id="elevenlabs-key"
                    placeholder="Enter your ElevenLabs API key"
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                  />
                  <Button
                    onClick={() => user && saveElevenLabsApiKey(user.id, elevenLabsKey)}
                    disabled={!elevenLabsKey || !user}
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Get your API key from <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">ElevenLabs</a>
                </p>
              </div>

              <div>
                <label htmlFor="tts-enabled" className="text-sm font-medium flex items-center">
                  Enable Text-to-Speech
                </label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tts-enabled"
                    checked={ttsEnabled}
                    onCheckedChange={setTTSEnabled}
                  />
                  <label className="text-sm">Auto-play AI responses</label>
                </div>
              </div>

              <div>
                <label htmlFor="voice-selection" className="text-sm font-medium flex items-center">
                  AI Voice
                </label>
                <Select
                  value={selectedVoice}
                  onValueChange={setSelectedVoice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pNInz6obpgDQGcFmaJgB">Rachel</SelectItem>
                    <SelectItem value="21m00Tcm4TlvDq8ikWAM">Adam</SelectItem>
                    <SelectItem value="MF3mGyEYCl7XYWbV9V6O">Elli</SelectItem>
                    <SelectItem value="AZnzlk1XvdvUeBnXmlld">Sam</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose the voice for AI responses
                </p>
              </div>

              <div>
                <label htmlFor="tts-model" className="text-sm font-medium flex items-center">
                  TTS Model
                </label>
                <Select
                  value={selectedTTSModel}
                  onValueChange={setSelectedTTSModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a TTS model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eleven_monolingual_v1">Standard (Monolingual)</SelectItem>
                    <SelectItem value="eleven_multilingual_v2">Enhanced (Multilingual v2)</SelectItem>
                    <SelectItem value="eleven_turbo_v2">Turbo (Fastest)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose the model for text-to-speech conversion
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;