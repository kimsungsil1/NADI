"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TossProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TossProvider {
    constructor(secretKey, clientKey) {
        this.secretKey = secretKey;
        this.clientKey = clientKey;
    }
    async createPayment(params) {
        const orderId = params.orderId;
        return {
            provider: 'toss',
            checkoutUrl: 'https://api.tosspayments.com/v1/payments',
            clientKey: this.clientKey,
            orderId,
            amount: params.amount,
        };
    }
    async verifyWebhook(payload, headers) {
        // Basic signature verification placeholder; real implementation should use Toss spec
        const signature = headers['x-toss-signature'] || headers['X-Toss-Signature'];
        if (signature && this.secretKey) {
            const computed = crypto_1.default
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
exports.TossProvider = TossProvider;
