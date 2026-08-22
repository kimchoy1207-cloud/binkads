import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { CREATIVE_TOOLS, creativeToolRoute } from './creative-tools.js';
import { createInternalApiClient, MAX_INTERNAL_RESPONSE_BYTES } from './internal-api-client.js';
import { CEO_READ_ONLY, getStartupProfile, rejectsProfileOverride } from './tool-profile.js';
const API_URL = process.env.META_AUTOMATION_API_URL || 'http://localhost:4000';
const MCP_TOKEN = process.env.META_AUTOMATION_MCP_TOKEN || '';
const AUTH_MODE = process.env.META_AUTOMATION_AUTH_MODE === 'bearer' ? 'bearer' : 'mcp-token';
const READ_TOOLS = [
    { name: 'health_check', description: '시스템 상태 확인. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'list_ad_accounts', description: '등록된 광고계정 목록 조회. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_account_summary', description: '특정 계정의 오늘 요약. Side effects: 없음.', inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_campaigns', description: '특정 계정의 캠페인 목록. Side effects: 없음.', inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_insights', description: '엔티티별 성과 데이터 조회. Side effects: 없음.', inputSchema: { type: 'object', properties: { entityId: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' } }, required: ['entityId'] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_lead_funnel', description: '리드 퍼널 현황. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_outcome_performance', description: '성숙 리드 코호트의 오디션 참석·결제·환불·순매출·ROAS·저상업의도 성과와 계정 비교. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_experiments', description: '실험 목록. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_approval_queue', description: '승인 대기 목록. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
    { name: 'get_alerts', description: '활성 경고 목록. Side effects: 없음.', inputSchema: { type: 'object', properties: {}, required: [] }, annotations: { readOnly: true, idempotent: true } },
];
const WRITE_TOOLS = [
    { name: 'propose_experiment', description: '단일변수 실험 제안.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, controlledVariable: { type: 'string' }, controlAdId: { type: 'string' }, variantChanges: { type: 'object' } }, required: ['name', 'controlledVariable', 'controlAdId'] }, annotations: { readOnly: false, destructive: false, idempotent: false } },
    { name: 'queue_budget_change', description: '예산 변경 제안.', inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, newBudget: { type: 'number' }, reason: { type: 'string' } }, required: ['campaignId', 'newBudget', 'reason'] }, annotations: { readOnly: false, destructive: false, idempotent: false } },
    { name: 'approve_action', description: '승인 대기 action 승인.', inputSchema: { type: 'object', properties: { proposalId: { type: 'string' }, reason: { type: 'string' } }, required: ['proposalId'] }, annotations: { readOnly: false, destructive: false, idempotent: true } },
    { name: 'reject_action', description: '승인 대기 action 거부.', inputSchema: { type: 'object', properties: { proposalId: { type: 'string' }, reason: { type: 'string' } }, required: ['proposalId', 'reason'] }, annotations: { readOnly: false, destructive: false, idempotent: true } },
    { name: 'pause_ad', description: '광고 일시정지.', inputSchema: { type: 'object', properties: { adId: { type: 'string' }, reason: { type: 'string' } }, required: ['adId', 'reason'] }, annotations: { readOnly: false, destructive: false, idempotent: true } },
    { name: 'set_account_mode', description: '계정 운영모드 변경.', inputSchema: { type: 'object', properties: { accountId: { type: 'string' }, mode: { type: 'string' } }, required: ['accountId', 'mode'] }, annotations: { readOnly: false, destructive: false, idempotent: true } },
    { name: 'sync_now', description: '즉시 데이터 동기화 트리거.', inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] }, annotations: { readOnly: false, destructive: false, idempotent: true } },
];
const WRITE_TOOL_NAMES = new Set(WRITE_TOOLS.map((tool) => tool.name));
const SERVER_INSTRUCTIONS = `시니어 배우 모집 Meta 광고 자동화 OS MCP 서버입니다.
중요 규칙:
- Reference 계정(3개) 쓰기 절대 금지
- Live write 기본 비활성화
- 모든 실험은 단일변수 검증 필수
- 예산 상한 초과 불가
- Secret/PII 출력 금지
- CEO_READ_ONLY 프로필의 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED입니다.
이 서버는 내부 API 토큰만 사용하며 외부 광고 플랫폼 credential을 직접 보유하지 않습니다.`;
function toolsForProfile(profile) {
    return profile === CEO_READ_ONLY ? [...READ_TOOLS, ...CREATIVE_TOOLS] : [...READ_TOOLS, ...WRITE_TOOLS];
}
function errorResult(code, message) {
    return { ok: false, error: { code, message } };
}
function textResult(result) {
    const raw = JSON.stringify(result);
    if (Buffer.byteLength(raw, 'utf8') > MAX_INTERNAL_RESPONSE_BYTES) {
        return { content: [{ type: 'text', text: JSON.stringify(errorResult('OUTPUT_TOO_LARGE', 'Internal API response exceeded the output limit')) }] };
    }
    const text = JSON.stringify(sanitize(result));
    return { content: [{ type: 'text', text }] };
}
const META_IDENTIFIER_KEYS = new Set([
    'accountId',
    'adAccountId',
    'campaignId',
    'adSetId',
    'adsetId',
    'adId',
    'creativeId',
    'externalId',
    'entityId',
    'sourceId',
    'targetId',
]);
const META_IDENTIFIER = /^(?:act_)?\d{10,20}$/;
const SENSITIVE_KEY = /^(?:authorization|cookie|(?:api)?[ _-]?key|(?:access|refresh|id|api)?[ _-]?token|(?:client)?[ _-]?secret|password|e-?mail(?:address)?|(?:mobile|phone)(?:number)?|lead(?:email|phone|mobile)?|ssn)$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
function sanitize(value, key = '') {
    if (SENSITIVE_KEY.test(key))
        return '[REDACTED]';
    if (typeof value === 'string') {
        if (META_IDENTIFIER_KEYS.has(key) && META_IDENTIFIER.test(value))
            return value;
        return value.replace(EMAIL, '[REDACTED]').replace(PHONE, '[REDACTED]');
    }
    if (Array.isArray(value))
        return value.map((item) => sanitize(item));
    if (value !== null && typeof value === 'object') {
        const output = {};
        for (const [childKey, childValue] of Object.entries(value))
            output[childKey] = sanitize(childValue, childKey);
        return output;
    }
    return value;
}
function stringArg(args, key) {
    const value = args[key];
    return typeof value === 'string' ? value : undefined;
}
async function handleToolCall(profile, client, name, args) {
    if (rejectsProfileOverride(args))
        return textResult(errorResult('PROFILE_OVERRIDE_REJECTED', 'Startup profile cannot be set by tool arguments'));
    if (profile === CEO_READ_ONLY && WRITE_TOOL_NAMES.has(name))
        return textResult(errorResult('TOOL_NOT_ALLOWED', 'This tool is not available in CEO_READ_ONLY'));
    if (name === 'collect_competitor_ads'
        && (Object.prototype.hasOwnProperty.call(args, 'source') || Object.prototype.hasOwnProperty.call(args, 'sourceVersion'))) {
        return textResult(errorResult('INVALID_TOOL_ARGUMENTS', 'Collection source is derived internally'));
    }
    const creativeRoute = profile === CEO_READ_ONLY ? creativeToolRoute(name, args) : undefined;
    if (creativeRoute !== undefined)
        return textResult(await client.call(creativeRoute.route, creativeRoute.method, creativeRoute.body));
    switch (name) {
        case 'health_check': return textResult(await client.call('/internal/mcp/read/health'));
        case 'list_ad_accounts': return textResult(await client.call('/internal/mcp/read/accounts'));
        case 'get_account_summary': return textResult(await client.call(`/internal/mcp/read/accounts/${encodeURIComponent(stringArg(args, 'accountId') || '')}/summary`));
        case 'get_campaigns': return textResult(await client.call(`/internal/mcp/read/accounts/${encodeURIComponent(stringArg(args, 'accountId') || '')}/campaigns`));
        case 'get_insights': {
            const entityId = encodeURIComponent(stringArg(args, 'entityId') || '');
            const since = encodeURIComponent(stringArg(args, 'since') || '');
            const until = encodeURIComponent(stringArg(args, 'until') || '');
            return textResult(await client.call(`/internal/mcp/read/insights/${entityId}?since=${since}&until=${until}`));
        }
        case 'get_lead_funnel': return textResult(await client.call('/internal/mcp/read/leads/funnel'));
        case 'get_outcome_performance': return textResult(await client.call('/internal/mcp/read/outcomes/performance'));
        case 'get_experiments': return textResult(await client.call('/internal/mcp/read/experiments'));
        case 'get_approval_queue': return textResult(await client.call('/internal/mcp/read/approvals'));
        case 'get_alerts': return textResult(await client.call('/internal/mcp/read/alerts'));
        case 'propose_experiment': return textResult(await client.call('/api/experiments/propose', 'POST', args));
        case 'queue_budget_change': return textResult(await client.call('/api/budget/propose', 'POST', args));
        case 'approve_action': return textResult(await client.call(`/api/approvals/${encodeURIComponent(stringArg(args, 'proposalId') || '')}/approve`, 'POST', { reason: args.reason }));
        case 'reject_action': return textResult(await client.call(`/api/approvals/${encodeURIComponent(stringArg(args, 'proposalId') || '')}/reject`, 'POST', { reason: args.reason }));
        case 'pause_ad': return textResult(await client.call(`/api/ads/${encodeURIComponent(stringArg(args, 'adId') || '')}/pause`, 'POST', { reason: args.reason }));
        case 'set_account_mode':
            if (args.mode === 'FULL_AUTO')
                return textResult(errorResult('ACCOUNT_MODE_BLOCKED', 'FULL_AUTO requires 웹 UI confirmation'));
            return textResult(await client.call(`/api/accounts/${encodeURIComponent(stringArg(args, 'accountId') || '')}/mode`, 'PATCH', { mode: args.mode }));
        case 'sync_now': return textResult(await client.call(`/api/sync/${encodeURIComponent(stringArg(args, 'accountId') || '')}`, 'POST'));
        default: return textResult(errorResult('UNKNOWN_TOOL', 'Unknown tool'));
    }
}
function handleMessage(profile, msg) {
    switch (msg.method) {
        case 'initialize':
            return { jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'senior-actor-ads-mcp', version: '0.1.0' }, instructions: SERVER_INSTRUCTIONS } };
        case 'tools/list': return { jsonrpc: '2.0', id: msg.id, result: { tools: toolsForProfile(profile) } };
        case 'notifications/initialized': return { jsonrpc: '2.0', id: msg.id, result: {} };
        default: return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } };
    }
}
async function main() {
    const profile = getStartupProfile();
    const client = createInternalApiClient(API_URL, MCP_TOKEN, AUTH_MODE);
    const rl = createInterface({ input: process.stdin, terminal: false });
    for await (const line of rl) {
        if (!line.trim())
            continue;
        try {
            const msg = JSON.parse(line);
            if (msg.method === 'tools/call') {
                const params = msg.params || {};
                const name = typeof params.name === 'string' ? params.name : '';
                const args = params.arguments !== null && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
                    ? params.arguments
                    : {};
                process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: await handleToolCall(profile, client, name, args) })}\n`);
            }
            else {
                process.stdout.write(`${JSON.stringify(handleMessage(profile, msg))}\n`);
            }
        }
        catch {
            process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 0, error: { code: -32700, message: 'Parse error' } })}\n`);
        }
    }
}
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch(() => process.stderr.write('MCP server startup failed\n'));
}
export { handleToolCall, sanitize, textResult, toolsForProfile };
//# sourceMappingURL=index.js.map