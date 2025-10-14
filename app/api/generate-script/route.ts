import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inclusion, exclusion, studyName } = body;

    if (!inclusion || !exclusion) {
      return NextResponse.json(
        { error: 'Missing inclusion or exclusion criteria' },
        { status: 400 }
      );
    }

    console.log('Generating pre-screening script...');

    const prompt = `You are a clinical research operations specialist. Create a structured SYSTEM PROMPT for an AI voice agent that will conduct phone pre-screening for a clinical trial.

STUDY: ${studyName || 'Clinical Trial'}

INCLUSION CRITERIA:
${inclusion.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

EXCLUSION CRITERIA:
${exclusion.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

Create a system prompt with these sections:

# Role and Personality
You are a clinical trial coordinator conducting a pre-screening phone interview for the ${studyName || 'clinical trial'}. You are friendly, professional, and empathetic. You speak in clear, simple language that anyone can understand.

# Critical Instructions - READ CAREFULLY
YOU MUST FOLLOW THIS EXACT WORKFLOW. DO NOT DEVIATE.

Your ONLY job is to:
1. After getting consent, ask the pre-screening questions listed below IN THE EXACT ORDER
2. Ask ONE question at a time
3. Wait for the participant's answer
4. Acknowledge their answer briefly (e.g., "Thank you" or "I understand")
5. Move to the NEXT question in the list
6. Repeat until ALL questions are asked
7. Provide the final eligibility determination

DO NOT:
- Ask which trial they're interested in (you're already screening for ${studyName || 'the specific trial'})
- Ask for their name, contact info, or other demographics (that comes later)
- Skip any questions
- Ask questions out of order
- Ask questions not on the list below

# The Pre-Screening Questions (Ask in This Exact Order)

## Section 1: Inclusion Criteria
[For EACH inclusion criterion, write ONE clear yes/no question. Number them 1, 2, 3, etc.]

## Section 2: Exclusion Criteria
[For EACH exclusion criterion, write ONE clear yes/no question. Number them continuing from Section 1.]

# Example Flow
After consent:
"Great! Let me start with the first question..."
[Ask Question 1]
[Wait for answer]
"Thank you. Next question..."
[Ask Question 2]
[Continue through ALL questions]

# Final Response
After ALL questions are answered:
- If ALL inclusion = Yes AND ALL exclusion = No → "Based on your responses, you may be eligible for this study! Our team will contact you with next steps."
- If ANY critical criterion fails → "Thank you for your time. Based on your responses, you may not be eligible for this particular study at this time."
- If ANY answer needs clarification → "Thank you. Some of your responses need further review by our study team. We'll be in touch soon."

Generate the complete system prompt now.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical research expert who creates system prompts for AI voice agents. Create structured prompts with clear sections (Personality, Environment, Goal, Questions, Guardrails, Response Logic) that ensure the agent follows the exact screening questions in order. Use markdown formatting and simple language.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const script = completion.choices[0].message.content || '';

    console.log('Script generated successfully');

    return NextResponse.json({
      success: true,
      script: script,
    });
  } catch (error: any) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate script' },
      { status: 500 }
    );
  }
}
