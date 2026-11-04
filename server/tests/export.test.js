import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { addTransaction, findCategoryId, signUp } from './helpers.js';

let agent;
let groceries;

beforeEach(async () => {
  ({ agent } = await signUp());
  groceries = await findCategoryId(agent, 'Groceries');
  await addTransaction(agent, { categoryId: groceries, amountMinor: 450075, date: '2026-11-05', notes: 'Rice, dal & "atta"', paymentMethod: 'upi' });
  await addTransaction(agent, { categoryId: groceries, amountMinor: 5, date: '2026-11-01', notes: '=HYPERLINK("http://evil.example")' });
  await addTransaction(agent, { categoryId: groceries, amountMinor: 999, date: '2026-12-01' });
});

describe('GET /api/export/transactions.csv', () => {
  it('downloads a spreadsheet-safe CSV, oldest first', async () => {
    const res = await agent.get('/api/export/transactions.csv').expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="?transactions-\d{4}-\d{2}-\d{2}\.csv"?$/);

    expect(res.text.startsWith('﻿')).toBe(true);
    const lines = res.text.slice(1).trimEnd().split('\r\n');
    expect(lines).toEqual([
      'date,type,category,amount,currency,payment_method,notes,recurring',
      `2026-11-01,expense,Groceries,0.05,INR,other,"'=HYPERLINK(""http://evil.example"")",no`,
      '2026-11-05,expense,Groceries,4500.75,INR,upi,"Rice, dal & ""atta""",no',
      '2026-12-01,expense,Groceries,9.99,INR,other,,no',
    ]);
  });

  it('can be limited to a date range', async () => {
    const res = await agent.get('/api/export/transactions.csv?from=2026-11-01&to=2026-11-30').expect(200);
    expect(res.text.trimEnd().split('\r\n')).toHaveLength(3); // header + 2 rows
  });

  it("never includes another user's transactions", async () => {
    const { agent: other } = await signUp('other.user@example.com');
    const res = await other.get('/api/export/transactions.csv').expect(200);
    expect(res.text.trimEnd().split('\r\n')).toHaveLength(1); // header only
  });
});

describe('GET /api/export/backup.json', () => {
  it('contains all the user data and no secrets', async () => {
    await agent.put('/api/budgets').send({ categoryId: groceries, month: '2026-11', limitMinor: 500000 }).expect(200);

    const res = await agent.get('/api/export/backup.json').expect(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="?finance-backup-\d{4}-\d{2}-\d{2}\.json"?$/);
    expect(res.body).toMatchObject({
      format: 'finance-tracker-backup',
      version: 1,
      user: { name: 'Test User', email: 'test.user@example.com', currency: 'INR' },
    });
    expect(res.body.categories).toHaveLength(17);
    expect(res.body.transactions).toHaveLength(3);
    expect(res.body.budgets).toHaveLength(1);

    expect(res.text).not.toMatch(/passwordHash|tokenVersion|userId/);
  });

  it('requires login', async () => {
    await request(app).get('/api/export/backup.json').expect(401);
  });
});
