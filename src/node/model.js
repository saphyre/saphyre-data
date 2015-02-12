var Projection = require('./projection'),
    QueryBuilder = require('./query.builder'),
    Relationship = require('./relationship'),
    Criteria = require('./criteria'),
    Sort = require('./sort'),
    _ = require('lodash');

var defaults = _.partialRight(_.assign, function (value, other) {
    return value === undefined ? other : value;
});

function Model(model) {
    this.model = model;
    this.Promise = model.sequelize.Promise;

    this.relationships = [];
    this.criterias = {};
    this.sorts = {};
    this.projections = {};
}

Model.prototype.criteria = function (name, config) {
    this.criterias[name] = new Criteria(config);
    return this;
};

Model.prototype.projection = function (name, config) {
    var projection = new Projection(config);
    this.projections[name] = projection;
    return projection;
};

Model.prototype.getProjection = function (name) {
    return this.projections[name];
};

Model.prototype.relationship = function (path) {
    this.relationships.push(new Relationship(path));
    return this;
};

Model.prototype.sort = function (name, config) {
    this.sorts[name] = new Sort(config);
    return this;
};

Model.prototype.requestList = function (config) {
    var builder = new QueryBuilder(this.model),
        projection,
        criterias = this.criterias,
        Promise = this.Promise,
        sort;

    if (config.projection === undefined) {
        return this.Promise.reject('No projection selected');
    }

    projection = this.projections[config.projection];

    if (projection === undefined) {
        return Promise.reject('Undefined projection `' + config.projection + '`');
    }

    builder.projection(projection);

    if (config.sort !== undefined) {
        sort = this.sorts[config.sort];

        if (sort === undefined) {
            return Promise.reject('Undefined sort `' + config.sort + '`');
        }

        builder.sort(sort);
    }

    if (config.criteria) {
        try {
            _.forEach(config.criteria, function (values, name) {
                var criteria = criterias[name];
                if (criteria === undefined) {
                    throw new Error('Criteria named `' + name + '` not found');
                }
                criteria.apply(builder, values);
            });
        } catch (err) {
            return Promise.reject(err.message);
        }
    }

    if (config.page && config.pageSize) {
        builder.query.page(config.page, config.pageSize);
    }

    return builder.query.exec().then(function (result) {
        var handlers = [];

        _.forEach(projection.config, function (alias) {
            if (alias.indexOf('.') > 0) {
                var split = alias.split('.');
                handlers.push(function (item) {
                    var parent = item,
                        object = parent[alias];
                    _.forEach(split, function (subitem, index) {
                        if (index + 1 < split.length) {
                            if (item[subitem] === undefined) {
                                item[subitem] = {};
                            }
                            item = item[subitem];
                        } else {
                            item[subitem] = object;
                            delete parent[alias];
                        }
                    });
                });
            }
        });

        _.forEach(result.list, function (item) {
            _.forEach(handlers, function (handler) {
                handler(item);
            });

            _.forEach(projection.middlewares, function (middleware) {
                middleware(item);
            });
        });

        return Promise.resolve(result);
    });

};

Model.prototype.requestRelated = function () {
    // TODO
};

module.exports = Model;