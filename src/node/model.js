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

Model.prototype.criteriaOR = function (name, config) {
    this.criterias[name] = new Criteria(config, true);
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
        sort;

    config = config || {};

    if (config.projection === undefined) {
        config.projection = 'default';
    }

    projection = this.projections[config.projection];

    if (projection === undefined) {
        throw new Error('Undefined projection `' + config.projection + '`');
    }

    builder.projection(projection);

    if (config.sort !== undefined) {
        sort = this.sorts[config.sort];

        if (sort === undefined) {
            throw new Error('Undefined sort `' + config.sort + '`');
        }

        builder.sort(sort);
    }

    if (config.criteria !== undefined) {
        _.forEach(config.criteria, function (values, name) {
            var criteria = criterias[name];
            if (criteria === undefined) {
                throw new Error('Criteria named `' + name + '` not found');
            }
            criteria.apply(builder, values);
        });
    }

    if (config.page && config.pageSize) {
        builder.query.page(config.page, config.pageSize);
    }

    return builder;
};

Model.prototype.requestList = function (config) {
    var self = this,
        Promise = this.Promise,
        builder,
        isCached;

    try {
        builder = this.buildQuery(config);

        config = config || {};
        isCached = !config.page && !config.pageSize && this.cached;

        if (isCached && this.cache.timestamp && diffFromNow(this.cache.timestamp) < this.timeout) {
            return Promise.resolve(this.cache.result);
        }

        return builder.exec().then(function (result) {

            if (isCached) {
                self.cache.timestamp = new Date();
                self.cache.result = result;
            }
            return Promise.resolve(result);
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

Model.prototype.list = function (config) {
    var self = this,
        Promise = this.Promise,
        builder;

    config = config || {};
    delete config.page;
    delete config.pageSize;

    try {
        builder = this.buildQuery(config);

        if (this.cached && this.cache.timestamp && diffFromNow(this.cache.timestamp) < this.timeout) {
            return Promise.resolve(this.cache.result);
        }

        return builder.list().then(function (list) {

            if (this.cached) {
                self.cache.timestamp = new Date();
                self.cache.result = list;
            }
            return Promise.resolve(list);
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

Model.prototype.single = function (config) {
    var builder = this.buildQuery(config);
    return builder.single();
};

Model.prototype.requestRelated = function () {
    // TODO
};

module.exports = Model;