import providers from './providers';

export default class GatewaryFactory {
  static async transfer(provider: string, params: { [key:string]: any }) {
    const gateway = GatewaryFactory.getGatewayInstance(provider);

    return await gateway.transfer(params);
  }

  static getGatewayInstance(provider: string) {
    const ServiceClass = (providers as any)[provider];

    if (!ServiceClass) {
      throw new Error(`Corporate gateway "${provider}" not found.`);
    }


    if (!(GatewaryFactory as any)[provider]) {

      (GatewaryFactory as any)[provider] = new ServiceClass();
    }


    return (GatewaryFactory as any)[provider];
  }
}
