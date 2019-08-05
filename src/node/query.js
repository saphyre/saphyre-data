const squelFactory = require('./squel.factory');

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
 * @constructor
 */
class Query {
  constructor(sequelize, transaction) {
    const squel = squelFactory.getBySequelize(sequelize);

    this.sequelize = sequelize;
    this.selectQuery = squel.select();
    this.countQuery = squel.select().field('0');
    this.transaction = transaction;
  }

  distinct() {
    this.selectQuery.distinct.apply(this.selectQuery, arguments);
    return this;
  }

  field() {
    this.selectQuery.field.apply(this.selectQuery, arguments);
    return this;
  }

  fields() {
    this.selectQuery.fields.apply(this.selectQuery, arguments);
    return this;
  }

  from() {
    this.selectQuery.from.apply(this.selectQuery, arguments);
    this.countQuery.from.apply(this.countQuery, arguments);
    return this;
  }

  join() {
    this.selectQuery.join.apply(this.selectQuery, arguments);
    this.countQuery.join.apply(this.countQuery, arguments);
    return this;
  }

  left_join() {
    this.selectQuery.left_join.apply(this.selectQuery, arguments);
    this.countQuery.left_join.apply(this.countQuery, arguments);
    return this;
  }

  right_join() {
    this.selectQuery.right_join.apply(this.selectQuery, arguments);
    this.countQuery.right_join.apply(this.countQuery, arguments);
    return this;
  }

  outer_join() {
    this.selectQuery.outer_join.apply(this.selectQuery, arguments);
    this.countQuery.outer_join.apply(this.countQuery, arguments);
    return this;
  }

  where() {
    this.selectQuery.where.apply(this.selectQuery, arguments);
    this.countQuery.where.apply(this.countQuery, arguments);
    return this;
  }

  having() {
    this.selectQuery.having.apply(this.selectQuery, arguments);
    this.countQuery.having.apply(this.countQuery, arguments);
    return this;
  }

  order() {
    this.selectQuery.order.apply(this.selectQuery, arguments);
    return this;
  }

  group() {
    this.selectQuery.group.apply(this.selectQuery, arguments);
    this.countQuery.group.apply(this.countQuery, arguments);
    return this;
  }

  limit() {
    this.selectQuery.limit.apply(this.selectQuery, arguments);
    return this;
  }

  offset() {
    this.selectQuery.offset.apply(this.selectQuery, arguments);
    return this;
  }

  top() {
    this.selectQuery.top.apply(this.selectQuery, arguments);
    return this;
  }

  async exec() {
    const pageSize = this.pageSize;
    const page = this.page;
    const [result, count] = await Promise.all([this.list(), this.count()]);
    return {
      list: result,
      count: count,
      page: parseInt(page, 10),
      pages: Math.ceil(count / pageSize)
    };
  }

  page(page, size) {
    this.pageSize = size;
    this.page = page;
    this.offset((page - 1) * size).limit(size);
    return this;
  }

  async list() {
    const select = this.selectQuery.toParam();
    const [selectResult] = await this.sequelize.query(select.text, {
      replacements: select.values,
      transaction: this.transaction
    });
    return selectResult;
  };

  async single() {
    const select = this.selectQuery.limit(1).toParam();
    const [result] = await this.sequelize.query(select.text, {
      replacements: select.values,
      transaction: this.transaction
    });
    return result[0];
  }

  async count() {
    const select = this.countQuery.toParam();
    const query = 'SELECT COUNT(*) as count FROM (' + select.text + ') c';
    const [countResult] = await this.sequelize.query(query, {
      replacements: select.values,
      transaction: this.transaction
    });
    return parseInt(countResult[0].count, 10);
  }
}


module.exports = Query;