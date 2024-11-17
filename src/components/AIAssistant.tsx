import * as React from 'react';
import { OpenAI } from 'openai';

interface AIAssistantProps {
  onImageGenerate: (imageUrl: string) => void;
  onCodeSuggest: (code: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onImageGenerate,
  onCodeSuggest
}) => {
  const [prompt, setPrompt] = React.useState('');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const generateImage = async () => {
    try {
      const response = await openai.images.generate({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      onImageGenerate(response.data[0].url);
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <div className="ai-assistant">
      <input 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter prompt for image generation..."
      />
      <button onClick={generateImage}>Generate Image</button>
    </div>
  );
}; 