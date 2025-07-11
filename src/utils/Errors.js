class NotFoundError extends Error{
    constructor(message){
        super(message);
        this.name = "NotFoundError";
        this.statusCode = 404;
    }
}

class ValidationError extends Error{
    constructor(message){
        super(message);
        this.name = "ValidationError";
        this.statusCode = 400;
    }
}

class DatabaseError extends Error{
    constructor(message, originalError){
        super(message);
        this.name = "DatabaseError";
        this.statusCode = 500;
        this.originalError = originalError;
    }
}

class ExternalError extends Error{
    constructor(message, originalError){
        super(message);
        this.name = "ExternalError";
        this.statusCode = 502;
        this.originalError = originalError;
    }
}

module.exports = {
    NotFoundError,
    ValidationError,
    DatabaseError,
    ExternalError,
}