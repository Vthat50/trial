import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, studyName } = body;

    if (!script) {
      return NextResponse.json(
        { error: 'Missing script' },
        { status: 400 }
      );
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file' },
        { status: 500 }
      );
    }

    console.log('Creating ElevenLabs voice agent...');
    console.log('Script received, length:', script?.length || 0);
    console.log('Script type:', typeof script);
    console.log('Script preview (first 300 chars):', script?.substring(0, 300));

    const requestBody = {
      name: `${studyName} Pre-Screening Agent`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: script,
            llm: 'gpt-4o',
          },
          first_message: `Hello! Thank you for your interest in the ${studyName} clinical trial. I'm here to conduct a brief pre-screening to see if you might be eligible. This will only take a few minutes. Do I have your permission to ask you some questions about your health?`,
          language: 'en',
        },
      },
    };

    console.log('Request body prompt field:', requestBody.prompt);

    // Create conversational AI agent with minimal config
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json(
        { error: `Failed to create agent: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Voice agent created:', data);

    // Now assign the agent to the phone number
    console.log('Fetching phone numbers to assign agent...');
    const phoneNumbersResponse = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    });

    if (phoneNumbersResponse.ok) {
      const phoneNumbers = await phoneNumbersResponse.json();
      if (phoneNumbers && phoneNumbers.length > 0) {
        const phoneNumberId = phoneNumbers[0].phone_number_id;
        console.log('Assigning agent to phone number:', phoneNumberId);

        // Update phone number to assign the agent
        const assignResponse = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
          method: 'PATCH',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assigned_agent_id: data.agent_id,
          }),
        });

        if (assignResponse.ok) {
          console.log('Agent assigned to phone number successfully');
        } else {
          console.error('Failed to assign agent to phone number:', await assignResponse.text());
        }
      }
    }

    return NextResponse.json({
      success: true,
      agentId: data.agent_id,
      message: 'Voice agent created successfully',
      agentUrl: `https://elevenlabs.io/app/conversational-ai/${data.agent_id}`,
    });
  } catch (error: any) {
    console.error('Error creating voice agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create voice agent' },
      { status: 500 }
    );
  }
}
