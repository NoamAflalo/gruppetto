import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseToken, rateLimit } from '@/lib/serverAuth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const sessionSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short title, max 6 words' },
    description: {
      type: 'string',
      description:
        'Bullet points with • symbol, separated by \\n. 2-3 bullets for simple runs, more for interval workouts. Each bullet under 20 words.',
    },
    distance: {
      type: 'string',
      description: 'Number + unit like "5km", "10km", or empty string',
    },
    intensity: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
  },
  required: ['title', 'description', 'distance', 'intensity'],
  additionalProperties: false,
};

export async function POST(request) {
  try {
    const user = await verifyFirebaseToken(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!rateLimit(`generate:${user.uid}`, { limit: 20, windowMs: 60 * 60 * 1000 })) {
      return Response.json(
        { error: 'Too many requests, try again later' },
        { status: 429 }
      );
    }

    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return Response.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: sessionSchema } },
      messages: [
        {
          role: 'user',
          content: `Generate a training session for: "${prompt}"

Examples:

Interval session:
{"title":"Hill Repeats Workout","description":"• Warm-up: 10min easy jog\\n• 8x 2min hard uphill, 2min recovery\\n• Cool-down: 10min easy\\n• Meet at Primrose Hill","distance":"8km","intensity":"hard"}

Simple run:
{"title":"Thames Easy Run","description":"• Conversational pace along river\\n• Meet at Battersea Bridge\\n• Perfect for beginners","distance":"5km","intensity":"easy"}

Track workout:
{"title":"Track Speed Session","description":"• Warm-up: 1.5km easy + drills\\n• 4x 400m at 5k pace, 90sec rest\\n• 3x 800m at 10k pace, 2min rest\\n• 2x 200m sprint\\n• Cool-down: 1km easy","distance":"8km","intensity":"hard"}

Use London locations (Battersea, Clapham, Richmond, Wimbledon). Be concise.`,
        },
      ],
    });

    const sessionData = JSON.parse(message.content[0].text);

    return Response.json(sessionData);
  } catch (error) {
    console.error('Error generating session:', error);
    console.error('Error details:', error.message);
    return Response.json({
      error: 'Failed to generate session',
      details: error.message
    }, { status: 500 });
  }
}
