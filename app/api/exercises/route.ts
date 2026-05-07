import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const value = searchParams.get('value');

  if (!type || !value) {
    return NextResponse.json({ error: 'type and value are required' }, { status: 400 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta la RAPIDAPI_KEY. Configúrala en el panel de Ajustes > Secretos (Settings > Secrets) de AI Studio.' }, { status: 500 });
  }

  const url = `https://exercisedb.p.rapidapi.com/exercises/${type}/${value}`;
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `API error: ${response.status} ${text}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching from ExerciseDB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
