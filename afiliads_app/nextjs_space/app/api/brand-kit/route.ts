export const dynamic = 'force-dynamic';
import { productAgentHandler } from '@/lib/product-agent-route';
import { brandDnaExtractor } from '@/lib/product-agents';

export const POST = productAgentHandler(brandDnaExtractor);
