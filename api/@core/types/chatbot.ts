
export interface IChatbotService {
  callSendAPI(sender_id: string, message: string, access_token: string): Promise<any>;
}
