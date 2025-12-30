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
  "title": "Short catchy title (max 6 words)",
  "description": "Bullet points describing the session. Use • symbol. Format depends on session type:\n- For intervals/workouts: one bullet per block (warm-up, intervals, cool-down)\n- For simple runs: 2-3 bullets about pace, route, who it's for\n- Keep each bullet under 20 words\n- Start directly with bullets, no intro paragraph",
  "distance": "Distance with unit like '5km', '10km', '8 miles' or empty string",
  "intensity": "easy" or "moderate" or "hard"
}

Examples:

Interval session:
{
  "title": "Hill Repeats Workout",
  "description": "• Warm-up: 10min easy jog\n• 8x 2min hard uphill, 2min recovery down\n• Cool-down: 10min easy\n• Meet at Primrose Hill",
  "distance": "8km",
  "intensity": "hard"
}

Simple run:
{
  "title": "Thames Path Easy Run",
  "description": "• Conversational pace along the river\n• Meet at Battersea Bridge, head to Chelsea\n• Perfect for beginners and recovery",
  "distance": "5km",
  "intensity": "easy"
}

Track workout:
{
  "title": "Track Speed Session",
  "description": "• Warm-up: 1.5km easy + drills\n• 4x 400m at 5k pace, 90sec rest\n• 3x 800m at 10k pace, 2min rest\n• 2x 200m sprint, full recovery\n• Cool-down: 1km easy",
  "distance": "8km",
  "intensity": "hard"
}

Use locations in South West London (Battersea, Clapham, Richmond, Wimbledon, etc.). Keep it CONCISE.`
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