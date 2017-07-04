var Model = require('./model'),
    Consts = require('./consts'),
    Criteria = require('./criteria'),
    Query = require('./query');

require('./squel.custom');

/**
 * Saphyre Data Model Provider
 *
 * This is the main instance of Saphyre Data, used to manage all models.
 *
 * @class
 * @constructor
 */
function Provider() {
    this.models = {};
}

/**
 * Creates a new Model
 * @see {Model}
 * @param config Passes to Model constructor
 * @returns {Model}
 */
Provider.prototype.createModel = function (config) {
    var model = new Model(this, config);
    this.models[model.model.name] = model;
    return model;
};

Provider.prototype.getModel = function (sequelizeModel) {
    return this.models[sequelizeModel.name];
};

Provider.prototype.OPERATOR = Criteria.prototype.OPERATOR;
Provider.prototype.Query = Query;
Provider.prototype.RANDOM = Consts.RANDOM;

module.exports = Provider;