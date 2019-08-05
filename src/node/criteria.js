var _ = require('lodash');

/**
 * A model Criteria, this will be the WHERE
 *
 * @class
 */
class Criteria {

    /**
     * @param {Object} config         An object which the KEY will be the Model property and the VALUE will be the alias
     * @param {Boolean} [or=false]    Flag indicating if the WHERE will be composed with OR or AND
     * @constructor
     */
  constructor(config, or, squel) {
    this.squel = squel;
    this.or = or === true;
    this.config = config;
  }

  apply(queryBuilder, values, options) {
    let config = this.config,
      expression = this.squel.expr(),
      where = this.or ? expression.or : expression.and,
      hasManyPresent = false,
      exprParam;

    options = options || { grouped: false, prefix: '' };
    options.prefix = options.prefix || '';

    if (options.prefix) {
      options.prefix = options.prefix + '.';
    }

    where = where.bind(expression);

    if (!_.isArray(config)) {
      config = [config];
    }

    _.forEach(config, item => {
      let value = item.value,
        property = options.prefix + item.property,
        operator = item.operator,
        vl = values[item.name],
        path = queryBuilder.applyPath(property);

      hasManyPresent = hasManyPresent || path.hasMany;

      if (value !== undefined) {
        if (_.isFunction(value)) {
          value = value();
        }
        operator(where, path.property, value, queryBuilder);
      } else {
        operator(where, path.property, vl, queryBuilder);
      }
    });

    if (hasManyPresent && options.grouped) {
      exprParam = expression.toParam();
      const sum = queryBuilder.functions.sum(`CASE WHEN ${exprParam.text} THEN 1 ELSE 0 END`);
      exprParam.values.unshift(`${sum} > 0`);
      queryBuilder.query.having.apply(queryBuilder.query, exprParam.values);
    } else {
      queryBuilder.query.where(expression);
    }
  }
}

function isNull(expression, property) {
  expression(property + ' IS NULL ');
}

function isNotNull(expression, property) {
  expression(property + ' IS NOT NULL ');
}

function equal(expression, property, value) {
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
  expression(property + ' > ?', value);
}

function like(expression, property, value) {
  value = '%' + value.replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
  expression(property + ' LIKE ? ESCAPE \'*\'', value);
}

function ilike(expression, property, value) {
  value = '%' + value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
  expression('UPPER(' + property + ') LIKE ? ESCAPE \'*\'', value);
}

function ilikeStart(expression, property, value) {
  value = value.toUpperCase().replace(/(%)|(_)|(\*)/g, '*$1$2$3').replace(/\*{2}/g, '%') + '%';
  expression('UPPER(' + property + ') LIKE ? ESCAPE \'*\'', value);
}

function between(expression, property, values, queryBuilder) {
  // TODO there's a bug in squel that it's not possible to use more than one param on expr function
  // https://github.com/hiddentao/squel/issues/147
  // expression(property + ' BETWEEN ? AND ?', values[0], values[1]);
  queryBuilder.query.where(property + ' BETWEEN ? AND ?', values[0], values[1]);
}

function criteriaIn(expression, property, values) {
  if (values && values.length) {
    expression(property + ' IN ?', values);
  } else {
    expression('0');
  }
}

function notIn(expression, property, values) {
  if (values && values.length > 0) {
    expression(property + ' NOT IN ?', values);
  } else {
    expression('1');
  }
}

function has(expression, property, values) {
  // TODO
}

/**
 * Criteria OPERATORS
 *
 * @enum
 */
Criteria.prototype.OPERATOR = {
  NOT_EQUAL: notEqual,
  EQUAL: equal,
  LESS_EQUAL: lessEqual,
  GREATER_EQUAL: greaterEqual,
  LESS_THAN: lessThan,
  GREATER_THAN: greaterThan,
  LIKE: like,
  ILIKE: ilike,
  ILIKE_START: ilikeStart,
  BETWEEN: between,
  /** not yet implemented */
  HAS: has,
  IN: criteriaIn,
  NOT_IN: notIn,
  IS_NULL: isNull,
  IS_NOT_NULL: isNotNull
};

module.exports = Criteria;