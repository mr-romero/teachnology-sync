import React, { useState, useEffect } from 'react';
import { AIChatBlock, MATH_FORMATTING_GUIDE } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  HelpCircle, 
  Trash, 
  Plus, 
  X,
  Key,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchAvailableModels } from '@/services/aiService';
import { useToast } from "@/components/ui/use-toast";

interface AIChatBlockEditorProps {
  block: AIChatBlock;
  onUpdate: (updatedBlock: AIChatBlock) => void;
  onDelete: () => void;
}

interface ModelOption {
  id: string;
  name: string;
  context_length?: number;
  pricing?: any;
}

const AIChatBlockEditor: React.FC<AIChatBlockEditorProps> = ({
  block,
  onUpdate,
  onDelete
}) => {
  const [instructions, setInstructions] = useState(block.instructions || 'Ask me questions about this topic.');
  const [systemPrompt, setSystemPrompt] = useState(block.systemPrompt || 'You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding.');
  const [sentenceStarters, setSentenceStarters] = useState<string[]>(
    block.sentenceStarters || ['What is...?', 'Can you explain...?', 'Why does...?']
  );
  const [newStarter, setNewStarter] = useState('');
  const [targetConclusion, setTargetConclusion] = useState(block.targetConclusion || '');
  const [apiEndpoint, setApiEndpoint] = useState(block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions');
  const [modelName, setModelName] = useState(block.modelName || 'openai/gpt-3.5-turbo');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsFetched, setModelsFetched] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState(false);
  const [repetitionPrevention, setRepetitionPrevention] = useState(
    block.repetitionPrevention || "You should provide a direct answer to the question rather than repeating the prompt. Focus on explaining the solution step by step."
  );
  const [maxTokens, setMaxTokens] = useState(block.maxTokens || 500);
  const [includeMathFormatting, setIncludeMathFormatting] = useState(
    block.systemPrompt?.includes('When responding with mathematical content') || false
  );
  const { toast } = useToast();
  
  const handleAddSentenceStarter = () => {
    if (newStarter.trim()) {
      setSentenceStarters([...sentenceStarters, newStarter.trim()]);
      setNewStarter('');
    }
  };
  
  const handleRemoveSentenceStarter = (index: number) => {
    const updatedStarters = [...sentenceStarters];
    updatedStarters.splice(index, 1);
    setSentenceStarters(updatedStarters);
  };
  
  // Load available models when API key is provided
  useEffect(() => {
    if (!modelsFetched) {
      loadAvailableModels();
    }
  }, []);
  
  // Function to load available models
  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    
    try {
      const models = await fetchAvailableModels();
      
      if (models && models.length > 0) {
        setAvailableModels(models);
        setModelsFetched(true);
        toast({
          title: "Models Loaded",
          description: `Successfully loaded ${models.length} available models`,
        });
      } else {
        toast({
          title: "Error Loading Models",
          description: "Could not fetch available models. Please check your API key and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({
        title: "Error Loading Models",
        description: "An error occurred while fetching models. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  // Update system prompt with math formatting when toggled
  useEffect(() => {
    if (includeMathFormatting) {
      // Only add if not already present
      if (!systemPrompt.includes('When responding with mathematical content')) {
        setSystemPrompt(prevPrompt => `${prevPrompt}\n\n${MATH_FORMATTING_GUIDE}`);
      }
    } else {
      // Remove math formatting guide if present
      if (systemPrompt.includes('When responding with mathematical content')) {
        setSystemPrompt(prevPrompt => 
          prevPrompt.replace(MATH_FORMATTING_GUIDE, '').trim()
        );
      }
    }
  }, [includeMathFormatting]);

  // Automatically save changes as they're made
  React.useEffect(() => {
    const updatedBlock: AIChatBlock = {
      ...block,
      instructions,
      systemPrompt,
      sentenceStarters,
      targetConclusion,
      apiEndpoint,
      modelName,
      repetitionPrevention,
      maxTokens
    };
    onUpdate(updatedBlock);
  }, [
    instructions, 
    systemPrompt, 
    sentenceStarters, 
    targetConclusion, 
    apiEndpoint, 
    modelName,
    repetitionPrevention,
    maxTokens
  ]);
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue="content">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="prompting">Prompting</TabsTrigger>
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="instructions">Instructions for Students</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter instructions for students..."
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                These instructions will be shown to students above the chat interface.
              </p>
            </div>
            
            <div>
              <Label>Sentence Starters</Label>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                {sentenceStarters.map((starter, index) => (
                  <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                    {starter}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-full"
                      onClick={() => handleRemoveSentenceStarter(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newStarter}
                  onChange={(e) => setNewStarter(e.target.value)}
                  placeholder="Add a sentence starter..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSentenceStarter();
                    }
                  }}
                />
                <Button onClick={handleAddSentenceStarter} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                These will appear as buttons that students can click to start their message.
              </p>
            </div>
            
            <div>
              <Label htmlFor="targetConclusion">Target Conclusion (Optional)</Label>
              <Textarea
                id="targetConclusion"
                value={targetConclusion}
                onChange={(e) => setTargetConclusion(e.target.value)}
                placeholder="What understanding should students reach by the end of the conversation?"
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This helps you guide the AI toward a specific educational goal or conclusion.
              </p>
            </div>
          </div>
        </TabsContent>
        
        {/* Prompting Tab */}
        <TabsContent value="prompting" className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>
                      The system prompt tells the AI how to behave. Use this to set the AI's tone,
                      knowledge boundaries, and educational goals.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt for the AI..."
              className="min-h-[200px]"
            />
            
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Prompt Tips</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  <li>Be specific about the educational goals</li>
                  <li>Include any key concepts the AI should emphasize</li>
                  <li>If you provided a target conclusion, reference it here</li>
                  <li>Consider age-appropriate language</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        {/* API Settings Tab */}
        <TabsContent value="api" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://openrouter.ai/api/v1/chat/completions"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Default: OpenRouter.ai. Change to use a different provider like OpenAI.
              </p>
            </div>
            
            <div>
              <Label htmlFor="modelName">Model Name</Label>
              {availableModels.length > 0 ? (
                <Select
                  value={modelName}
                  onValueChange={setModelName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          {model.context_length && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {Math.round(model.context_length / 1000)}k ctx
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-2 mb-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={loadAvailableModels}
                    disabled={isLoadingModels}
                  >
                    {isLoadingModels ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading available models...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Fetch available models
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to fetch available models. Make sure you have set your API key in Settings.
                  </p>
                </div>
              )}
              {!modelsFetched && modelName && (
                <div className="mt-2">
                  <Alert variant="outline" className="bg-amber-50">
                    <p className="text-amber-700 text-sm">
                      Currently using: <span className="font-semibold">{modelName}</span>
                    </p>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="repetitionPrevention">Anti-Repetition Instructions</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>
                        This instruction will be added to the system prompt to help prevent the AI 
                        from repeating the prompt back to the student. This is particularly useful for 
                        certain models that tend to be repetitive.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="repetitionPrevention"
                value={repetitionPrevention}
                onChange={(e) => setRepetitionPrevention(e.target.value)}
                placeholder="Add instructions to prevent the AI from repeating the prompt..."
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="maxTokens">Maximum Response Length (tokens)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>
                        Limits the length of AI responses. Lower values can help prevent repetition and keep answers concise.
                        Recommended range: 200-1000 tokens.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Slider 
                  id="maxTokens"
                  value={[maxTokens]} 
                  onValueChange={(value) => setMaxTokens(value[0])}
                  min={100}
                  max={2000}
                  step={50}
                  className="flex-1"
                />
                <Input 
                  type="number" 
                  value={maxTokens} 
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-20"
                  min={100}
                  max={2000}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="includeMathFormatting">Include Math Formatting</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>
                        Toggle this option to include or exclude math formatting instructions in the system prompt.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeMathFormatting"
                  checked={includeMathFormatting}
                  onChange={(e) => setIncludeMathFormatting(e.target.checked)}
                />
                <Label htmlFor="includeMathFormatting">Include Math Formatting</Label>
              </div>
            </div>
            
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Model Selection Tips</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  <li>Some models (like GPT-3.5-Turbo) may be more prone to repeating prompts</li>
                  <li>If you experience repetition issues, try a different model from the API Settings tab</li>
                  <li>Anthropic's Claude models often work better for educational content</li>
                  <li>Reduce the response length to minimize repetition</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between pt-4 border-t mt-6">
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-1" />
          Delete Block
        </Button>
      </div>
    </div>
  );
};

export default AIChatBlockEditor;
