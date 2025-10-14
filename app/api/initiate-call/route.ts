import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, agentId } = body;

    if (!phoneNumber || !agentId) {
      return NextResponse.json(
        { error: 'Phone number and agent ID are required' },
        { status: 400 }
      );
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching phone numbers from ElevenLabs...');

    // First, get the list of phone numbers configured in ElevenLabs
    const phoneNumbersResponse = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    });

    if (!phoneNumbersResponse.ok) {
      const error = await phoneNumbersResponse.text();
      console.error('Failed to fetch phone numbers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch phone numbers from ElevenLabs. Make sure you have connected a Twilio number in your ElevenLabs dashboard.' },
        { status: 500 }
      );
    }

    const phoneNumbersData = await phoneNumbersResponse.json();
    console.log('Phone numbers:', phoneNumbersData);

    if (!phoneNumbersData || phoneNumbersData.length === 0) {
      return NextResponse.json(
        { error: 'No phone numbers found in ElevenLabs. Please connect your Twilio number in the ElevenLabs dashboard first.' },
        { status: 400 }
      );
    }

    // Use the first available phone number
    const phoneNumberId = phoneNumbersData[0].phone_number_id;
    console.log('Using phone number ID:', phoneNumberId);

    console.log('Initiating call to:', phoneNumber);

    // Format phone number (ensure it starts with +)
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      // Assume US number if no country code
      formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
    }

    // Initiate outbound call via ElevenLabs Twilio integration
    const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number: formattedNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json(
        { error: `Failed to initiate call: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Call initiated:', data);

    return NextResponse.json({
      success: true,
      conversationId: data.conversation_id,
      callSid: data.callSid,
      message: data.message || `Call initiated to ${formattedNumber}`,
    });
  } catch (error: any) {
    console.error('Error initiating call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
