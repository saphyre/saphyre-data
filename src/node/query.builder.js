var Query = require('./query'),
    _ = require('lodash');

function QueryBuilder(model) {
    this.count = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(model.options.tableName, this.center);
    this.associations = {};
}

QueryBuilder.prototype.toString = function () {
    return this.query.toString();
};

QueryBuilder.prototype.createAlias = function (name) {
    this.count += 1;
    return name + '_' + this.count;
};

QueryBuilder.prototype.projection = function (projection) {

    projection = projection.config;
    _.forEach(projection, function (alias, path) {

        var field = this.applyPath(path);
        this.query.field(field, alias);

    }, this);

    return this;
};

QueryBuilder.prototype.sort = function (sort) {

    sort = sort.config;
    _.forEach(sort, function (direction, path) {

        var field = this.applyPath(path);
        this.query.order(field, direction === 'ASC');

    }, this);

    return this;
};

QueryBuilder.prototype.applyPath = function (path) {
    var split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '';

    _.forEach(split, function (item, index) {

        var assoc = model.associations, // para os relacionamentos
            oldTable,
            joinTable;

        realPath += realPath.length > 0 ? '.' + item : item;

        if (assoc[item] !== undefined) {
            assoc = assoc[item];
            model = assoc.target;

            if (index + 1 === split.length) {
                throw new Error('Can`t select an entire Association');
            }

            oldTable = result.table;
            if (this.associations[realPath] !== undefined) {
                result.table = this.associations[realPath];
            } else {
                result.table = this.createAlias(assoc.as || model.name);
                this.associations[realPath] = result.table;

                if (assoc.associationType === 'HasMany') {
                    // TODO aqui ele tem que fazer group by, certo?
                    if (assoc.doubleLinked) {
                        joinTable = oldTable + '_' + result.table;
                        this.query.left_join(assoc.combinedName, joinTable,
                            oldTable + '.' + assoc.foreignKey + ' = ' + joinTable + '.' + assoc.identifier);
                        this.query.left_join(model.options.tableName, result.table,
                            joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.foreignIdentifier);
                    } else {
                        // TODO
                    }
                } else if (assoc.associationType === 'HasOne') {
                    this.query.left_join(model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.identifier);
                } else if (assoc.associationType === 'BelongsTo') {
                    this.query.join(model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.targetIdentifier);
                }
            }

        } else {
            if (index + 1 < split.length) {
                throw new Error('Association `' + item + '` not found');
            }
            if (model.rawAttributes[item] === undefined) {
                throw new Error('Attribute`' + item + '` not found');
            }
            result.property = item;
        }

    }, this);

    return result.table + '.' + result.property;
};

module.exports = QueryBuilder;