export const dynamic = 'force-dynamic';
import { productAgentHandler } from '@/lib/product-agent-route';
import { antiSlopEditor } from '@/lib/product-agents';

export const POST = productAgentHandler(antiSlopEditor);
