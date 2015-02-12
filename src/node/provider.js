var Model = require('./model'),
    Criteria = require('./criteria');

function Provider() {
    this.models = {};
}

Provider.prototype.createModel = function (name, model) {
    var m = new Model(model);
    this.models[name] = m;
    return m;
};

Provider.prototype.OPERATOR = Criteria.prototype.OPERATOR;

module.exports = Provider;