const squel = require('squel');

exports.get = function (model) {
    return getBySequelize(model.sequelize);
};

exports.getBySequelize = getBySequelize;

function getBySequelize(sequelize) {
    switch (sequelize.options.dialect) {
        case 'postgres':
            squel.cls.DefaultQueryBuilderOptions.tableAliasQuoteCharacter = '"';
            squel.cls.DefaultQueryBuilderOptions.fieldAliasQuoteCharacter = '"';
            squel.cls.DefaultQueryBuilderOptions.nameQuoteCharacter = "";
            squel.cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = true;
            squel.cls.DefaultQueryBuilderOptions.autoQuoteTableNames = true;
            squel.cls.DefaultQueryBuilderOptions.autoQuoteFieldNames = true;
            return squel;
        case 'mysql':
            return squel;
        default:
            return squel;
    }
}