import { env } from 'cloudflare:workers';
import { chronicleHandler, type ChronicleEnv } from '@/lib/chronicle-server';
const handle = (request: Request) =>
  chronicleHandler(request, env as unknown as ChronicleEnv);
export { handle as GET, handle as POST, handle as OPTIONS };
