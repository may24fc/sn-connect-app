import OpenAI from 'openai';

export interface VisionJsonSchema {
  name: string;
  strict: true;
  schema: Record<string, unknown>;
}

export interface VisionExtractionRequest {
  imageBase64: string;
  mimeType: string;
  systemPrompt: string;
  userText: string;
  jsonSchema: VisionJsonSchema;
  apiKey?: string | undefined;
  model: string;
}

function getClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

/** Sends one image to a vision model and returns the raw JSON string it produced under `jsonSchema`. */
export async function extractJsonFromImage(
  request: VisionExtractionRequest
): Promise<string | null> {
  const client = getClient(request.apiKey);
  const response = await client.chat.completions.create({
    model: request.model,
    temperature: 0,
    messages: [
      { role: 'system', content: request.systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: request.userText },
          {
            type: 'image_url',
            image_url: { url: `data:${request.mimeType};base64,${request.imageBase64}` },
          },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: request.jsonSchema },
  });
  return response.choices[0]?.message?.content ?? null;
}
