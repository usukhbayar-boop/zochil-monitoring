import providers from "./providers";

export default class WalletFactory {
  static async requestCard(provider: string, params: any) {
    const paymentService = WalletFactory.getServiceInstance(provider);

    return await paymentService.requestCard(params);
  }

  static getServiceInstance(provider: string) {
    const ServiceClass = (providers as any)[provider];

    if (!ServiceClass) {
      throw new Error(`Wallet service "${provider}" not found.`);
    }

    if (!(WalletFactory as any)[provider]) {
      (WalletFactory as any)[provider] = new ServiceClass();
    }

    return (WalletFactory as any)[provider];
  }
}
