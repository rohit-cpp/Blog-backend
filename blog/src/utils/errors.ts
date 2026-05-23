export class AppError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = "Resource") {
        super(`${resource} not found`, 404);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = "Validation failed") {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized") {
        super(message, 401);
    }
}
