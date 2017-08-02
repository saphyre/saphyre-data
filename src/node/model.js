var Projection = require('./projection'),
    Consts = require('./consts'),
    QueryBuilder = require('./query.builder'),
    squelFactory = require('./squel.factory'),
    Criteria = require('./criteria'),
    Sort = require('./sort'),
    _ = require('lodash');

///**
// * @typedef {Model~functions}
// */

/**
 * This is a repository Model
 *
 * @typedef {Model}
 *
 * @param {Provider}        provider the Model Provider
 * @param {Object}          options
 * @param {SequelizeModel}  options.model   The sequelize model
 * @param {Boolean}         options.cached  Flag indicating if this Repository will be cached
 * @param {Number}          options.timeout Timeout to invalidate cache
 *
 * @constructor
 */
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
    }

    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.squel = squelFactory.get(model);

    try {
        /**
         * Functions (agregations) available
         * @type {Object}
         * @property {Function} sum             To sum on the given property
         * @property {Function} count           To count on the given property
         * @property {Function} convert         Used only in MySQL to convert BLOB to utf8
         * @property {Function} group_concat    Will join the results with comma
         */
        this.functions = require('./functions/' + model.sequelize.options.dialect);
    } catch (err) {
        throw new Error('Dialect not supported');
    }

    this.provider = provider;
    this.criterias = {};
    this.sorts = {};
    this.sorts[Consts.RANDOM] = new Sort(Consts.RANDOM);

    this.projections = {
        '$count' : new Projection({})
    };
}

function diffFromNow(date) {
    return new Date().getTime() - date.getTime();
}

/**
 * Creates a new Criteria
 *
 * @param {String} name      The Criteria name
 * @param {Object} config    The criteria config
 *
 * @returns {Model} this
 *
 * @example
 * model.criteria('author', {
 *     name : 'id', // this is the name of the parameter
 *     property : 'author_id', // the property to check
 *     operator : SaphyreData.OPERATOR.EQUAL // the operator
 * });
 *
 * @example
 * // It's also possible to use an array of parameters
 * model.criteria('custom', [
 *    {
 *        name : 'id', // this is the name of the parameter
 *        property : 'author_id', // the property to check
 *        operator : SaphyreData.OPERATOR.EQUAL // the operator
 *    },
 *    {
 *        name : 'id', // this is the name of the parameter
 *        property : 'author_id', // the property to check
 *        operator : SaphyreData.OPERATOR.EQUAL // the operator
 *    }
 * ]);
 *
 * @example
 * // It's also possible to use an array of parameters with OR operator
 * model.criteriaOR('custom', [
 *    {
 *        name : 'id', // this is the name of the parameter
 *        property : 'author_id', // the property to check
 *        operator : SaphyreData.OPERATOR.EQUAL // the operator
 *    },
 *    {
 *        name : 'id', // this is the name of the parameter
 *        property : 'author_id', // the property to check
 *        operator : SaphyreData.OPERATOR.EQUAL // the operator
 *    }
 * ]);
 *
 * @example
 * // There's an option to pass a static value to criteria parameters:
 * model.criteria('non-removed', {
 *     name : 'status',
 *     property : 'status',
 *     operator : SaphyreData.OPERATOR.EQUAL,
 *     value : ArticleStatus.REMOVED
 * });
 *
 * @example
 * // It's also possible to use dynamic values, passing a function will evoke everytime a query is constructed.
 * model.criteria('today', {
 *     name : 'date',
 *     property : 'publish_dt',
 *     operator : SaphyreData.OPERATOR.GREATER_EQUAL,
 *     value : function () {
 *         return new Date();
 *     }
 * });
 */
Model.prototype.criteria = function (name, config) {
    this.criterias[name] = new Criteria(config, false, this.squel);
    return this;
};

/**
 * Creates a criteria which all conditions are linked with OR operator
 *
 * @param {String} name      The Criteria name
 * @param {Object} config    The criteria config
 * @returns {Model} this
 */
Model.prototype.criteriaOR = function (name, config) {
    this.criterias[name] = new Criteria(config, true, this.squel);
    return this;
};

