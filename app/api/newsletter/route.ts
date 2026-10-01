import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || 'GCGL Daily Digest <onboarding@resend.dev>';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase is not configured. Add your public environment variables before subscribing.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: insertError } = await supabase.from('newsletter_signups').insert({ email });

    if (insertError && insertError.code !== '23505') {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (insertError?.code === '23505') {
      return NextResponse.json({ message: 'This email is already subscribed.' }, { status: 200 });
    }

    if (!resendApiKey) {
      return NextResponse.json(
        { message: 'Subscription saved. Add RESEND_API_KEY to send the daily digest email.' },
        { status: 202 }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResult = await resend.emails.send({
      from: resendFrom,
      to: [email],
      subject: 'Welcome to the GCGL Daily Digest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #b91c1c;">Welcome to GCGL Daily Digest</h2>
          <p>Thanks for signing up. You’ll receive the latest headlines and briefing notes in your inbox each day.</p>
          <p>We’re glad to have you on board.</p>
          <p style="margin-top: 24px;">Best,<br />The GCGL Editorial Team</p>
        </div>
      `,
      text: 'Welcome to the GCGL Daily Digest. You’ll receive the latest headlines and briefing notes in your inbox each day. Best, The GCGL Editorial Team',
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscription saved and confirmation email sent.' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
