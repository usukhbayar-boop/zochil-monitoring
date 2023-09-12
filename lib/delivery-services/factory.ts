import providers from './providers';

export default class DeliveryServicesFactory {
  static async createDeliveryOrder(provider: string, params: { [key:string]: any }) {
    const gateway = DeliveryServicesFactory.getInstance(provider);

    return await gateway.createDeliveryOrder(params);
  }

  static async getZipCode(provider: string, params: { [key:string]: any }) {
    const gateway = DeliveryServicesFactory.getInstance(provider);

    return await gateway.getZipCode(params);
  }
  static async getProductSizeCode(provider: string){
    const gateway = DeliveryServicesFactory.getInstance(provider);
    return await gateway.getProductSizeCode();
  }

  static getInstance(provider: string) {
    const ServiceClass = (providers as any)[provider];

    if (!ServiceClass) {
      throw new Error(`Delivery service "${provider}" not found.`);
    }

    if (!(DeliveryServicesFactory as any)[provider]) {
      
      (DeliveryServicesFactory as any)[provider] = new ServiceClass();
    }
    return (DeliveryServicesFactory as any)[provider];
  }
}
