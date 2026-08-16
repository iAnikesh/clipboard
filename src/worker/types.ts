/** What's actually stored in Redis under `paste:<code>`. */
export interface PasteRecord {
	content: string;
	createdAt: string; // ISO 8601
	expiresAt: string; // ISO 8601
}

/** Response body for POST /api/v1/paste */
export interface CreatePasteResponse {
	code: string;
	url: string;
	expiresAt: string;
}

/** Response body for GET /api/v1/paste/:code */
export interface GetPasteResponse {
	code: string;
	content: string;
	createdAt: string;
	expiresAt: string;
}

export interface ErrorResponse {
	error: string;
}