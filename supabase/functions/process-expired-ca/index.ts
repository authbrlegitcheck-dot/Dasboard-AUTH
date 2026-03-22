import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Brasília timezone for all date operations
    const nowBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const now = nowBrasilia.toISOString();
    
    const { data: expiredPurchases, error: fetchError } = await supabase
      .from('ca_purchases')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', now)
      .gt('credits_remaining', 0);

    if (fetchError) {
      console.error('Error fetching expired purchases:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredPurchases?.length || 0} expired purchases to process`);

    const processed = [];

    for (const purchase of expiredPurchases || []) {
      // Calculate the value of expired credits
      const unitPrice = purchase.price_paid / purchase.credits_purchased;
      const expiredValue = unitPrice * purchase.credits_remaining;

      console.log(`Processing purchase ${purchase.id}: ${purchase.credits_remaining} credits expired, value: R$ ${expiredValue.toFixed(2)}`);

      // Create an authentication record for the expired credits (counted as revenue)
      const { error: authError } = await supabase
        .from('authentications')
        .insert({
          date: now,
          result: 'AUTH',
          item_category: 'personalizado',
          price: expiredValue,
          brand: 'CA Expirado',
          item_name: `Créditos CA Expirados - ${purchase.credits_remaining} créditos`,
          code: `#EXP-${purchase.id.slice(0, 8).toUpperCase()}`,
          requester_name: 'Sistema',
          customer_id: purchase.customer_id,
          paid_with_ca: false,
        });

      if (authError) {
        console.error(`Error creating authentication for expired CA:`, authError);
        continue;
      }

      // Update the purchase status to expired and zero out remaining credits
      const { error: updateError } = await supabase
        .from('ca_purchases')
        .update({
          status: 'expired',
          credits_remaining: 0,
        })
        .eq('id', purchase.id);

      if (updateError) {
        console.error(`Error updating purchase ${purchase.id}:`, updateError);
        continue;
      }

      // Update customer balance
      const { data: customer, error: customerFetchError } = await supabase
        .from('customers')
        .select('ca_balance')
        .eq('id', purchase.customer_id)
        .single();

      if (!customerFetchError && customer) {
        const newBalance = Math.max(0, customer.ca_balance - purchase.credits_remaining);
        await supabase
          .from('customers')
          .update({ ca_balance: newBalance })
          .eq('id', purchase.customer_id);
      }

      // Create a transaction record
      await supabase
        .from('ca_transactions')
        .insert({
          customer_id: purchase.customer_id,
          purchase_id: purchase.id,
          type: 'expired',
          credits: -purchase.credits_remaining,
          description: `${purchase.credits_remaining} créditos expiraram - R$ ${expiredValue.toFixed(2)} adicionados ao faturamento`,
        });

      processed.push({
        purchaseId: purchase.id,
        customerId: purchase.customer_id,
        creditsExpired: purchase.credits_remaining,
        valueAdded: expiredValue,
      });
    }

    console.log(`Successfully processed ${processed.length} expired purchases`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        details: processed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing expired CA:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
