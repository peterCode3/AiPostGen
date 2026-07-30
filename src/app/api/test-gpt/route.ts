import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), tests: {} };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  results.tests.apiKeys = {
    anthropic: apiKey ? 'configured' : 'missing',
  };

  if (!apiKey) {
    results.summary = { overall: 'Anthropic API key missing' };
    return NextResponse.json(results, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model,
      max_tokens: 50,
      messages: [
        { role: 'user', content: "Reply with the single sentence: 'Claude is reachable.'" },
      ],
    });
    const message = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    results.tests.anthropic = {
      status: 'success',
      model,
      message,
      usage: res.usage,
    };
    results.summary = { overall: 'Anthropic provider working', provider: `Claude ${model}` };
    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    results.tests.anthropic = { status: 'failed', error: err.message };
    results.summary = { overall: 'Anthropic provider failed' };
    return NextResponse.json(results, { status: 500 });
  }
}
