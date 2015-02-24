var Projection = require('./projection'),
    QueryBuilder = require('./query.builder'),
    Relationship = require('./relationship'),
    Criteria = require('./criteria'),
    Sort = require('./sort'),
    _ = require('lodash');

var defaults = _.partialRight(_.assign, function (value, other) {
    return value === undefined ? other : value;
});

function Model(provider, options) {
    var model;
    if (options.model) {
        model = options.model;
    } else {
        model = options;
        options = {};
    }

    if (options.cached) {
        this.cached = true;
        this.timeout = options.timeout;
        this.cache = {
            timestamp : undefined,
            result : undefined
        };
    }

    this.model = model;
    this.Promise = model.sequelize.Promise;

    this.provider = provider;
    this.relationships = [];
    this.criterias = {};
    this.sorts = {};
    this.projections = {};
}

function diffFromNow(date) {
    return new Date().getTime() - date.getTime();
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

Model.prototype.relationship = function (path) {
    this.relationships.push(new Relationship(path));
    return this;
};

Model.prototype.sort = function (name, config) {
    this.sorts[name] = new Sort(config);
    return this;
};

Model.prototype.buildQuery = function (config) {
    var builder = new QueryBuilder(this.model, this.provider),
        projection,
        criterias = this.criterias,
        Promise = this.Promise,
        sort;

    config = config || {};

    if (config.projection === undefined) {
        config.projection = 'default';
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

    if (config.criteria !== undefined) {
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

    return builder;
};

Model.prototype.postProcess = function (builder) {
    _.forEach(builder.projection.config, function (alias) {
        if (_.isObject(alias)) {
            alias = alias.alias;
        }
        if (alias.indexOf('.') > 0) {
            var split = alias.split('.');
            builder.handlers.push(function (item) {
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
};

Model.prototype.processList = function (builder, list) {
    _.forEach(list, function (item) {
        this.processItem(builder, item);
    }, this);
};

Model.prototype.processItem = function (builder, item) {
    _.forEach(builder.handlers, function (handler) {
        handler(item);
    });

    _.forEach(builder.projection.middlewares, function (middleware) {
        middleware(item);
    });
};

Model.prototype.requestList = function (config) {
    var self = this,
        builder = this.buildQuery(config),
        Promise = this.Promise,
        isCached;

    config = config || {};
    isCached = !config.page && !config.pageSize && this.cached;

    if (isCached && this.cache.timestamp && diffFromNow(this.cache.timestamp) < this.timeout) {
        return Promise.resolve(this.cache.result);
    }

    return builder.exec().then(function (result) {
        self.postProcess(builder);
        self.processList(builder, result.list);

        if (isCached) {
            self.cache.timestamp = new Date();
            self.cache.result = result;
        }
        return Promise.resolve(result);
    });
};

Model.prototype.single = function (config) {
    var self = this,
        Promise = this.Promise,
        builder = this.buildQuery(config);

    return builder.single().then(function (result) {
        self.postProcess(builder);
        self.processItem(builder, result);

        return Promise.resolve(result);
    });
};

Model.prototype.requestRelated = function () {
    // TODO
};

module.exports = Model;