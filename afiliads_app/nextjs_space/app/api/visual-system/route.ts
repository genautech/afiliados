export const dynamic = 'force-dynamic';
import { productAgentHandler } from '@/lib/product-agent-route';
import { visualSystemDesigner } from '@/lib/product-agents';

export const POST = productAgentHandler(visualSystemDesigner);
