class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

export enum TRANSACTION_TYPES {
    DEBIT = "debit",
    CREDIT = "credit",
}

export enum TRANSACTION_STATUS {
    PENDING = "pending",
    FAILED = "failed",
    COMPLETED = "completed",
    FLAGGED = "flagged",
    FINALIZED = "finalized",
}

export default ApiError
