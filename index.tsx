import MyDocument from './template.tsx';
import { pdf } from '@react-pdf/renderer';
import { workOrderSchema } from './src/components/work-order/work-order.schema';

const PORT = Number(Bun.env.PORT ?? 4444);
const ROUTE = '/pdf/templates/mailing';

// Render a validated work order into a PDF response.
async function renderMailing(data: unknown): Promise<Response> {
    const parsed = workOrderSchema.safeParse(data);
    if (!parsed.success) {
        return Response.json(
            { error: 'Validation failed', issues: parsed.error.issues },
            { status: 422 },
        );
    }

    const blob = await pdf(<MyDocument data={parsed.data} />).toBlob();
    return new Response(blob, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="mailing.pdf"',
        },
    });
}



const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const { pathname } = new URL(req.url);

        if (pathname === '/health') {
            return new Response('ok');
        }

        if (pathname === ROUTE) {
            if (req.method !== 'POST') {
                return Response.json({ error: 'Method not allowed' }, { status: 405 });
            }
            try {
                return await renderMailing(await req.json());
            } catch {
                return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
            }
        }

        return new Response('Not found', { status: 404 });
    },
});

console.log(`Listening on ${server.url} (POST ${ROUTE})`);
