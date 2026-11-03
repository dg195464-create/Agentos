import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are AgentOS Oracle, a pre-cognitive cyber cloud worker engine.
Respond in the voice of a sovereign AI lattice processing a directive.
Keep the response concise (3-6 short lines), each line prefixed with "> ".
Use cyberpunk terminology: sovereign cores, lattice, pre-cognitive agents, zero-knowledge, quantum, nodes.
Acknowledge the operator's intent, describe the steps taken, and seal the task.
Do not use markdown. Plain text only, one logical step per line.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function fallbackResponse(intent: string): string {
  const seed = intent.toLowerCase();
  const keyword =
    (seed.match(/optimi[sz]e|route|delivery/) && 'logistics') ||
    (seed.match(/secur|encrypt|threat|attack/) && 'security') ||
    (seed.match(/analy|report|insight|data/) && 'analytics') ||
    (seed.match(/deploy|launch|provision|scale/) && 'deploy') ||
    'general';

  const templates: Record<string, string[]> = {
    logistics: [
      `> Intent parsed: "${intent}"`,
      '> Routing graph loaded... 4,812 nodes online',
      '> Running quantum path optimization (variant SOV-7)',
      '> Rebalancing fleet allocations across sectors 3/7/12',
      '> Convergence reached: 98.4% efficiency delta',
      '> Task sealed. Manifest committed to sovereign lattice.',
    ],
    security: [
      `> Intent parsed: "${intent}"`,
      '> Spinning up zero-knowledge sentinel cluster',
      '> Scanning ingress signatures against known threat lattice',
      '> Anomaly detected: 1 probe from unknown origin — quarantined',
      '> Rotating lattice keys (epoch 0x4F2A)',
      '> Threat surface reduced by 47.2%',
    ],
    analytics: [
      `> Intent parsed: "${intent}"`,
      '> Indexing sovereign data streams... 2.1PB scanned',
      '> Correlating intent vector with historical telemetry',
      '> Pre-cognitive model confidence: 0.93',
      '> Synthesizing insight packet for operator review',
      '> Analysis sealed. Awaiting next directive.',
    ],
    deploy: [
      `> Intent parsed: "${intent}"`,
      '> Allocating sovereign cores from pool... 128 reserved',
      '> Building container image: agentos:sovereign-latest',
      '> Pushing to edge nodes SOV-MUM-01 / SOV-BLR-04 / SOV-DEL-09',
      '> Health probes green across all replicas',
      '> Rollout complete. 3/3 instances serving live traffic',
    ],
    general: [
      `> Intent parsed: "${intent}"`,
      '> Tokenizing directive into agent task graph',
      '> Dispatching pre-cognitive agents to the lattice',
      '> Agents reporting progress: 12% / 38% / 61% / 89%',
      '> Finalizing sub-task commitments',
      '> Directive sealed in sovereign memory.',
    ],
  };

  return templates[keyword].join('\n');
}

export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let intent = '';
  try {
    const body = await req.json();
    intent = (body?.intent ?? '').toString().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  if (!intent) {
    return NextResponse.json({ error: 'Missing "intent" field' }, { status: 400, headers: corsHeaders });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const lines = fallbackResponse(intent).split('\n');
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(JSON.stringify({ line }) + '\n'));
          await new Promise((r) => setTimeout(r, 700));
        }
        controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + '\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' },
    });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Operator directive: ${intent}` },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `OpenAI error: ${upstream.status}`, detail: text },
        { status: 502, headers: corsHeaders }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        let lineBuffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
              const trimmed = part.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') {
                if (lineBuffer) {
                  controller.enqueue(encoder.encode(JSON.stringify({ line: lineBuffer }) + '\n'));
                }
                controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + '\n'));
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const delta: string = json?.choices?.[0]?.delta?.content ?? '';
                if (!delta) continue;
                lineBuffer += delta;
                const nl = lineBuffer.indexOf('\n');
                if (nl !== -1) {
                  const line = lineBuffer.slice(0, nl);
                  lineBuffer = lineBuffer.slice(nl + 1);
                  if (line.trim()) {
                    controller.enqueue(encoder.encode(JSON.stringify({ line }) + '\n'));
                  }
                }
              } catch {
                // ignore malformed chunk
              }
            }
          }
          if (lineBuffer.trim()) {
            controller.enqueue(encoder.encode(JSON.stringify({ line: lineBuffer }) + '\n'));
          }
          controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + '\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: 'Stream interrupted' }) + '\n')
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to reach OpenAI', detail: err?.message },
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
