import {
  createSchema,
  type Row,
  type UpdateValue,
  table,
  string,
  number,
  relationships,
  createBuilder,
} from "@rocicorp/zero";

const user = table("user")
  .columns({
    id: string(),
    name: string(),
  })
  .primaryKey("id");

const message = table("message")
  .columns({
    id: string(),
    senderID: string().from("sender_id"),
    body: string(),
    timestamp: number(),
  })
  .primaryKey("id");

const messageRelationships = relationships(message, ({ one }) => ({
  sender: one({
    sourceField: ["senderID"],
    destField: ["id"],
    destSchema: user,
  }),
}));

export const schema = createSchema({
  tables: [user, message],
  relationships: [messageRelationships],
  enableLegacyMutators: false,
  enableLegacyQueries: false,
});

export type Schema = typeof schema;
export type Message = Row<typeof schema.tables.message>;
export type MessageUpdate = UpdateValue<typeof schema.tables.message>;
export type User = Row<typeof schema.tables.user>;

export const zql = createBuilder(schema);

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    schema: Schema;
  }
}
