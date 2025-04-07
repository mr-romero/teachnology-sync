// ...existing code...

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const settings = await getUserSettings(user.id);
        console.log('Loaded settings:', settings); // Add logging
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

  // Add logging to save settings
  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      console.log('Saving settings:', {
        openrouter_api_key: openRouterKey,
        default_model: defaultModel,
        openrouter_endpoint: openrouterEndpoint
      });

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
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  // ...rest of the file...