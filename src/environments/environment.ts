export const environment = {
  production: false,
  aiConfig: {
    // OpenAI Configuration (Paid)
    openaiApiKey: '',
    openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
    openaiModel: 'gpt-3.5-turbo',
    
    // Google Gemini Configuration (FREE - Get key at https://makersuite.google.com/app/apikey)
    geminiApiKey: '',
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    
    // Azure OpenAI Configuration (alternative)
    azureOpenaiApiKey: '',
    azureOpenaiEndpoint: '',
    azureOpenaiDeployment: '',
    
    // Analysis Settings
    maxTokens: 2000,
    temperature: 0.3,
    
    // Provider selection: 'local' | 'openai' | 'gemini'
    defaultProvider: 'local'
  }
};
