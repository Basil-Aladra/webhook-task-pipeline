import assert from 'node:assert/strict';
import { ValidateProcessor } from './validate.processor';

async function testRejectsInvalidAmount(): Promise<void> {
  const processor = new ValidateProcessor();

  await assert.rejects(
    () =>
      processor.process({
        payload: {
          orderId: '123',
          customerName: 'John',
          amount: 'testvalidate',
        } as unknown as Record<string, unknown>,
        config: {},
        actionType: 'validate',
      }),
    /Validation failed: amount: amount must be a number/,
  );
}

async function testRejectsMissingCustomerName(): Promise<void> {
  const processor = new ValidateProcessor();

  await assert.rejects(
    () =>
      processor.process({
        payload: {
          orderId: '123',
          amount: 50,
        },
        config: {},
        actionType: 'validate',
      }),
    /customerName/,
  );
}

async function testAcceptsValidPayload(): Promise<void> {
  const processor = new ValidateProcessor();

  const result = await processor.process({
    payload: {
      orderId: '123',
      customerName: 'John',
      amount: 99.99,
      status: 'paid',
    },
    config: {},
    actionType: 'validate',
  });

  assert.equal(result.result.orderId, '123');
  assert.equal(result.result.customerName, 'John');
  assert.equal(result.result.amount, 99.99);
  assert.equal(result.result.status, 'paid');
}

async function testRejectsUnexpectedFields(): Promise<void> {
  const processor = new ValidateProcessor();

  await assert.rejects(
    () =>
      processor.process({
        payload: {
          orderId: '123',
          customerName: 'John',
          amount: 123,
          file: 'http://http://localhost:5173/#/pipelines',
        } as unknown as Record<string, unknown>,
        config: {},
        actionType: 'validate',
      }),
    /Validation failed: payload: unexpected field\(s\): file/,
  );
}

async function run(): Promise<void> {
  await testRejectsInvalidAmount();
  await testRejectsMissingCustomerName();
  await testRejectsUnexpectedFields();
  await testAcceptsValidPayload();
  console.log('validate.processor tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
