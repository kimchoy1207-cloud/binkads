export const CREATIVE_TOOLS = [
    {
        name: 'configure_bink_campaign',
        description: '온보딩 답변을 MAIN 신규 Bink 캠페인 설정과 승인 제안으로 저장합니다. 기존 캠페인은 변경하지 않고 Meta 실행도 하지 않습니다.',
        inputSchema: {
            type: 'object',
            properties: {
                campaignName: { type: 'string' },
                dailyBudgetMinor: { type: 'string' },
                totalBudgetMinor: { type: 'string' },
                maxLossMinor: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                targeting: { type: 'object' },
                pageId: { type: 'string' },
                destinationUrl: { type: 'string' },
                approver: { type: 'string' },
                reportTime: { type: 'string' },
                requestKey: { type: 'string' },
            },
            required: ['campaignName', 'dailyBudgetMinor', 'totalBudgetMinor', 'maxLossMinor', 'startTime', 'endTime', 'targeting', 'pageId', 'destinationUrl', 'approver', 'reportTime', 'requestKey'],
            additionalProperties: false,
        },
        annotations: { readOnly: false, destructive: false, idempotent: true },
    },
    {
        name: 'collect_competitor_ads',
        description: '경쟁사 광고를 읽기 전용으로 수집하거나 기존 수집 실행 상태를 조회합니다. 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED입니다.',
        inputSchema: {
            type: 'object',
            properties: {
                advertisers: { type: 'array', items: { type: 'string' } },
                requestKey: { type: 'string', description: 'Opaque idempotency key for this collection intent.' },
                runId: { type: 'string' },
            },
            anyOf: [
                { required: ['runId'] },
                { required: ['advertisers', 'requestKey'] },
            ],
            additionalProperties: false,
        },
        annotations: { readOnly: true, idempotent: true },
    },
    {
        name: 'analyze_competitor_creative',
        description: '경쟁사 크리에이티브를 copy, palette, layout/safe-zone, psychology, CTA, BINK hypothesis의 정확한 여섯 축으로 분석합니다. 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED입니다.',
        inputSchema: {
            type: 'object',
            properties: {
                collectionRunId: { type: 'string' },
                requestKey: { type: 'string', description: 'Opaque idempotency key for this analysis intent.' },
            },
            required: ['collectionRunId', 'requestKey'],
            additionalProperties: false,
        },
        annotations: { readOnly: true, idempotent: true },
    },
    {
        name: 'research_niche_positioning',
        description: '니치 포지셔닝을 조사합니다. 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED이며 성과 또는 인과 주장을 포함하지 않습니다.',
        inputSchema: { type: 'object', properties: { analysisRunId: { type: 'string' } }, required: ['analysisRunId'], additionalProperties: false },
        annotations: { readOnly: true, idempotent: true },
    },
    {
        name: 'draft_campaign_plan',
        description: '검토용 캠페인 계획 초안을 작성합니다. 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED입니다.',
        inputSchema: { type: 'object', properties: { positioningRunId: { type: 'string' } }, required: ['positioningRunId'], additionalProperties: false },
        annotations: { readOnly: true, idempotent: true },
    },
    {
        name: 'validate_campaign_plan',
        description: '검토용 캠페인 계획을 검증합니다. 결과는 MANUAL_REVIEW_REQUIRED 및 NOT_RELEASED입니다.',
        inputSchema: { type: 'object', properties: { campaignPlanRunId: { type: 'string' } }, required: ['campaignPlanRunId'], additionalProperties: false },
        annotations: { readOnly: true, idempotent: true },
    },
];
export function creativeToolRoute(name, args) {
    switch (name) {
        case 'configure_bink_campaign':
            return { route: '/internal/mcp/read/campaign-onboarding', method: 'POST', body: args };
        case 'collect_competitor_ads': {
            const runId = args.runId;
            if (typeof runId === 'string' && runId !== '') {
                return { route: `/internal/mcp/creative-intelligence/collections/${encodeURIComponent(runId)}`, method: 'GET' };
            }
            return {
                route: '/internal/mcp/creative-intelligence/collections',
                method: 'POST',
                body: { advertisers: args.advertisers, requestKey: args.requestKey },
            };
        }
        case 'analyze_competitor_creative':
            return { route: '/internal/mcp/creative-intelligence/analyses', method: 'POST', body: args };
        case 'research_niche_positioning':
            return { route: '/internal/mcp/creative-intelligence/positioning', method: 'POST', body: args };
        case 'draft_campaign_plan':
            return { route: '/internal/mcp/creative-intelligence/campaign-plans', method: 'POST', body: args };
        case 'validate_campaign_plan':
            return { route: '/internal/mcp/creative-intelligence/campaign-plans/validate', method: 'POST', body: args };
        default:
            return undefined;
    }
}
//# sourceMappingURL=creative-tools.js.map