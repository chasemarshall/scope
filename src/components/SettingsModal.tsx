"use client";

import { useEffect, useState } from "react";
import { X, Key, Zap, MessageSquare } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const [openaiRes, openrouterRes, anthropicRes] = await Promise.all([
        fetch('/api/settings/openai-key'),
        fetch('/api/settings/openrouter-key'), 
        fetch('/api/settings/anthropic-key'),
      ]);

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        setOpenaiKey(data.value || "");
      }
      if (openrouterRes.ok) {
        const data = await openrouterRes.json();
        setOpenrouterKey(data.value || "");
      }
      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        setAnthropicKey(data.value || "");
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetch('/api/settings/openai-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: openaiKey }),
        }),
        fetch('/api/settings/openrouter-key', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: openrouterKey }),
        }),
        fetch('/api/settings/anthropic-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: anthropicKey }),
        }),
      ]);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-[rgb(var(--border))] rounded-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-green-400" />
              <label className="text-sm font-medium">OpenAI API Key</label>
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-purple-400" />
              <label className="text-sm font-medium">OpenRouter API Key</label>
            </div>
            <input
              type="password"
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-orange-400" />
              <label className="text-sm font-medium">Anthropic API Key</label>
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-neutral-700 rounded-lg hover:bg-neutral-800 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}