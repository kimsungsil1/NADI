import crypto from 'crypto';
import { PaymentInitParams, PaymentInitResponse, PaymentProvider } from './paymentProvider';

export class TossProvider implements PaymentProvider {
  constructor(private secretKey: string, private clientKey?: string) {}

  async createPayment(params: PaymentInitParams): Promise<PaymentInitResponse> {
    const orderId = params.orderId;
    return {
      provider: 'toss',
      checkoutUrl: 'https://api.tosspayments.com/v1/payments',
      clientKey: this.clientKey,
      orderId,
      amount: params.amount,
    };
  }

  async verifyWebhook(payload: any, headers: Record<string, any>): Promise<any> {
    // Basic signature verification placeholder; real implementation should use Toss spec
    const signature = headers['x-toss-signature'] || headers['X-Toss-Signature'];
    if (signature && this.secretKey) {
      const computed = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (computed !== signature) {
        throw new Error('Invalid signature');
      }
    }
    return payload;
  }
}
