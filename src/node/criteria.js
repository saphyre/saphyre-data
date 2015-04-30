var _ = require('lodash'),
    squel = require('squel');

function Criteria(config, or) {
    this.or = or === true;
    this.config = config;
}

Criteria.prototype.apply = function (queryBuilder, values) {
    var config = this.config,
        expression = squel.expr(),
        where = this.or ? expression.or : expression.and;

    where = where.bind(expression);

    if (!_.isArray(config)) {
        config = [config];
    }

    _.forEach(config, function (item) {
        var value = item.value,
            property = item.property,
            operator = item.operator,
            vl = values[item.name],
            path = queryBuilder.applyPath(property).property;

        if (value !== undefined) {
            if (_.isFunction(value)) {
                value = value();
            }
            operator(where, value, path);
        } else {
            operator(where, vl, path);
        }
    });

    queryBuilder.query.where(expression);

};

function equal(expression, value, property) {
    expression(property + ' = ?', value);
}

function notEqual(expression, value, property) {
    expression(property + ' <> ?', value);
}

function lessEqual(expression, value, property) {
    expression(property + ' <= ?', value);
}

function greaterEqual(expression, value, property) {
    expression(property + ' >= ?', value);
}

function lessThan(expression, value, property) {
    expression(property + ' < ?', value);
}

function greaterThan(expression, value, property) {
    expression(property + ' < ?', value);
}

function like(expression, value, property) {
    value = '%' + value.replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression(property + " LIKE ? ESCAPE '*'", value);
}

function ilike(expression, value, property) {
    value = '%' + value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression("UPPER(" + property + ") LIKE ? ESCAPE '*'", value);
}

function ilikeStart(expression, value, property) {
    value = value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression("UPPER(" + property + ") LIKE ? ESCAPE '*'", value);
}

function between(expression, values, property, queryBuilder) {
    // TODO there's a bug in squel that it's not possible to use more than one param on expr function
    // https://github.com/hiddentao/squel/issues/147
    // expression(property + ' BETWEEN ? AND ?', values[0], values[1]);
    queryBuilder.query.where(property + ' BETWEEN ? AND ?', values[0], values[1]);
}

function criteriaIn(expression, values, property) {
    expression(property + ' IN ?', values);
}

function notIn(expression, values, property) {
    if (values && values.length > 0) {
        expression(property + ' NOT IN ?', values);
    }
}

function has(expression, values, property) {
    // TODO
}

Criteria.prototype.OPERATOR = {
    NOT_EQUAL : notEqual,
    EQUAL : equal,
    LESS_EQUAL : lessEqual,
    GREATER_EQUAL : greaterEqual,
    LESS_THAN : lessThan,
    GREATER_THAN : greaterThan,
    LIKE : like,
    ILIKE : ilike,
    ILIKE_START : ilikeStart,
    BETWEEN : between,
    HAS : has,
    IN : criteriaIn,
    NOT_IN : notIn
};

module.exports = Criteria;