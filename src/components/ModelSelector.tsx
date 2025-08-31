"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Bot } from "lucide-react";

interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching models from /api/models...');
      const response = await fetch('/api/models');
      const data = await response.json();
      
      console.log('Models API response:', { status: response.status, data });
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch models');
      }
      
      setModels(data.models || []);
      console.log('Models set:', data.models?.length || 0, 'models');
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const getModelDisplayName = (modelId: string) => {
    // Format model names for better readability
    if (modelId.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (modelId.includes('gpt-4o')) return 'GPT-4o';
    if (modelId.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
    if (modelId.includes('gpt-4')) return 'GPT-4';
    if (modelId.includes('gpt-3.5-turbo')) return 'GPT-3.5 Turbo';
    return modelId;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Bot size={16} />
        <span>Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Bot size={16} />
        <span>Models unavailable</span>
      </div>
    );
  }

  const selectedModelObj = models.find(m => m.id === selectedModel);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bot size={16} />
        <span className="font-medium">
          {selectedModelObj ? getModelDisplayName(selectedModelObj.id) : 'Select Model'}
        </span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-[rgb(var(--border))] bg-neutral-900/95 backdrop-blur shadow-xl z-50">
          <div className="p-2">
            <div className="text-[11px] uppercase text-neutral-500 px-2 pb-2">
              Available Models
            </div>
            <div className="max-h-60 overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left text-sm transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {getModelDisplayName(model.id)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {model.id}
                    </div>
                  </div>
                  {selectedModel === model.id && (
                    <Check size={16} className="text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}