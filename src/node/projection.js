function Projection(config) {
    this.config = config;
    this.middlewares = [];
}

Projection.prototype.use = function (handler) {
    this.middlewares.push(handler);
    return this;
};

module.exports = Projection;