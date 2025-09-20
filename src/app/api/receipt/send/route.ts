import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 API: Sending digital receipt');
    
    const body = await request.json();
    console.log('🔍 Receipt request body:', body);
    
    const { 
      sessionId, 
      email, 
      orderItems, 
      subtotal, 
      vat, 
      tipAmount, 
      finalTotal,
      tableNumber,
      paymentMethod,
      paymentCompletedAt
    } = body;
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }
    
    // Update session with receipt email
    const { error: updateError } = await supabaseServer
      .from('sessions')
      .update({
        receipt_email: email,
        receipt_sent_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error('❌ Error updating session with receipt email:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }
    
    // Generate receipt HTML content
    const receiptHtml = generateReceiptHtml({
      orderItems,
      subtotal,
      vat,
      tipAmount,
      finalTotal,
      tableNumber,
      paymentMethod,
      paymentCompletedAt,
      sessionId
    });
    
    // In a real implementation, you would:
    // 1. Use an email service like SendGrid, AWS SES, or Resend
    // 2. Send the receipt HTML as an email
    // 3. Handle email delivery status
    
    // For now, we'll simulate successful email sending
    console.log('✅ Receipt email would be sent to:', email);
    console.log('📧 Receipt content length:', receiptHtml.length);
    
    // TODO: Implement actual email sending
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@pulanodus.com',
    //   to: email,
    //   subject: 'Your PulaNodus Receipt',
    //   html: receiptHtml
    // });
    
    return NextResponse.json({
      success: true,
      message: 'Receipt sent successfully',
      email,
      session_id: sessionId,
      receipt_sent_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔍 API: Receipt sending exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'RECEIPT_SEND');

// Helper function to generate receipt HTML
function generateReceiptHtml({
  orderItems,
  subtotal,
  vat,
  tipAmount,
  finalTotal,
  tableNumber,
  paymentMethod,
  paymentCompletedAt,
  sessionId
}: {
  orderItems: any[];
  subtotal: number;
  vat: number;
  tipAmount: number;
  finalTotal: number;
  tableNumber?: string;
  paymentMethod?: string;
  paymentCompletedAt?: string;
  sessionId: string;
}): string {
  const formatCurrency = (amount: number) => `P${amount.toFixed(2)}`;
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString();
    return new Date(dateString).toLocaleString();
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PulaNodus Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #00d9ff; padding-bottom: 20px; margin-bottom: 20px; }
        .restaurant-name { font-size: 24px; font-weight: bold; color: #00d9ff; margin-bottom: 10px; }
        .table-info { color: #666; font-size: 14px; }
        .order-items { margin: 20px 0; }
        .order-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .item-name { font-weight: bold; }
        .item-details { font-size: 12px; color: #666; }
        .totals { margin: 20px 0; }
        .total-line { display: flex; justify-content: space-between; padding: 4px 0; }
        .final-total { font-size: 18px; font-weight: bold; color: #00d9ff; border-top: 2px solid #00d9ff; padding-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant-name">PulaNodus Restaurant</div>
        <div class="table-info">
          ${tableNumber ? `Table ${tableNumber}` : ''}
          <br>
          Receipt Date: ${formatDate(paymentCompletedAt)}
          <br>
          Session: ${sessionId.slice(-8)}
        </div>
      </div>
      
      <div class="order-items">
        <h3>Order Details</h3>
        ${orderItems.map(item => `
          <div class="order-item">
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                ${item.isSplit ? 
                  `${formatCurrency(item.originalPrice || 0)} total - Split ${item.splitCount} ways` : 
                  `Qty: ${item.quantity} × ${formatCurrency(item.price)}`
                }
              </div>
            </div>
            <div>${formatCurrency(item.total)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-line">
          <span>VAT (14%):</span>
          <span>${formatCurrency(vat)}</span>
        </div>
        <div class="total-line">
          <span>Tip:</span>
          <span>${formatCurrency(tipAmount)}</span>
        </div>
        <div class="total-line final-total">
          <span>Total:</span>
          <span>${formatCurrency(finalTotal)}</span>
        </div>
      </div>
      
      ${paymentMethod ? `
        <div style="margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <strong>Payment Method:</strong> ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for dining with us!</p>
        <p>PulaNodus Restaurant</p>
      </div>
    </body>
    </html>
  `;
}
