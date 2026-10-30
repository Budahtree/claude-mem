// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resolveOpenAICompatConfig } from '../../src/services/worker/OpenAICompatProvider.js';
import { resolveOpenAICompatPreset } from '../../src/shared/openai-compat-presets.js';

// Hosted presets for endpoints with a free tier. None ships a default model:
// their free catalogs change too often for a pinned id to stay valid.

const ENV_KEYS = [
  'CLAUDE_MEM_OPENAI_COMPAT_PRESET',
  'CLAUDE_MEM_OPENAI_COMPAT_API_KEY',
  'CLAUDE_MEM_OPENAI_COMPAT_API_KEYS',
  'CLAUDE_MEM_OPENAI_COMPAT_BASE_URL',
  'CLAUDE_MEM_OPENAI_COMPAT_MODEL',
] as const;

const FREE_TIER_PRESETS: Array<[id: string, baseUrl: string, model: string]> = [
  ['cerebras', 'https://api.cerebras.ai/v1', 'llama3.1-8b'],
  ['mistral', 'https://api.mistral.ai/v1', 'mistral-small-latest'],
  ['sambanova', 'https://api.sambanova.ai/v1', 'Meta-Llama-3.3-70B-Instruct'],
  ['huggingface', 'https://router.huggingface.co/v1', 'Qwen/Qwen3-8B'],
  ['zai', 'https://api.z.ai/api/paas/v4', 'glm-4.5-flash'],
  ['zhipu-cn', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4-flash'],
];

describe('free-tier presets', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      process.env[key] = '';
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  for (const [id, baseUrl, model] of FREE_TIER_PRESETS) {
    it(`${id} needs a key and has no default model`, () => {
      const preset = resolveOpenAICompatPreset(id);
      expect(preset.id).toBe(id);
      expect(preset.baseUrl).toBe(baseUrl);
      expect(preset.defaultModel).toBe('');
      expect(preset.requiresApiKey).toBe(true);
    });

    it(`${id} resolves to its chat-completions URL with the model passed verbatim`, () => {
      process.env.CLAUDE_MEM_OPENAI_COMPAT_PRESET = id;
      process.env.CLAUDE_MEM_OPENAI_COMPAT_API_KEY = `${id}-fixture-key`;
      process.env.CLAUDE_MEM_OPENAI_COMPAT_MODEL = model;

      const config = resolveOpenAICompatConfig();
      expect(config.apiUrl).toBe(`${baseUrl}/chat/completions`);
      expect(config.model).toBe(model);
      expect(config.apiKey).toBe(`${id}-fixture-key`);
    });
  }
});
