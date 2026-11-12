import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { generateVariants } from "./contentGeneration";
import { createPosts, getAnalytics, getPost, listCalendarPosts, listPosts, markDuePosts, updatePost } from "./db";

const toneSchema = z.enum(["professional", "casual", "punchy"]);
const platformSchema = z.enum(["LinkedIn", "X", "Instagram"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  content: router({
    queue: publicProcedure
      .input(z.object({ status: z.enum(["draft", "approved", "rejected", "scheduled", "posted"]).optional() }).optional())
      .query(({ input }) => listPosts(input?.status)),

    generate: publicProcedure
      .input(z.object({ topic: z.string().min(3).max(180), platform: platformSchema.default("LinkedIn") }))
      .mutation(async ({ input }) => {
        const generated = await generateVariants(input.topic);
        const posts = await createPosts(generated.variants.map((variant) => ({
          title: variant.title,
          topic: input.topic,
          tone: toneSchema.parse(variant.tone),
          copy: variant.copy,
          hashtags: variant.hashtags,
          platform: input.platform,
          status: "draft" as const,
        })));
        return { provider: generated.provider, posts };
      }),

    approve: publicProcedure
      .input(z.object({ id: z.number().int().positive(), copy: z.string().min(1).optional() }))
      .mutation(async ({ input }) => {
        const post = await getPost(input.id);
        if (!post) throw new Error("Post not found");
        return updatePost(input.id, { status: "approved", copy: input.copy ?? post.copy });
      }),

    reject: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => updatePost(input.id, { status: "rejected" })),

    schedule: publicProcedure
      .input(z.object({ id: z.number().int().positive(), scheduledAt: z.string().datetime(), platform: platformSchema.optional() }))
      .mutation(async ({ input }) => {
        const post = await getPost(input.id);
        if (!post) throw new Error("Post not found");
        if (!["approved", "scheduled"].includes(post.status)) throw new Error("Approve the post before scheduling it");
        return updatePost(input.id, {
          status: "scheduled",
          scheduledAt: new Date(input.scheduledAt),
          platform: input.platform ?? post.platform,
        });
      }),

    calendar: publicProcedure
      .input(z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() }).optional())
      .query(({ input }) => {
        const now = new Date();
        const from = input?.from ? new Date(input.from) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const to = input?.to ? new Date(input.to) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
        return listCalendarPosts(from, to);
      }),

    analytics: publicProcedure.query(() => getAnalytics()),
    runDue: publicProcedure.mutation(() => markDuePosts()),
  }),
});

export type AppRouter = typeof appRouter;