/**
 * Creates a new Projection to the Model
 *
 * @param {String}  name      The projection name to be used later
 * @param {Object}  config    The projection config
 * @returns {Projection}
 *
 * @example
 *  model.projection('list', {
 *     'article_id' : 'id', // article_id as id
 *     'created_at' : 'created_at',
 *     'title' : 'title',
 *
 *     // the association Author will be automatically joined
 *     'Author.user_id' : 'author.id',
 *     // an object author will be created
 *     'Author.nickname' : 'author.nickname',
 *     // nickname will be a property of the author object recently created
 *     'Author.slug' : 'author.slug',
 *
 *     // Association Category will be automatically joined
 *     'Category.name' : 'category'
 * }).use(function (article) {
 *     article.author.thumbnail = '/users/thumbnail/' + article.author.id;
 * }).use(function (article) {
 *     console.log(article);
 * });
 *
 *
 * @example
 * // Its possible to use functions on a projection
 * 'Tags.tag_id' : {
 *    alias : 'tags_count',
 *    func : saphyreDataModel.functions.count
 * }
 *
 * @example
 * // If you want to create aditional queries (for each row), necessary in HasMany:
 * 'Tags' : {
 *     list : 'tags', // the name of the result list in each row
 *     projection : {
 *         'tag_id' : 'id',
 *         'name' : 'name' // internally Tags.name
 *     },
 *     sort : { // optional
 *         'name' : 'ASC'
 *     }
 * }
 *
 * @example
 * // For HasMany and HasOne the QueryBuilder will LEFT JOIN the table, if you want to INNER JOIN the table:
 * 'Tags.tag_id' : {
 *     alias : 'tags_count',
 *     func : saphyreDataModel.functions.count,
 *     joinType : 'inner' // case sensitive
 * }
 */
Model.prototype.projection = function (name, config) {
    var projection = new Projection(config);
    this.projections[name] = projection;
    return projection;
};

/**
 * Create a new Sort to the Model
 *
 * @param {String}  name      The sort name to be used later
 * @param {Object}  config    The sort config
 * @returns {Model} this
 *
 * @example
 * model.sort('recent', { 'publish_dt' : 'DESC' });
 *
 * @example
 * // It's possible to sort on a RAW text, like alias.
 * model.sort('recent', {
 *     'publish_dt' : {
 *         raw : true,
 *         direction : 'DESC'
 *      }
 * });
 */
Model.prototype.sort = function (name, config) {
    this.sorts[name] = new Sort(config);
    return this;
};

/**
 * Create multiple sorts to the model (ASC and DESC)
 *
 * @param {Object}  config    The sort config
 * @returns {Model} this
 *
 * @example
 * model.sorts({
 *     publishDt : 'publish_dt',
 *     name : 'name'
 * });
 * // And internally it looks like
 * model.sort('publishDt', { publish_dt : 'ASC' });
 * model.sort('-publishDt', { publish_dt : 'DESC' });
 * model.sort('name', { name : 'ASC' });
 * model.sort('-name', { name : 'DESC' });
 */
Model.prototype.sortMultiple = function (config) {
    _.forEach(config, (value, key) => {
        if (_.isString(value)) {
            this.sort(value, createObject(key, 'ASC'));
            this.sort(`-${value}`, createObject(key, 'DESC'));
        }
    });
    return this;
};

/**
 * Create multiple sorts to the model (ASC and DESC)
 * according to a configured projection
 * @param {string} name The projection name
 */
Model.prototype.sortProjection = function (name) {
    var projection = this.projections[name];
    if (!projection) {
        throw new Error(`Undefined projection '${name}`);
    }
    return this.sortMultiple(projection.config);
};

function createObject(key, value) {
    'use strict';
    let obj = {};
    obj[key] = value;
    return obj;
}

Model.prototype.buildQuery = function (config) {
    var builder = new QueryBuilder(this.model, this.provider, this.functions),
        projection,
        criterias = this.criterias,
        sort,
        sorts = this.sorts,
        grouped;

    config = config || {};

    if (config.projection === undefined) {
        config.projection = 'default';
    }

    projection = this.projections[config.projection];

    if (projection === undefined) {
        throw new Error('Undefined projection `' + config.projection + '`');
    }

    grouped = builder.projection(projection, config.criteria);

    if (config.sort !== undefined) {
        sort = _.isArray(config.sort) ? config.sort : [config.sort];
        _.forEach(sort, function (item) {
            item = sorts[item];

            if (item === undefined) {
                throw new Error('Undefined sort `' + config.sort + '`');
            }

            builder.sort(item);
        });
    }

    if (config.criteria !== undefined) {
        _.forEach(config.criteria, (values, name) => {
            if (values !== undefined) {
                var criteria = criterias[name];
                if (criteria === undefined) {
                    throw new Error('Criteria named `' + name + '` not found');
                }
                criteria.apply(builder, values, { grouped : grouped });
            }
        });
    }

    if (config.page && config.pageSize) {
        builder.query.page(config.page, config.pageSize);
    }

    return builder;
};

