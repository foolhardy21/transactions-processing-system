import { Request, Response } from "express"

export function createMockResponse() {
    const response = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code
            return this
        },
        json(body: unknown) {
            this.body = body
            return this
        },
    }

    return response as Response & typeof response
}

export function createMockRequest(body: object = {}, params: object = {}, query: object = {}) {
    return {
        body,
        params,
        query,
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
    } as Request
}
