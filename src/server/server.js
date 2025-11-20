import express from 'express'
import { createServer as createViteServer } from 'vite'
import fs from 'node:fs/promises'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });

    app.use(vite.middlewares);
    
    app.use('/', async (req, res, next) => {
        const url = req.originalUrl;
        try {
            let template = await vite.transformIndexHtml(
                url,
                await fs.readFile(path.resolve(__dirname, '..', '..', "index.html"), "utf-8")
            );
            res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });

    app.listen(PORT, () => { console.log(`SPA server running at http://localhost:${PORT}`) });
};

createServer();