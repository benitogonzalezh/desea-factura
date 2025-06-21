/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	SHOPIFY_API_SECRET: string;
}

async function verifyShopifyWebhook(
	rawBody: string,
	hmacHeader: string,
	apiSecret: string
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(apiSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(rawBody)
	);

	const calculatedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
	return calculatedHmac === hmacHeader;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Solo manejar POST a /webhooks
		if (request.method !== 'POST' || !request.url.includes('/webhooks')) {
			return new Response('Not Found', { status: 404 });
		}

		try {
			// Obtener headers
			const hmac = request.headers.get('X-Shopify-Hmac-SHA256');
			const topic = request.headers.get('X-Shopify-Topic');
			const shop = request.headers.get('X-Shopify-Shop-Domain');

			if (!hmac || !topic || !shop) {
				return new Response('Missing required headers', { status: 400 });
			}

			// Leer body
			const rawBody = await request.text();

			// Verificar HMAC
			if (!await verifyShopifyWebhook(rawBody, hmac, env.SHOPIFY_API_SECRET)) {
				return new Response('Unauthorized', { status: 401 });
			}

			console.log(`✅ Webhook GDPR: ${topic} de ${shop}`);

			// Procesar webhook
			switch (topic) {
				case 'customers/data_request':
					console.log('�� Solicitud de datos - No hay datos almacenados');
					break;
				case 'customers/redact':
					console.log('🗑️ Eliminar datos cliente - No hay datos que eliminar');
					break;
				case 'shop/redact':
					console.log('🏪 Eliminar datos tienda - No hay datos que eliminar');
					break;
				default:
					return new Response('Unhandled topic', { status: 400 });
			}

			return new Response(JSON.stringify({ 
				status: 'success',
				topic,
				shop 
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});

		} catch (error) {
			console.error('Error:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
