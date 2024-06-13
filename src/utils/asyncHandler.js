const asyncHandler = (requestHander) => () => {
    (req, res, next) => {
        Promise.resolve(requestHander(req, res, next)).catch((error) =>
            next(error)
        );
    };
};

export { asyncHandler };
