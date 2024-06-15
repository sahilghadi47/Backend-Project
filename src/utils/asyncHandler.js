const asyncHandler = (requestHander) => {
    return (req, res, next) => {
        Promise.resolve(requestHander(req, res, next)).catch((error) =>
            next(error)
        );
    };
};
export { asyncHandler };
