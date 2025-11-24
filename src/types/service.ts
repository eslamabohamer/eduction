export interface ServiceError {
    message: string;
    code?: string;
    details?: any;
}

export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: ServiceError;
}
