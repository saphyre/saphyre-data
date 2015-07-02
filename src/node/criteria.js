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
            operator(where, path, value, queryBuilder);
        } else {
            operator(where, path, vl, queryBuilder);
        }
    });

    queryBuilder.query.where(expression);

};

function escapeString(value) {
    // TODO there's a bug in squel allowing sql injection
    // https://github.com/hiddentao/squel/issues/168
    if (typeof value == 'string') {
        return value.replace(/'/g, "''");
    }
    return value;
}

function isNull(expression, property) {
    expression(property + ' IS NULL ');
}

function isNotNull(expression, property) {
    expression(property + ' IS NOT NULL ');
}

function equal(expression, property, value) {
    value = escapeString(value);
    expression(property + ' = ?', value);
}

function notEqual(expression, property, value) {
    expression(property + ' <> ?', value);
}

function lessEqual(expression, property, value) {
    expression(property + ' <= ?', value);
}

function greaterEqual(expression, property, value) {
    expression(property + ' >= ?', value);
}

function lessThan(expression, property, value) {
    expression(property + ' < ?', value);
}

function greaterThan(expression, property, value) {
    expression(property + ' < ?', value);
}

function like(expression, property, value) {
    value = escapeString(value);
    value = '%' + value.replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression(property + " LIKE ? ESCAPE '*'", value);
}

function ilike(expression, property, value) {
    value = escapeString(value);
    value = '%' + value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression("UPPER(" + property + ") LIKE ? ESCAPE '*'", value);
}

function ilikeStart(expression, property, value) {
    value = escapeString(value);
    value = value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
    expression("UPPER(" + property + ") LIKE ? ESCAPE '*'", value);
}

function between(expression, property, values, queryBuilder) {
    // TODO there's a bug in squel that it's not possible to use more than one param on expr function
    // https://github.com/hiddentao/squel/issues/147
    // expression(property + ' BETWEEN ? AND ?', values[0], values[1]);
    queryBuilder.query.where(property + ' BETWEEN ? AND ?', values[0], values[1]);
}

function criteriaIn(expression, property, values) {
    expression(property + ' IN ?', values);
}

function notIn(expression, property, values) {
    if (values && values.length > 0) {
        expression(property + ' NOT IN ?', values);
    }
}

function has(expression, property, values) {
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
    NOT_IN : notIn,
    IS_NULL : isNull,
    IS_NOT_NULL : isNotNull
};

module.exports = Criteria;