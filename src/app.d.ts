declare global {
	namespace App {
		interface Locals {
			isAdmin: boolean;
		}
		interface Platform {
			env: {
				DB: D1Database;
				ADMIN_PASSWORD?: string;
				AUTH_SECRET?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
