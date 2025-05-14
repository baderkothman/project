import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'webninjas55@gmail.com',
    pass: process.env.BREVO_SMTP_KEY,
  },
  tls: {
    rejectUnauthorized: false // For development
  }
});

// CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    // Always include CORS headers
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    };

    // Parse request body
    const { email, code } = await request.json();

    // Validate required fields
    if (!email || !code) {
      return new Response(
        JSON.stringify({ 
          error: 'Email and code are required',
          success: false 
        }), 
        { status: 400, headers }
      );
    }

    // Email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #228B22; text-align: center;">Your Verification Code</h1>
        <div style="background-color: #f5f5dc; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <h2 style="color: #8B5E3C; font-size: 24px; margin: 0;">Your code is:</h2>
          <div style="font-size: 36px; font-weight: bold; color: #228B22; margin: 20px 0; letter-spacing: 5px;">
            ${code}
          </div>
        </div>
        <p style="color: #666; text-align: center;">
          This code will expire in 30 minutes. If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    // Send email with retry logic
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        await transporter.sendMail({
          from: 'webninjas55@gmail.com',
          to: email,
          subject: 'Your Verification Code',
          html: emailHtml,
        });

        return new Response(
          JSON.stringify({ success: true }), 
          { status: 200, headers }
        );
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If we get here, all retries failed
    console.error('Failed to send email after retries:', lastError);
    throw lastError;

  } catch (error) {
    console.error('Error in email API:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send verification email',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }), 
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}