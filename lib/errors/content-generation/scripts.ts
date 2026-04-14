export class ScriptGenerationError extends Error {
    model: string;
    editRequest: string;
    userId: string | null;
    sessionId: string;

    constructor(
        message: string,
        model: string,
        editRequest: string,
        userId: string | null,
        sessionId: string
    ) {
        super(message);
        this.name = 'ScriptGenerationError';
        this.model = model;
        this.editRequest = editRequest;
        this.userId = userId;
        this.sessionId = sessionId;
    }
}