import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';

export const travellers = sqliteTable('travellers', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const expeditions = sqliteTable(
  'expeditions',
  {
    id: text('id').primaryKey(),
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id),
    mode: text('mode').notNull(),
    classId: text('class_id').notNull(),
    seed: integer('seed').notNull(),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    checkpoint: integer('checkpoint').notNull().default(0),
    status: text('status').notNull().default('active'),
    title: text('title').notNull().default(''),
    depth: integer('depth').notNull().default(0),
    duration: real('duration').notNull().default(0),
    peakSquad: real('peak_squad').notNull().default(0),
    gold: real('gold').notNull().default(0),
    ranked: integer('ranked').notNull().default(1),
    details: text('details').notNull().default('{}'),
  },
  (table) => [
    index('idx_expeditions_traveller_finished').on(
      table.travellerId,
      table.finishedAt,
    ),
    index('idx_expeditions_mode_ranked_status').on(
      table.mode,
      table.ranked,
      table.status,
    ),
  ],
);
export const limits = sqliteTable('chronicle_limits', {
  key: text('key').primaryKey(),
  bucket: integer('bucket').notNull(),
  count: integer('count').notNull(),
});
