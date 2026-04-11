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
    SUCCESS = "success",
    FAIL = "fail"
}

export default ApiError