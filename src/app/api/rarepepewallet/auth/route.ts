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

    // Get tg_id and chat_id from URL query parameters
    const { searchParams } = new URL(request.url);
    const tg_id = searchParams.get('tg_id');
    const chat_id = searchParams.get('chat_id');

    if (!tg_id || !chat_id) {
      return NextResponse.json(
        { error: 'tg_id and chat_id are required in query parameters' },
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

    // This matches what the callback expects to verify
    const message = `Verify: telegram.xcp.io | User: ${tg_id} | Chat: ${chat_id}`;

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