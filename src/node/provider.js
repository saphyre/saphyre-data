var Model = require('./model'),
    Criteria = require('./criteria'),
    Query = require('./query');

require('./squel.custom');

function Provider() {
    this.models = {};
}

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

module.exports = Provider;