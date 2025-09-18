import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'https://rarepepewallet.wtf',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Generate a unique message for this address to sign
    // This matches the format expected by the verify endpoint
    const message = `Verify Rare Pepe Wallet: ${address} | ${Date.now()}`;

    return NextResponse.json(
      { message },
      {
        headers: {
          'Access-Control-Allow-Origin': 'https://rarepepewallet.wtf',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Rare Pepe Wallet auth error:', error);
    return NextResponse.json(
      { error: 'Failed to process authentication request' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://rarepepewallet.wtf',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://rarepepewallet.wtf',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}