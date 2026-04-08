import { defineMutatorWithType, defineMutatorsWithType } from "@rocicorp/zero";
import { must } from "./must";
import * as v from "valibot";
import { zql, type Schema } from "./schema";
import type { Context } from "./auth";

const defineMutator = defineMutatorWithType<Schema, Context>();
const defineMutators = defineMutatorsWithType<Schema>();

export const mutators = defineMutators({
	message: {
		create: defineMutator(
			v.object({
				id: v.string(),
				body: v.string(),
				timestamp: v.number(),
			}),
			async ({ tx, args, ctx }) => {
				const userID = must(ctx.userID, "Must be logged in");
				await tx.mutate.message.insert({
					...args,
					senderID: userID,
				});
			},
		),
		delete: defineMutator(
			v.object({
				id: v.string(),
			}),
			async ({ tx, args, ctx }) => {
				const userID = must(ctx.userID, "Must be logged in");
				const prev = await tx.run(zql.message.where("id", args.id).one());
				if (!prev) {
					return;
				}
				if (prev.senderID !== userID) {
					throw new Error("Must be sender of message to delete");
				}
				await tx.mutate.message.delete(args);
			},
		),
		update: defineMutator(
			v.object({
				id: v.string(),
				body: v.string(),
			}),
			async ({ tx, args, ctx }) => {
				const userID = must(ctx.userID, "Must be logged in");
				const prev = await tx.run(zql.message.where("id", args.id).one());
				if (!prev) {
					return;
				}
				if (prev.senderID !== userID) {
					throw new Error("Must be sender of message to edit");
				}
				await tx.mutate.message.update(args);
			},
		),
	},
});
