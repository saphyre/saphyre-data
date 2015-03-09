var Query = require('./query'),
    _ = require('lodash'),
    functions = require('./functions');

function QueryBuilder(model, provider) {
    this.provider = provider;
    this.count = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(model.options.tableName, this.center);
    this.associations = {};
    this.handlers = [];
    this.globalHandlers = [];
    this.postProcesses = [];
}

function applyProjection(builder, projection, grouped) {

    var provider = builder.provider,
        model = builder.model,
        handlers = builder.handlers,
        pkName = builder.model.primaryKeyAttribute,
        associatedModel,
        globalHandlers = builder.globalHandlers;

    if (grouped === undefined) {
        grouped = true;
    }

    if (pkName && grouped) {
        pkName = builder.applyPath(pkName);
        builder.query.field(pkName.property, '$id');
        builder.query.group(pkName.property);
    }

    _.forEach(projection, function (alias, path) {

        var field;
        if (_.isObject(alias)) {
            field = this.applyPath(path, alias.joinType == 'inner');
            this.query.field(alias.func(field.property, model, alias.options), alias.alias);
        } else {
            field = this.applyPath(path);
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
            this.createHandler(alias);
        }

    }, builder);

    return this;
}

QueryBuilder.prototype.toString = function () {
    return this.query.toString();
};

QueryBuilder.prototype.createAlias = function (name) {
    this.count += 1;
    return name + '_' + this.count;
};

QueryBuilder.prototype.projection = function (projection) {

    this.projection = projection;
    applyProjection(this, projection.config);

    return this;
};

QueryBuilder.prototype.createHandler = function (alias) {
    if (_.isObject(alias) && alias.alias) {
        alias = alias.alias;
    }
    if (alias.indexOf('.') > 0) {
        var split = alias.split('.');
        this.handlers.push(function (item) {
            if (item !== undefined) {
                var parent = item,
                    object = parent[alias];
                _.forEach(split, function (subitem, index) {
                    if (index + 1 < split.length) {
                        if (item[subitem] === undefined) {
                            item[subitem] = {};
                        }
                        item = item[subitem];
                    } else {
                        item[subitem] = object;
                        delete parent[alias];
                    }
                });
            }
        });
    }
};

QueryBuilder.prototype.exec = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).spread(function () {
        return query.exec().then(function (result) {
            builder.processList(result.list);
            return result;
        });
    });
};

QueryBuilder.prototype.single = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).spread(function () {
        return query.single().then(function (result) {
            builder.processItem(result);
            return result;
        });
    });
};

QueryBuilder.prototype.processList = function (list) {
    _.forEach(list, function (item) {
        console.log(item);
        this.processItem(item);
    }, this);
};

QueryBuilder.prototype.processItem = function (item) {
    if (item !== undefined) {
        _.forEach(this.handlers, function (handler) {
            handler(item);
        });
        _.forEach(this.projection.middlewares, function (handler) {
            handler(item);
        });
    }
};

QueryBuilder.prototype.sort = function (sort) {

    sort = sort.config;
    _.forEach(sort, function (config, path) {
        var field;

        if (_.isObject(config)) {
            if (config.raw) {
                this.query.order(path, config.direction === 'ASC');
            } else {
                field = this.applyPath(path);
                this.query.order(field.property, config.direction === 'ASC');
            }
        } else {
            field = this.applyPath(path);
            this.query.order(field.property, config === 'ASC');
        }

    }, this);

    return this;
};

QueryBuilder.prototype.applyPath = function (path, joinInner) {
    var split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '',
        hasMany = false,
        join = joinInner ? this.query.join : this.query.left_join;

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
                        join.call(this.query, assoc.combinedName, joinTable,
                            oldTable + '.' + assoc.foreignKey + ' = ' + joinTable + '.' + assoc.identifier);
                        join.call(this.query, model.options.tableName, result.table,
                            joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.foreignIdentifier);
                    } else {
                        join.call(this.query, model.options.tableName, result.table,
                            oldTable + '.' + assoc.source.primaryKeyAttribute + ' = ' + result.table + '.' + assoc.foreignKey);
                    }
                } else if (assoc.associationType === 'HasOne') {
                    join.call(this.query, model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.identifier);
                } else if (assoc.associationType === 'BelongsTo') {
                    this.query.join(model.options.tableName, result.table,
                        oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.targetIdentifier);
                }
            }

            if (hasMany) {
                result.property = model.primaryKeyAttribute;
            } else if (index + 1 === split.length) {
                throw new Error('Can`t select an entire Association');
            }

        } else {
            if (index + 1 < split.length) {
                throw new Error('Association `' + item + '` not found on ' + model.name);
            }
            if (model.rawAttributes[item] === undefined) {
                throw new Error('Attribute `' + item + '` not found on ' + model.name);
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