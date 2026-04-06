import { NextResponse } from 'next/server';

export async function GET() {
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  
  return NextResponse.json({
    youtubeKeyExists: !!youtubeKey,
    youtubeKeyLength: youtubeKey?.length || 0,
    youtubeKeyPrefix: youtubeKey ? youtubeKey.substring(0, 10) + '...' : null,
    allEnvVars: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('TOKEN') && !k.includes('KEY')),
  });
}
