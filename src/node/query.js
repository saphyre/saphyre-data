var squelFactory = require('./squel.factory');

/**
 * @typedef Query~ExecResult
 * @property {Array} list     The page list
 * @property {Number} count   The total elements found with the query
 * @property {Number} page    The current page index (1 based)
 * @property {Number} pages   Total pages available
 */

/**
 * @class
 * @param {Sequelize} sequelize
 * @param {Promise} Promise
 * @constructor
 */
function Query(sequelize, Promise, transaction) {
    var squel = squelFactory.getBySequelize(sequelize);

    this.sequelize = sequelize;
    this.Promise = Promise;
    this.selectQuery = squel.select();
    this.countQuery = squel.select().field('0');
    this.transaction = transaction;
}

Query.prototype.distinct = function () {
    this.selectQuery.distinct.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.field = function () {
    this.selectQuery.field.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.fields = function () {
    this.selectQuery.fields.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.from = function () {
    this.selectQuery.from.apply(this.selectQuery, arguments);
    this.countQuery.from.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.join = function () {
    this.selectQuery.join.apply(this.selectQuery, arguments);
    this.countQuery.join.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.left_join = function () {
    this.selectQuery.left_join.apply(this.selectQuery, arguments);
    this.countQuery.left_join.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.right_join = function () {
    this.selectQuery.right_join.apply(this.selectQuery, arguments);
    this.countQuery.right_join.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.outer_join = function () {
    this.selectQuery.outer_join.apply(this.selectQuery, arguments);
    this.countQuery.outer_join.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.where = function () {
    this.selectQuery.where.apply(this.selectQuery, arguments);
    this.countQuery.where.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.having = function () {
    this.selectQuery.having.apply(this.selectQuery, arguments);
    this.countQuery.having.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.order = function () {
    this.selectQuery.order.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.group = function () {
    this.selectQuery.group.apply(this.selectQuery, arguments);
    this.countQuery.group.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.limit = function () {
    this.selectQuery.limit.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.offset = function () {
    this.selectQuery.offset.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.top = function () {
    this.selectQuery.top.apply(this.selectQuery, arguments);
    return this;
};

Query.prototype.join = function () {
    this.selectQuery.join.apply(this.selectQuery, arguments);
    this.countQuery.join.apply(this.countQuery, arguments);
    return this;
};

Query.prototype.exec = function () {
    var Promise = this.Promise,
        pageSize = this.pageSize,
        page = this.page;

    return Promise.all([
        this.list(),
        this.count()
    ]).spread((result, count) => {
        return Promise.resolve({
            list : result,
            count : count,
            page : parseInt(page, 10),
            pages : Math.ceil(count / pageSize)
        });
    });
};

Query.prototype.page = function (page, size) {
    this.pageSize = size;
    this.page = page;
    this.offset((page - 1) * size).limit(size);
    return this;
};

Query.prototype.list = function () {
    var select = this.selectQuery.toParam();

    return this.sequelize.query(select.text, {
        replacements : select.values,
        transaction: this.transaction
    }).spread(selectResult => {
        return selectResult;
    });
};

Query.prototype.single = function () {
    var select = this.selectQuery.limit(1).toParam();

    return this.sequelize.query(select.text, {
        replacements : select.values,
        transaction: this.transaction
    }).spread(result => {
        return result[0];
    });
};

Query.prototype.count = function () {
    var select = this.countQuery.toParam(),
        query = 'SELECT COUNT(*) as count FROM (' + select.text + ') c';

    return this.sequelize.query(query, {
        replacements : select.values,
        transaction: this.transaction
    }).spread(countResult => {
        return parseInt(countResult[0].count, 10);
    });
};

module.exports = Query;