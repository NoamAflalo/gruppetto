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
          content: `Generate a training session for: "${prompt}"

You MUST respond with ONLY valid JSON. No markdown, no backticks, no explanation.

Format:
{"title":"Short title","description":"• Bullet 1\\n• Bullet 2\\n• Bullet 3","distance":"5km","intensity":"easy"}

Rules:
- title: max 6 words
- description: bullet points with • symbol, separated by \\n. Number of bullets depends on session complexity (2-3 for simple runs, more for interval workouts)
- distance: number + unit like "5km", "10km" or empty string ""
- intensity: must be exactly "easy", "moderate", or "hard"

Examples:

Interval session:
{"title":"Hill Repeats Workout","description":"• Warm-up: 10min easy jog\\n• 8x 2min hard uphill, 2min recovery\\n• Cool-down: 10min easy\\n• Meet at Primrose Hill","distance":"8km","intensity":"hard"}

Simple run:
{"title":"Thames Easy Run","description":"• Conversational pace along river\\n• Meet at Battersea Bridge\\n• Perfect for beginners","distance":"5km","intensity":"easy"}

Track workout:
{"title":"Track Speed Session","description":"• Warm-up: 1.5km easy + drills\\n• 4x 400m at 5k pace, 90sec rest\\n• 3x 800m at 10k pace, 2min rest\\n• 2x 200m sprint\\n• Cool-down: 1km easy","distance":"8km","intensity":"hard"}

Use London locations (Battersea, Clapham, Richmond, Wimbledon). Keep each bullet under 20 words. Be concise.`
        }
      ]
    });

    const responseText = message.content[0].text;
    
    // Nettoie le JSON si Claude l'entoure de backticks markdown
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    
    const sessionData = JSON.parse(cleanedText);

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