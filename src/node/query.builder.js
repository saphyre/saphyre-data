'use strict';

var Query = require('./query'),
    Consts = require('./consts'),
    Criteria = require('./criteria'),
    _ = require('lodash'),
    squelFactory = require('./squel.factory'),
    Sequelize = require('sequelize'),
    transformers = {};

transformers[Sequelize.INTEGER.key] = value => value != null ? parseInt(value, 10) : null;
transformers[Sequelize.BIGINT.key] = value => value != null ? value.toString() : null;
transformers[Sequelize.BOOLEAN.key] = value => value != null ? !!value : null;

function getDeletedAtColumn(model) {
    return model.options.deletedAt || 'deletedAt';
}

function getValue(type, value) {
    if (value == null) {
        return null;
    }
    var transformer = transformers[type.key];
    return transformer ? transformer(value) : value;
}

function getTableName(model) {
    var tableName = model.getTableName();

    if (typeof tableName == 'string') {
        return tableName;
    } else {
        return tableName.schema + tableName.delimiter + tableName.tableName;
    }
}

function QueryBuilder(model, provider, functions) {
    this.squel = squelFactory.get(model);
    this.provider = provider;
    this.functions = functions;
    this.aliasCount = 0;
    this.center = this.createAlias(model.name);
    this.model = model;
    this.Promise = model.sequelize.Promise;
    this.query = new Query(model.sequelize, model.sequelize.Promise);

    this.query.from(getTableName(model), this.center);

    if (model.options.paranoid) {
        this.query.where(this.center + '.' + getDeletedAtColumn(model) + ' IS NULL');
    }

    this.primitiveFields = [];
    this.associations = {};
    this.handlers = [];
    this.globalHandlers = [];
    this.postProcesses = [];
}

function addField(isAggregated, builder, property) {
    // only add primitive fields to use in GROUP BY if necessary
    if (!isAggregated && builder.primitiveFields.indexOf(property) < 0) {
        builder.primitiveFields.push(property);
    }
}

function applySort(builder, sort, prefix) {
    if (Consts.RANDOM === sort) {
        builder.query.order(builder.functions.random());
        return;
    }

    _.forEach(sort, (config, path) => {
        var field;

        if (prefix) {
            path = `${prefix}.${path}`;
        }

        if (_.isObject(config)) {
            if (config.raw) {
                builder.query.order(path, config.direction === 'ASC');
            } else {
                field = builder.applyPath(path);
                builder.query.order(field.property, config.direction === 'ASC');
            }
        } else {
            field = builder.applyPath(path);
            builder.query.order(field.property, config === 'ASC');
        }
    });
}

function applyProjection(builder, projection, criterias, prefix, grouped, inner) {
    var provider = builder.provider,
        model = builder.model,
        handlers = builder.handlers,
        associatedModel,
        globalHandlers = builder.globalHandlers,
        pkName = builder.model.primaryKeyAttribute,
        pk;

    _.forEach(projection, (alias, path) => {
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
                builder.postProcesses.push(item => {
                    if (item != null) {
                        var queryBuilder = new QueryBuilder(builder.model, builder.provider, builder.functions);
                        queryBuilder.applyPath(path + '.$id', true, true);
                        applyProjection(queryBuilder, alias.projection, criterias, path, true, alias.joinType != 'left');
                        if (alias.sort) {
                            applySort(queryBuilder, alias.sort, path);
                        }
                        queryBuilder.query.where(builder.applyPath(pkName).property + ' = ?', item.$id);

                        if (alias.criteria) {
                            new Criteria(alias.criteria, false, builder.squel).apply(queryBuilder, criteria, {
                                grouped : grouped,
                                prefix : path
                            });
                        }

                        return queryBuilder.list().then(list => {
                            item[alias.list] = list;
                        });
                    }
                });
            } else {
                var fieldGrouped = false;
                field = builder.applyPath(path, alias.joinType == 'inner', false, alias.criteria, criterias);
                if (alias.func) {
                    // FIXME create a more elegant way to check if function is Aggregation
                    if (alias.func != builder.functions.convert) {
                        fieldGrouped = true;
                        grouped = true;
                    }
                    builder.query.field(alias.func(field.property, model, alias.options), alias.alias);
                } else {
                    builder.query.field(field.property, alias.alias);
                }

                addField(fieldGrouped, builder, field.property);
                builder.createHandler(alias.alias, field.type);
            }
        } else {
            field = builder.applyPath(path, inner);
            associatedModel = provider.getModel(field.model);
            if (field.isPropertyAssociation && field.hasMany && associatedModel && associatedModel.cached) {

                globalHandlers.push(associatedModel.list().then(result => {
                    var map = {};
                    _.forEach(result, item => {
                        map[item.$id.toString()] = item;
                    });
                    handlers.push(item => {
                        var list = [],
                            split = item[alias] ? item[alias].split(',') : [];

                        _.forEach(split, id => {
                            list.push(map[id]);
                        });
                        item[alias] = list;
                    });
                }));

                grouped = true;
                builder.query.field(builder.functions.group_concat(field.property, model), alias);
                builder.createHandler(alias, Sequelize.STRING);
            } else {
                builder.query.field(field.property, alias);
                addField(false, builder, field.property);
                builder.createHandler(alias, field.type);
            }
        }

    });

    if (pkName) {
        pk = prefix ? builder.applyPath(prefix + '.$id', inner) : builder.applyPath(pkName, inner);
        builder.query.field(pk.property, '$id');
        addField(false, builder, pk.property);
    }

    if (grouped) {
        _.forEach(builder.primitiveFields, field => {
            builder.query.group(field);
        });
    }

    return grouped;
}

