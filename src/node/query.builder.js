var Query = require('./query'),
    _ = require('lodash');

function QueryBuilder(model, provider, functions) {
    this.provider = provider;
    this.functions = functions;
    this.count = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(model.options.tableName, this.center);

    if (model.options.paranoid) {
        this.query.where(this.center + '.' + model.options.deletedAt + ' IS NULL');
    }

    this.associations = {};
    this.handlers = [];
    this.globalHandlers = [];
    this.postProcesses = [];
}

function applySort(builder, sort, preffix) {
    _.forEach(sort, function (config, path) {
        var field;

        if (preffix) {
            path = preffix + '.' + path;
        }

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

    }, builder);
}

function applyProjection(builder, projection, preffix, grouped, inner) {

    var provider = builder.provider,
        model = builder.model,
        handlers = builder.handlers,
        associatedModel,
        globalHandlers = builder.globalHandlers,
        pkName = builder.model.primaryKeyAttribute;

    _.forEach(projection, function (alias, path) {

        var field;

        if (preffix) {
            path = preffix + '.' + path;
        }

        if (_.isObject(alias)) {

            if (alias.list && alias.projection) {
                this.postProcesses.push(function (item) {
                    if (item != null) {
                        var queryBuilder = new QueryBuilder(builder.model, builder.provider, builder.functions);
                        applyProjection(queryBuilder, alias.projection, path, false, true);
                        if (alias.sort) {
                            applySort(queryBuilder, alias.sort, path);
                        }
                        queryBuilder.query.where(builder.applyPath(pkName).property + ' = ?', item.$id);
                        return queryBuilder.list().then(function (list) {
                            item[alias.list] = list;
                        });
                    }
                });
            } else {
                field = this.applyPath(path, alias.joinType == 'inner');
                this.query.field(alias.func(field.property, model, alias.options), alias.alias);
                this.createHandler(alias.alias);
            }

        } else {
            field = this.applyPath(path, inner);
            if (field.hasMany && grouped !== false) {
                associatedModel = provider.getModel(field.model);
                if (!associatedModel || !associatedModel.cached) {
                    throw new Error('Association is HasMany and there`s no cached SaphydeData Model');
                }
                globalHandlers.push(associatedModel.list().then(function (result) {
                    var map = {};
                    _.forEach(result, function (item) {
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

                this.query.field(this.functions.group_concat(field.property, model), alias);
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

    var pkName = this.model.primaryKeyAttribute;

    if (pkName) {
        pkName = this.applyPath(pkName);
        this.query.field(pkName.property, '$id');
        this.query.group(pkName.property);
    }

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

QueryBuilder.prototype.list = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).spread(function () {
        return query.list().then(function (result) {
            builder.processList(result);
            return result;
        });
    });
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
        Promise = this.Promise,
        query = this.query;
    return this.Promise.all(this.globalHandlers).spread(function () {
        return query.single().then(function (result) {
            var promises = [];
            _.forEach(builder.postProcesses, function (postProcessor) {
                promises.push(postProcessor(result));
            });

            return Promise.all(promises).spread(function () {
                builder.processItem(result);
                return result;
            });
        });
    });
};

QueryBuilder.prototype.processList = function (list) {
    _.forEach(list, function (item) {
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
    applySort(this, sort.config);
    return this;
};

QueryBuilder.prototype.applyPath = function (path, joinInner) {
    var split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '',
        hasMany = false,
        join = joinInner ? this.query.join : this.query.left_join,
        isLeftJoin = false; // indica se há uma associação com left join antes, se houver, todas os próximos joins devem ser LEFT

    _.forEach(split, function (item, index) {

        var assoc = model.associations, // para os relacionamentos
            oldTable,
            joinTable,
            condition;

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

                        condition = joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.foreignIdentifier;
                        if (model.options.paranoid) {
                            condition += ' AND ' + result.table + '.' + model.options.deletedAt + ' IS NULL';
                        }
                        join.call(this.query, model.options.tableName, result.table, condition);
                    } else {
                        condition = oldTable + '.' + assoc.source.primaryKeyAttribute + ' = ' + result.table + '.' + assoc.foreignKey;
                        if (model.options.paranoid) {
                            condition += ' AND ' + result.table + '.' + model.options.deletedAt + ' IS NULL';
                        }
                        join.call(this.query, model.options.tableName, result.table, condition);
                    }
                } else if (assoc.associationType === 'HasOne') {
                    condition = oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.identifier;
                    if (model.options.paranoid) {
                        condition += ' AND ' + result.table + '.' + model.options.deletedAt + ' IS NULL';
                    }
                    join.call(this.query, model.options.tableName, result.table, condition);
                    isLeftJoin = !joinInner;
                } else if (assoc.associationType === 'BelongsTo') {
                    condition = oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.targetIdentifier;
                    if (model.options.paranoid) {
                        condition += ' AND ' + result.table + '.' + model.options.deletedAt + ' IS NULL';
                    }

                    if (isLeftJoin) {
                        this.query.join(model.options.tableName, result.table, condition);
                    } else {
                        this.query.left_join(model.options.tableName, result.table, condition);
                    }

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