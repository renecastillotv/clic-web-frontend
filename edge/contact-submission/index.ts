// ================================================================
// Contact Submission Handler - Edge Function
// ================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.'
      }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log('📞 Contact submission request received:', req.url);

  try {
    // Initialize Supabase client with SERVICE_ROLE key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData = await req.json();
    console.log('📝 Request data received:', {
      hasNombre: !!requestData.nombre,
      hasTelefono: !!requestData.telefono,
      hasEmail: !!requestData.email,
      tipoServicio: requestData.tipo_servicio
    });

    // Validate required fields
    const { nombre, telefono, email, tipo_servicio, mensaje, preferencia_contacto } = requestData;

    if (!nombre || !telefono || !email || !tipo_servicio) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          requiredFields: ['nombre', 'telefono', 'email', 'tipo_servicio']
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract tracking data from URL parameters
    const url = new URL(req.url);
    const utmSource = url.searchParams.get('utm_source') || null;
    const utmMedium = url.searchParams.get('utm_medium') || null;
    const utmCampaign = url.searchParams.get('utm_campaign') || null;
    const utmContent = url.searchParams.get('utm_content') || null;
    const utmTerm = url.searchParams.get('utm_term') || null;
    const refParam = url.searchParams.get('ref') || null;
    const fbclid = url.searchParams.get('fbclid') || null;
    const gclid = url.searchParams.get('gclid') || null;

    // Get client information from headers
    const userAgent = req.headers.get('user-agent') || null;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     req.headers.get('x-real-ip') ||
                     null;
    const referer = req.headers.get('referer') || null;

    // Build tracking data object
    const trackingData = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      ref: refParam,
      fbclid: fbclid,
      gclid: gclid,
      user_agent: userAgent,
      referer: referer
    };

    console.log('📊 Tracking data:', trackingData);

    // Prepare submission data
    const submissionData = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim().toLowerCase(),
      tipo_servicio: tipo_servicio,
      mensaje: mensaje?.trim() || null,
      preferencia_contacto: preferencia_contacto || 'cualquiera',
      ip_address: clientIp,
      user_agent: userAgent,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      ref_param: refParam,
      fbclid: fbclid,
      gclid: gclid,
      referer: referer,
      tracking_data: trackingData,
      status: 'pendiente'
      // created_at se genera automáticamente por la base de datos
    };

    console.log('💾 Saving submission to database...');

    // Insert into contact_submissions table
    const { data: submission, error: insertError } = await supabase
      .from('contact_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw new Error(`Failed to save submission: ${insertError.message}`);
    }

    console.log('✅ Submission saved successfully:', submission.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Submission received successfully',
        data: {
          submission_id: submission.id,
          nombre: submission.nombre,
          tipo_servicio: submission.tipo_servicio,
          created_at: submission.created_at
        }
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error processing contact submission:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }
});
