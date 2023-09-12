import providers from "./providers";

export default class LoanServiceFactory {
  static async createLoanOrder(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.createLoanOrder(params);
  }

  static async getDirectoryList(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.getDirectoryList(params);
  }

  static async getStateList(provider: string, params: { [key: string]: any }) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.getStateList(params);
  }

  static async getCityList(provider: string, params: { [key: string]: any }) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.getCityList(params);
  }

  static async sendLoanRequest(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.sendLoanRequest(params);
  }

  static async sendLoanConfirm(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.sendLoanConfirm(params);
  }

  static async checkLoanRequest(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.checkLoanRequest(params);
  }

  static async checkLoanRequestList(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.checkLoanRequestList(params);
  }

  static async getPhone(provider: string, params: { [key: string]: any }) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.getPhone(params);
  }

  static async otpSend(provider: string, params: { [key: string]: any }) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.otpSend(params);
  }
  static async otpValidate(provider: string, params: { [key: string]: any }) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.otpValidate(params);
  }
  static async customerInquire(
    provider: string,
    params: { [key: string]: any }
  ) {
    const gateway = LoanServiceFactory.getInstance(provider);
    return await gateway.customerInquire(params);
  }

  static getInstance(provider: string) {
    const ServiceClass = (providers as any)[provider];

    if (!ServiceClass) {
      throw new Error(`Loan service "${provider}" not found.`);
    }

    if (!(LoanServiceFactory as any)[provider]) {
      (LoanServiceFactory as any)[provider] = new ServiceClass();
    }

    return (LoanServiceFactory as any)[provider];
  }
}
