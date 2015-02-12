var squel = require('squel');

function Query(sequelize, Promise) {
    this.sequelize = sequelize;
    this.Promise = Promise;
    this.selectQuery = squel.select();
    this.countQuery = squel.select().field('COUNT(*)', 'count');
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
    var Promise = this.Promise;
    return Promise.all([
        this.list(),
        this.count()
    ]).spread(function (result, count) {
        return Promise.resolve({
            list : result,
            count : count
        });
    });
};

Query.prototype.page = function (page, size) {
    this.offset((page - 1) * size).limit(size);
    return this;
};

Query.prototype.list = function () {
    var select = this.selectQuery.toString(),
        Promise = this.Promise;

    return this.sequelize.query(select).then(function (selectResult) {
        return Promise.resolve(selectResult);
    });
};

Query.prototype.single = function () {
    var select = this.selectQuery.limit(1).toString(),
        Promise = this.Promise;
    return this.sequelize.query(select).then(function (result) {
        return Promise.resolve(result[0]);
    });
};

Query.prototype.count = function () {
    var count = this.countQuery.toString(),
        Promise = this.Promise;

    return this.sequelize.query(count).then(function (countResult) {
        return Promise.resolve(countResult[0].count);
    });
};

module.exports = Query;