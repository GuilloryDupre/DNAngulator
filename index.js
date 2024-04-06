import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
import { DNAngulate } from './dnangulate.js';

// deno run --allow-net --allow-read index.js

const app = new Application();
const router = new Router();

router.get('/api', async (ctx) => {
    try {
        const ids = ctx.request.url.searchParams.get('ids').split(',');
        ctx.response.body = await DNAngulate(...ids);
    } catch (e) {
        console.error(e);
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
    try {
        await ctx.send({
            root: `${Deno.cwd()}/public`,
            index: 'index.html',
        });
    } catch {
        ctx.response.status = 404;
        ctx.response.body = '404 File not found';
    }
});

await app.listen({ port: 3000 });

// deno run --allow-net --allow-read index.js