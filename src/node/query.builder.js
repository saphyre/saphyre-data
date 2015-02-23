var Query = require('./query'),
    _ = require('lodash'),
    functions = require('./functions');

function QueryBuilder(model, provider, handlers) {
    this.provider = provider;
    this.count = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(model.options.tableName, this.center);
    this.associations = {};
    this.handlers = handlers;
    this.globalHandlers = [];
}

QueryBuilder.prototype.toString = function () {
    return this.query.toString();
};

QueryBuilder.prototype.createAlias = function (name) {
    this.count += 1;
    return name + '_' + this.count;
};

QueryBuilder.prototype.projection = function (projection) {

    var provider = this.provider,
        model = this.model,
        handlers = this.handlers,
        pkName,
        associatedModel,
        globalHandlers = this.globalHandlers;

    projection = projection.config;

    _.forEach(this.model.primaryKeys, function (pk) {
        pkName = pk.fieldName;
    });
    if (pkName) {
        pkName = this.applyPath(pkName);
        this.query.field(pkName.property, '$id');
        this.query.group(pkName.property);
    }

    _.forEach(projection, function (alias, path) {

        var field = this.applyPath(path);
        if (_.isObject(alias)) {
            this.query.field(alias.func(field.property, model, alias.options), alias.alias);
        } else {
            if (field.hasMany) {
                associatedModel = provider.getModel(field.model);
                if (!associatedModel || !associatedModel.cached) {
                    throw new Error('Association is HasMany and there`s no cached SaphydeData Model');
                }
                globalHandlers.push(associatedModel.requestList().then(function (result) {
                    var map = {};
                    _.forEach(result.list, function (item) {
                        map[item.$id.toString()] = item;
                    });
                    handlers.push(function (item) {
                        var list = [],
                            split = item[alias] ? item[alias].split(',') : [];

                        _.forEach(split, function (id) {
                            list.push(map[id]);
                        });
                        item[alias] = list;
                    });
                }));
                this.query.field(functions.group_concat(field.property, model), alias);
            } else {
                this.query.field(field.property, alias);
            }
        }

    }, this);

    return this;
};

QueryBuilder.prototype.exec = function () {
    var query = this.query;
    return this.Promise.all(this.globalHandlers).spread(function () {
        return query.exec();
    });
};

QueryBuilder.prototype.sort = function (sort) {

    sort = sort.config;
    _.forEach(sort, function (direction, path) {

        var field = this.applyPath(path);
        this.query.order(field.property, direction === 'ASC');

    }, this);

    return this;
};

QueryBuilder.prototype.applyPath = function (path) {
    var split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '',
        hasMany = false;

    _.forEach(split, function (item, index) {

        var assoc = model.associations, // para os relacionamentos
            oldTable,
            joinTable;

        realPath += realPath.length > 0 ? '.' + item : item;

        if (assoc[item] !== undefined) {
            assoc = assoc[item];
            model = assoc.target;

            oldTable = result.table;
            if (this.associations[realPath] !== undefined) {
                result.table = this.associations[realPath];
            } else {
                result.table = this.createAlias(assoc.as || model.name);
                this.associations[realPath] = result.table;

                if (assoc.associationType === 'HasMany') {
                    hasMany = true;
                    if (assoc.doubleLinked) {
                        joinTable = oldTable + '_' + result.table;
                        this.query.left_join(assoc.combinedName, joinTable,
                            oldTable + '.' + assoc.foreignKey + ' = ' + joinTable + '.' + assoc.identifier);
                        this.query.left_join(model.options.tableName, result.table,
                            joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.foreignIdentifier);
                    } else {
                        // TODO
                        throw new Error('Not implemented');
                    }
                } else if (assoc.associationType === 'HasOne') {
                    this.query.left_join(model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.identifier);
                } else if (assoc.associationType === 'BelongsTo') {
                    this.query.join(model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.targetIdentifier);
                }
            }

            if (hasMany) {
                _.forEach(model.primaryKeys, function (pk) {
                    result.property = pk.fieldName;
                });
            } else if (index + 1 === split.length) {
                throw new Error('Can`t select an entire Association');
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

    return {
        property : result.table + '.' + result.property,
        hasMany : hasMany,
        model : model
    };
};

module.exports = QueryBuilder;