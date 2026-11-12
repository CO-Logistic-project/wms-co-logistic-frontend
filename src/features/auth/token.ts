let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export function setAccessToken(token: string | null) { accessToken = token; }
