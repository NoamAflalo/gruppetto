import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a professional running coach. Generate a training session based on this request: "${prompt}"

Return ONLY a JSON object (no markdown, no backticks) with:
{
  "title": "catchy title (max 50 chars)",
  "description": "motivating description with workout details (100-200 words)",
  "distance": "realistic distance like '5km', '10km', '15km'",
  "intensity": "easy" or "moderate" or "hard"
}

Make it specific, motivating, and realistic for the London area (Battersea, Clapham, Richmond, etc.).`
        }
      ]
    });

    const responseText = message.content[0].text;
    const sessionData = JSON.parse(responseText);

    return Response.json(sessionData);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to generate session' }, { status: 500 });
  }
}