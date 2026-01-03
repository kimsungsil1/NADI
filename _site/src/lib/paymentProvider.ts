export type PaymentInitParams = {
  orderId: string;
  amount: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
};

export type PaymentInitResponse = {
  provider: 'toss';
  checkoutUrl?: string;
  clientKey?: string;
  orderId: string;
  amount: number;
};

export interface PaymentProvider {
  createPayment(params: PaymentInitParams): Promise<PaymentInitResponse>;
  verifyWebhook(payload: any, headers: Record<string, any>): Promise<any>;
}
