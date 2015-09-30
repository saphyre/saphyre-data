var Query = require('./query'),
    Criteria = require('./criteria'),
    _ = require('lodash'),
    squel = require('squel-having-block'),
    Sequelize = require('sequelize');

function getDeletedAtColumn(model) {
    return model.options.deletedAt || 'deletedAt';
}

function QueryBuilder(model, provider, functions) {
    this.provider = provider;
    this.functions = functions;
    this.aliasCount = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(model.tableName, this.center);

    if (model.options.paranoid) {
        this.query.where(this.center + '.' + getDeletedAtColumn(model) + ' IS NULL');
    }

    this.associations = {};
    this.handlers = [];
    this.globalHandlers = [];
    this.postProcesses = [];
}

function applySort(builder, sort, prefix) {
    _.forEach(sort, function (config, path) {
        var field;

        if (prefix) {
            path = prefix + '.' + path;
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

function applyProjection(builder, projection, criterias, prefix, grouped, inner) {

    var provider = builder.provider,
        model = builder.model,
        handlers = builder.handlers,
        associatedModel,
        globalHandlers = builder.globalHandlers,
        pkName = builder.model.primaryKeyAttribute,
        pk;

    _.forEach(projection, function (alias, path) {
        var field,
            criteria;

        if (prefix) {
            path = prefix + '.' + path;
        }

        if (_.isObject(alias)) {

            if (alias.list && alias.projection) {
                if (alias.criteria) {
                    criteria = criterias[alias.criteria.criteriaName];
                    delete criterias[alias.criteria.criteriaName];
                }
                this.postProcesses.push(function (item) {
                    if (item != null) {
                        var queryBuilder = new QueryBuilder(builder.model, builder.provider, builder.functions);
                        queryBuilder.applyPath(path + '.$id', true, true);
                        applyProjection(queryBuilder, alias.projection, criterias, path, true, true);
                        if (alias.sort) {
                            applySort(queryBuilder, alias.sort, path);
                        }
                        queryBuilder.query.where(builder.applyPath(pkName).property + ' = ?', item.$id);

                        if (alias.criteria) {
                            new Criteria(alias.criteria).apply(queryBuilder, criteria, {
                                grouped : grouped,
                                prefix : path
                            });
                        }

                        return queryBuilder.list().then(function (list) {
                            item[alias.list] = list;
                        });
                    }
                });
            } else {
                field = this.applyPath(path, alias.joinType == 'inner', false, alias.criteria, criterias);
                if (alias.func) {
                    this.query.field(alias.func(field.property, model, alias.options), alias.alias);
                } else {
                    this.query.field(field.property, alias.alias);
                }

                this.createHandler(alias.alias, field.type);
            }

        } else {
            field = this.applyPath(path, inner);
            associatedModel = provider.getModel(field.model);
            if (field.isPropertyAssociation && field.hasMany && associatedModel && associatedModel.cached) {

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

                grouped = true;
                this.query.field(this.functions.group_concat(field.property, model), alias);
                this.createHandler(alias, Sequelize.STRING);
            } else {
                this.query.field(field.property, alias);
                this.createHandler(alias, field.type);
            }
        }

    }, builder);

    if (pkName) {
        pk = prefix ? builder.applyPath(prefix + '.$id', inner) : builder.applyPath(pkName, inner);
        builder.query.field(pk.property, '$id');
        if (grouped) {
            builder.query.group(pk.property);
        }
    }

    return grouped;
}

QueryBuilder.prototype.toString = function () {
    return this.query.toString();
};

QueryBuilder.prototype.createAlias = function (name) {
    this.aliasCount += 1;
    return name + '_' + this.aliasCount;
};

QueryBuilder.prototype.projection = function (projection, criterias) {
    this.projection = projection;
    return applyProjection(this, projection.config, criterias);
};

QueryBuilder.prototype.createHandler = function (alias, type) {
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
                        if (type.key == Sequelize.INTEGER.key || type.key == Sequelize.BIGINT.key) {
                            item[subitem] = item[subitem] != null ? parseInt(item[subitem], 10) : null;
                        }
                        delete parent[alias];
                    }
                });
            }
        });
    } else if (type.key == Sequelize.INTEGER.key || type.key == Sequelize.BIGINT.key) {
        this.handlers.push(function (item) {
            item[alias] = item[alias] != null ? parseInt(item[alias], 10) : null;
        });
    }
};

