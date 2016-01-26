/**
 * A model Projection, this will be the SELECT
 *
 * @class
 * @param {Object} config An object which the KEY will be the Model property and the VALUE will be the alias
 * @constructor
 */
function Projection(config) {
    this.config = config;
    this.middlewares = [];
}

/**
 * @callback Projection~middlewareCallback
 * @param {Object}  row     One query result row
 */

/**
 * Create a new middleware
 * @param {Projection~middlewareCallback}  handler  The function to handle the data
 * @returns {Projection}
 */
Projection.prototype.use = function (handler) {
    this.middlewares.push(handler);
    return this;
};

module.exports = Projection;