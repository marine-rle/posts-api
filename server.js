import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import Joi from "joi";
import { readFileSync } from "node:fs";

const posts = JSON.parse(readFileSync("./posts.seed.json", "utf8"));

const postSchema = Joi.object({
  postId: Joi.number().integer().min(1).required(),
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().max(100).required(),
  body: Joi.string().min(1).max(500).required(),
}).strict();

const app = new Koa();
const router = new Router();

router.get("/posts", (ctx) => {
  const queryId = ctx.query.postId;

  if (queryId === undefined) {
    ctx.body = posts;
  } else {
    const postId = Number(queryId);
    if (!Number.isInteger(postId) || postId < 1) {
      ctx.status = 400;
      ctx.body = { error: "ID de publication invalide" };
      return;
    }
    ctx.body = posts.filter((p) => p.postId === postId);
  }
});

router.get("/posts/:id", (ctx) => {
  const id = Number(ctx.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) {
    ctx.status = 404;
    ctx.body = { error: "Post introuvable" };
    return;
  }
  ctx.body = post;
});

router.post("/posts", (ctx) => {
  const { error, value } = postSchema.validate(ctx.request.body);
  if (error) {
    ctx.status = 400;
    ctx.body = { error: error.details[0].message };
    return;
  }
  const id = Math.max(0, ...posts.map((p) => p.id)) + 1;
  const newPost = { id, ...value };
  posts.push(newPost);
  ctx.status = 201;
  ctx.set("Location", `/posts/${id}`);
  ctx.body = newPost;
});

router.delete("/posts/:id", (ctx) => {
  const id = Number(ctx.params.id);
  const postIndex = posts.findIndex((p) => p.id === id);
  if (postIndex === -1) ctx.throw(404, "Post introuvable");
  posts.splice(postIndex, 1);
  ctx.status = 204;
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: ctx.status === 500 ? "Vous rencontrez une erreur" : err.message,
    };
  }
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.use((ctx) => {
  ctx.status = 404;
  ctx.body = { error: "Route non trouvé" };
});

app.listen(3000);