QueryBuilder.prototype.list = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).then(function () {
        return query.list().then(function (result) {
            builder.processList(result);
            return result;
        });
    });
};

QueryBuilder.prototype.count = function () {
    return this.query.count();
};

QueryBuilder.prototype.exec = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).then(function () {
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

QueryBuilder.prototype.applyPath = function (path, joinInner, force, criteria, criterias) {
    var split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '',
        hasMany = false,
        leftJoin = this.query.left_join.bind(this.query),
        innerJoin = this.query.join.bind(this.query),
        join = joinInner ? innerJoin : leftJoin,
        isPropertyAssociation = false;

    _.forEach(split, function (item, index) {

        var assoc = model.associations,
            oldTable,
            joinTable,
            lastindex,
            expr;

        realPath += realPath.length > 0 ? '.' + item : item;

        if (assoc[item] !== undefined) {
            assoc = assoc[item];
            model = assoc.target;

            // This IF is Important to be here because the association might be already defined
            if (assoc.associationType === 'HasMany' || assoc.associationType === 'BelongsToMany') {
                hasMany = true;
            }

            oldTable = result.table;
            if (this.associations[realPath] !== undefined) {
                result.table = this.associations[realPath];
            } else {
                result.table = this.createAlias(assoc.as || model.name);
                this.associations[realPath] = result.table;

                expr = squel.expr();

                if (assoc.associationType === 'HasMany' || assoc.associationType === 'BelongsToMany') {
                    join = joinInner && force ? innerJoin : leftJoin;
                    if (assoc.doubleLinked || assoc.associationType === 'BelongsToMany') {
                        joinTable = oldTable + '_' + result.table;
                        join(assoc.combinedName, joinTable,
                            oldTable + '.' + assoc.foreignKey + ' = ' + joinTable + '.' + assoc.identifier);

                        expr.and(joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.foreignIdentifier);
                        if (model.options.paranoid) {
                            expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                        }
                    } else {
                        expr.and(oldTable + '.' + assoc.source.primaryKeyAttribute + ' = ' + result.table + '.' + assoc.foreignKey);
                        if (model.options.paranoid) {
                            expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                        }
                    }
                } else if (assoc.associationType === 'HasOne') {
                    join = leftJoin;
                    expr.and(oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.identifier);
                    if (model.options.paranoid) {
                        expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                    }
                } else if (assoc.associationType === 'BelongsTo') {
                    expr.and(oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.targetIdentifier);
                    if (model.options.paranoid) {
                        expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                    }
                }

                if (criteria && criteria.property) {
                    lastindex = criteria.property.lastIndexOf('.');
                    if (criteria.property.substr(0, lastindex) == realPath) {
                        criteria.operator(expr.and.bind(expr),
                            result.table + '.' + criteria.property.substr(lastindex + 1),
                            criterias[criteria.criteriaName][criteria.name]);
                        delete criterias[criteria.criteriaName];
                    }
                }
                join(model.tableName, result.table, expr);
            }

            isPropertyAssociation = index + 1 === split.length;

            if (hasMany) {
                result.property = model.primaryKeyAttribute;
            } else if (isPropertyAssociation) {
                throw new Error('Can`t select an entire Association');
            }

        } else {
            if (item == '$id') {
                item = model.primaryKeyAttribute;
            }
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
        type : model.rawAttributes[result.property].type,
        property : result.table + '.' + result.property,
        hasMany : hasMany,
        model : model,
        isPropertyAssociation : isPropertyAssociation
    };
};

module.exports = QueryBuilder;