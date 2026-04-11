import { Response, Request, NextFunction } from "express"

export function handleError(asyncController: Function) {
    return async function (req: Request, res: Response, next: NextFunction) {
        try {
            await asyncController(req, res, next)
        } catch (err: any) {
            const status = err.status ?? 500
            const message = err.message ?? "Something went wrong"
            return res.status(status).json({ success: false, message })
        }
    }
}