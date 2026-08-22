export const CEO_READ_ONLY = 'CEO_READ_ONLY';
export const EXISTING_AUTHORIZED = 'EXISTING_AUTHORIZED';
const STARTUP_PROFILES = new Set([CEO_READ_ONLY, EXISTING_AUTHORIZED]);
export function getStartupProfile(value = process.env.META_AUTOMATION_MCP_PROFILE) {
    if (value === undefined || value === '') {
        return CEO_READ_ONLY;
    }
    if (STARTUP_PROFILES.has(value)) {
        return value;
    }
    throw new Error('Invalid META_AUTOMATION_MCP_PROFILE');
}
export function rejectsProfileOverride(args) {
    return Object.prototype.hasOwnProperty.call(args, 'profile')
        || Object.prototype.hasOwnProperty.call(args, 'startupProfile')
        || Object.prototype.hasOwnProperty.call(args, 'toolProfile')
        || Object.prototype.hasOwnProperty.call(args, 'META_AUTOMATION_MCP_PROFILE');
}
//# sourceMappingURL=tool-profile.js.map