/**
 * Run the query with the given config (projection, criteria and sort)
 * This function will also run a count query to return the total elements
 *
 * @param {Object}  config               The query config
 * @param {String}  config.projection    The projection name
 * @param {String}  [config.sort]        The sort name
 * @param {Object}  [config.criteria]    The criteria config, see example below
 * @param {Number}  [config.page = 1]    The page to select
 * @param {Number}  config.pageSize      The page size
 * @param {Boolean} [config.cached]      Default to true only when the Model is configured to be cached, false to skip cache
 * @returns Promise{Query~ExecResult}
 *
 * @example
 * model.requestList({
 *     projection : 'list',
 *     criteria : {
 *         'non-removed' : true, // in this case, there's no value to pass
 *         'author' : 1 // it's possible to use 0..N criterias
 *     },
 *     page : 1,
 *     pageSize : 20,
 *     sort : 'recent'
 * }).then(result => {
 *     // result.list -> the list
 *     // result.count -> the total elements
 * });
 */
Model.prototype.requestList = function (config) {
    var self = this,
        Promise = this.Promise,
        builder,
        isCached;

    try {
        config = config || {};

        config.page = parseInt(config.page, 10);
        config.pageSize = parseInt(config.pageSize, 10);

        if (config.pageSize == undefined || isNaN(config.pageSize)) {
            return Promise.reject(new Error('Page size must be a valid number'));
        }
        if (config.page == undefined || isNaN(config.page)) {
            config.page = 1;
        }

        builder = this.buildQuery(config);

        isCached = !config.page && !config.pageSize && this.cached && config.cached !== false;

        if (isCached && this.cache && this.cache.timestamp && diffFromNow(this.cache.timestamp) < this.timeout) {
            return Promise.resolve({
                list : this.cache.result,
                count : this.cache.result.length
            });
        }

        return builder.exec().then(result => {
            if (isCached) {
                self.cache = {
                    timestamp : new Date(),
                    result : result.list
                };
            }
            result.sort = config.sort;
            return Promise.resolve(result);
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Run the query with the given config (projection, criteria and sort)
 *
 * @param {Object}  config               The query config
 * @param {String}  config.projection    The projection name
 * @param {String}  [config.sort]        The sort name
 * @param {Object}  [config.criteria]    The criteria config, see example below
 * @param {Boolean} [config.cached]      Default to true only when the Model is configured to be cached, false to skip cache
 * @returns Promise{Array}
 *
 * @example
 * model.list({
 *     projection : 'list',
 *     criteria : {
 *         'non-removed' : true, // in this case, there's no value to pass
 *         'author' : 1 // it's possible to use 0..N criterias
 *     },
 *     sort : 'recent'
 * }).then(list => {
 *     // list -> the list
 * });
 */
Model.prototype.list = function (config) {
    var self = this,
        Promise = this.Promise,
        builder,
        cached;

    config = config || {};
    delete config.page;
    delete config.pageSize;

    cached = config.cached !== false && this.cached;

    try {
        builder = this.buildQuery(config);

        if (cached && this.cache && this.cache.timestamp && diffFromNow(this.cache.timestamp) < this.timeout) {
            return Promise.resolve(this.cache.result);
        }

        return builder.list().then(list => {
            if (cached) {
                self.cache = {
                    timestamp : new Date(),
                    result : list
                };
            }
            return Promise.resolve(list);
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Run a count query with the given config (criteria)
 *
 * @param {Object}  config               The query config
 * @param {String}  config.projection    The projection name
 * @param {Object}  [config.criteria]    The criteria config, see example below
 * @returns Promise{Number}
 *
 * @example
 * model.list({
 *     criteria : {
 *         'non-removed' : true, // in this case, there's no value to pass
 *         'author' : 1 // it's possible to use 0..N criterias
 *     },
 * }).then(count => {
 *     // count -> the count
 * });
 */
Model.prototype.count = function (config) {
    var Promise = this.Promise,
        conf = { projection : '$count' };

    if (config && config.criteria) {
        conf.criteria = config.criteria;
    }

    try {
        return this.buildQuery(conf).count();
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Run the query with the given config (projection, criteria and sort) and return the FIRST result regardless
 * how many rows would return with the given criteria
 *
 * @param {Object}  config               The query config
 * @param {String}  config.projection    The projection name
 * @param {String}  [config.sort]        The sort name
 * @param {Object}  [config.criteria]    The criteria config, see example below
 * @param {Boolean} [config.cached]      Default to true only when the Model is configured to be cached, false to skip cache
 * @returns Promise{Array}
 *
 * @example
 * model.list({
 *     projection : 'list',
 *     criteria : {
 *         'non-removed' : true, // in this case, there's no value to pass
 *         'author' : 1 // it's possible to use 0..N criterias
 *     },
 *     sort : 'recent'
 * }).then(theFirstItem => {
 *
 * });
 */
Model.prototype.single = function (config) {
    try {
        var builder = this.buildQuery(config);
        return builder.single();
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Return the {Projection} with the given name
 *
 * @param name
 * @returns {Projection}
 */
Model.prototype.getProjection = function (name) {
    return this.projections[name];
};

module.exports = Model;