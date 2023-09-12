import providers from "./providers";

export default class PaymentServiceFactory {
  static async getAccessToken(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.getAccessToken(params);
  }

  static async createInvoice(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.createInvoice(params);
  }

  static async checkInvoice(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.checkInvoice(params);
  }

  static async validateHook(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.validateHook(params);
  }

  static async getUserInfo(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.getUserInfo(params);
  }

  static getServiceInstance(provider: string) {
    const ServiceClass = (providers as any)[provider];

    if (!ServiceClass) {
      throw new Error(`Payment service "${provider}" not found.`);
    }

    if (!(PaymentServiceFactory as any)[provider]) {
      (PaymentServiceFactory as any)[provider] = new ServiceClass();
    }

    return (PaymentServiceFactory as any)[provider];
  }

  static getTokenType(provider: string) {
    if (["candy", "monpay"].indexOf(provider) > -1) {
      return "account";
    }

    return "merchant";
  }

  static async preProcess(provider: string, params: any) {
    const paymentService = PaymentServiceFactory.getServiceInstance(provider);

    return await paymentService.preProcess(params);
  }
}
