import { beforeEach, describe, expect, it } from 'vitest';
import { Budget } from '../src/models/Budget.js';
import { Category } from '../src/models/Category.js';
import { Transaction } from '../src/models/Transaction.js';
import { addTransaction, findCategoryId, signUp } from './helpers.js';

let agent;
let user;

beforeEach(async () => {
  ({ agent, user } = await signUp());
});

describe('GET /api/categories', () => {
  it('lists the 17 default categories, sorted by type then name', async () => {
    const res = await agent.get('/api/categories').expect(200);
    expect(res.body.categories).toHaveLength(17);

    const expenseNames = res.body.categories.filter((c) => c.type === 'expense').map((c) => c.name);
    expect(expenseNames[0]).toBe('Dining');
    expect(expenseNames).toEqual([...expenseNames].sort((a, b) => a.localeCompare(b)));
    expect(res.body.categories[0]).not.toHaveProperty('userId');
  });

  it('filters by type and hides archived categories unless asked', async () => {
    const income = await agent.get('/api/categories?type=income').expect(200);
    expect(income.body.categories.every((c) => c.type === 'income')).toBe(true);
    expect(income.body.categories).toHaveLength(5);

    const giftsId = await findCategoryId(agent, 'Gifts');
    await agent.patch(`/api/categories/${giftsId}`).send({ archived: true }).expect(200);

    const visible = await agent.get('/api/categories?type=income').expect(200);
    expect(visible.body.categories.map((c) => c.name)).not.toContain('Gifts');
    const all = await agent.get('/api/categories?type=income&includeArchived=true').expect(200);
    expect(all.body.categories.map((c) => c.name)).toContain('Gifts');
  });
});

describe('POST /api/categories', () => {
  it('creates a custom category', async () => {
    const res = await agent
      .post('/api/categories')
      .send({ name: '  Pets ', type: 'expense', color: '#ff8800', icon: 'paw' })
      .expect(201);
    expect(res.body.category).toMatchObject({
      name: 'Pets',
      type: 'expense',
      color: '#ff8800',
      isSavings: false,
      archived: false,
    });
  });

  it('rejects a duplicate name (case-insensitive) but allows it for the other type', async () => {
    await Category.init(); // make sure the unique index exists before testing it
    const res = await agent
      .post('/api/categories')
      .send({ name: 'GROCERIES', type: 'expense' })
      .expect(409);
    expect(res.body.error.message).toMatch(/already have an expense category/);

    await agent.post('/api/categories').send({ name: 'Groceries', type: 'income' }).expect(201);
  });

  it('only allows expense categories to be savings', async () => {
    const res = await agent
      .post('/api/categories')
      .send({ name: 'Bonus', type: 'income', isSavings: true })
      .expect(400);
    expect(res.body.error.details[0].field).toBe('isSavings');
  });

  it('validates name, type and color', async () => {
    const res = await agent
      .post('/api/categories')
      .send({ name: '', type: 'transfer', color: 'red' })
      .expect(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['color', 'name', 'type']);
  });
});

describe('PATCH /api/categories/:id', () => {
  it('renames a category but never changes its type', async () => {
    const id = await findCategoryId(agent, 'Dining');
    const res = await agent
      .patch(`/api/categories/${id}`)
      .send({ name: 'Eating Out', type: 'income' })
      .expect(200);
    expect(res.body.category).toMatchObject({ name: 'Eating Out', type: 'expense' });
  });

  it('rejects renaming to an existing name', async () => {
    await Category.init();
    const id = await findCategoryId(agent, 'Dining');
    await agent.patch(`/api/categories/${id}`).send({ name: 'shopping' }).expect(409);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('deletes an unused category and its budgets', async () => {
    const id = await findCategoryId(agent, 'Education');
    await Budget.create({ userId: user.id, categoryId: id, month: '2026-11', limitMinor: 500000 });

    await agent.delete(`/api/categories/${id}`).expect(204);
    expect(await Category.exists({ _id: id })).toBeNull();
    expect(await Budget.countDocuments({ categoryId: id })).toBe(0);
  });

  it('refuses to delete a category that has transactions', async () => {
    const id = await findCategoryId(agent, 'Groceries');
    await addTransaction(agent, { categoryId: id });

    const res = await agent.delete(`/api/categories/${id}`).expect(409);
    expect(res.body.error.message).toMatch(/used by 1 transaction\./);
    expect(await Category.exists({ _id: id })).not.toBeNull();
  });

  it('moves transactions to another category of the same type, then deletes', async () => {
    const groceries = await findCategoryId(agent, 'Groceries');
    const shopping = await findCategoryId(agent, 'Shopping');
    const salary = await findCategoryId(agent, 'Salary');
    const tx = await addTransaction(agent, { categoryId: groceries });

    await agent.delete(`/api/categories/${groceries}?moveTo=${groceries}`).expect(400);
    const wrongType = await agent.delete(`/api/categories/${groceries}?moveTo=${salary}`).expect(400);
    expect(wrongType.body.error.details[0].field).toBe('moveTo');

    await agent.delete(`/api/categories/${groceries}?moveTo=${shopping}`).expect(204);
    const moved = await Transaction.findById(tx.id);
    expect(moved.categoryId.toString()).toBe(shopping);
  });
});

describe('privacy between users', () => {
  it("one user can't see, change or delete another user's categories", async () => {
    const custom = await agent
      .post('/api/categories')
      .send({ name: 'Secret Hobby', type: 'expense' })
      .expect(201);
    const id = custom.body.category.id;

    const { agent: other } = await signUp('other.user@example.com');
    const list = await other.get('/api/categories').expect(200);
    expect(list.body.categories.map((c) => c.name)).not.toContain('Secret Hobby');

    await other.patch(`/api/categories/${id}`).send({ name: 'Hacked' }).expect(404);
    await other.delete(`/api/categories/${id}`).expect(404);
    expect((await Category.findById(id)).name).toBe('Secret Hobby');
  });
});
