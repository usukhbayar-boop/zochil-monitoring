import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID || "",
    secretAccessKey: process.env.AWS_KEY_SECRET || "",
  },
});

export async function notifyMemberCreated(
  memberCode: string,
  payload: {
    id: string;
    registration_date: string;
    member_code: string;
    member_name: string;
    referrer_code: string;
    phone: string;
  },
) {
  const input: PutEventsCommandInput = {
    Entries: [
      {
        Source: process.env.AWS_EVENTBUS_MEMBER_SOURCE || 'zochil-api.member',
        DetailType: 'MemberCreated',
        Resources: [memberCode],
        EventBusName: process.env.AWS_EVENTBUS_ACCOUNT || 'zochil-prod',
        Detail: JSON.stringify(payload),
      },
    ],
  };

  const command = new PutEventsCommand(input);
  return client.send(command);
}

export async function notifyMemberUpdated(
  memberCode: string,
  payload: {
    id: string;
    registration_date: string;
    member_code: string;
    member_name: string;
    referrer_code: string;
    phone: string;
  },
) {
  const input: PutEventsCommandInput = {
    Entries: [
      {
        Source: process.env.AWS_EVENTBUS_MEMBER_SOURCE || 'zochil-api.member',
        DetailType: 'MemberUpdated',
        Resources: [memberCode],
        EventBusName: process.env.AWS_EVENTBUS_ACCOUNT || 'zochil-prod',
        Detail: JSON.stringify(payload),
      },
    ],
  };

  const command = new PutEventsCommand(input);
  return client.send(command);
}

export async function notifyOrderPlaced(orderId: string, payload: {
  id: string;
  order_day: string;
  member_code: string;
  total_payment: number;
  products: {
    product_id: string;
    product_name: string;
    product_point: number;
    product_quantity: number;
  }[];
}) {
  const input: PutEventsCommandInput = {
    Entries: [
      {
        Source: process.env.AWS_EVENTBUS_ORDER_SOURCE || 'zochil-api.order',
        DetailType: 'OrderPlaced',
        Resources: [orderId],
        EventBusName: process.env.AWS_EVENTBUS_ORDER || 'zochil-prod',
        Detail: JSON.stringify(payload),
      },
    ],
  };

  const command = new PutEventsCommand(input);

  return client.send(command);
}