QueryBuilder.prototype.toString = function () {
    return this.query.toString();
};

QueryBuilder.prototype.createAlias = function (name) {
    this.aliasCount += 1;
    return name.toLowerCase() + '_' + this.aliasCount;
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
        this.handlers.push(item => {
            if (item !== undefined) {
                var parent = item,
                    object = parent[alias];
                _.forEach(split, (subitem, index) => {
                    if (index + 1 < split.length) {
                        if (item[subitem] === undefined) {
                            item[subitem] = {};
                        }
                        item = item[subitem];
                    } else {
                        item[subitem] = getValue(type, object);
                        delete parent[alias];
                    }
                });
            }
        });
    } else if (transformers[type.key] != undefined) {
        this.handlers.push(item => {
            item[alias] = getValue(type, item[alias]);
        });
    }
};

QueryBuilder.prototype.list = function () {
    var builder = this,
        query = this.query;
    return this.Promise.all(this.globalHandlers).then(() => {
        return query.list().then(result =>{
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
    return this.Promise.all(this.globalHandlers).then(() => {
        return query.exec().then(result => {
            builder.processList(result.list);
            return result;
        });
    });
};

QueryBuilder.prototype.single = function () {
    var builder = this,
        Promise = this.Promise,
        query = this.query;
    return this.Promise.all(this.globalHandlers).spread(() => {
        return query.single().then(result => {
            var promises = [];
            _.forEach(builder.postProcesses, postProcessor => {
                promises.push(postProcessor(result));
            });

            return Promise.all(promises).then(() => {
                builder.processItem(result);
                return result;
            });
        });
    });
};

QueryBuilder.prototype.processList = function (list) {
    _.forEach(list, item => {
        this.processItem(item);
    });
};

QueryBuilder.prototype.processItem = function (item) {
    if (item !== undefined) {
        _.forEach(this.handlers, handler => {
            handler(item);
        });
        _.forEach(this.projection.middlewares, handler => {
            handler(item);
        });
    }
};

QueryBuilder.prototype.sort = function (sort) {
    applySort(this, sort.config);
    return this;
};

QueryBuilder.prototype.applyPath = function (path, joinInner, force, criteria, criterias) {
    var squel = this.squel,
        split = path.split('.'),
        model = this.model,
        result = { table : this.center },
        realPath = '',
        hasMany = false,
        leftJoin = this.query.left_join.bind(this.query),
        innerJoin = this.query.join.bind(this.query),
        join = joinInner ? innerJoin : leftJoin,
        isPropertyAssociation = false;

    _.forEach(split, (item, index) => {
        var assoc = model.associations,
            oldTable,
            joinTable,
            lastindex,
            expr;

        realPath += realPath.length > 0 ? '.' + item : item;

        if (item[item.length -1] === '?') {
            item = item.substring(0, item.length - 1);
            join = leftJoin;
        }

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
                            oldTable + '.' + assoc.source.primaryKeyField + ' = ' + joinTable + '.' + assoc.identifier);

                        expr.and(joinTable + '.' + assoc.foreignIdentifier + ' = ' + result.table + '.' + assoc.target.primaryKeyField);
                        if (model.options.paranoid) {
                            expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                        }
                    } else {
                        expr.and(oldTable + '.' + assoc.source.primaryKeyField + ' = ' + result.table + '.' + assoc.foreignKey);
                        if (model.options.paranoid) {
                            expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                        }
                    }
                } else if (assoc.associationType === 'HasOne') {
                    join = leftJoin;
                    expr.and(oldTable + '.' + assoc.source.primaryKeyField + ' = ' + result.table + '.' + assoc.identifierField || assoc.identifier); // support for sequelize 2
                    if (model.options.paranoid) {
                        expr.and(result.table + '.' + getDeletedAtColumn(model) + ' IS NULL');
                    }
                } else if (assoc.associationType === 'BelongsTo') {
                    expr.and(oldTable + '.' + assoc.foreignKey + ' = ' + result.table + '.' + assoc.target.rawAttributes[assoc.targetIdentifier].field);
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
                join(getTableName(model), result.table, expr);
            }

            isPropertyAssociation = index + 1 === split.length;

            if (hasMany) {
                result.field = model.primaryKeyAttribute;
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
            result.field = item;
        }
    });

    result.property = model.attributes[result.field].field;

    return {
        type : model.rawAttributes[result.field].type,
        property : result.table + '.' + result.property,
        hasMany : hasMany,
        model : model,
        isPropertyAssociation : isPropertyAssociation
    };
};

module.exports = QueryBuilder;