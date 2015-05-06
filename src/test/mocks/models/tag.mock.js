module.exports = function (sequelize, DataTypes) {

    var Tag = sequelize.define('Tag', {

        tag_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        name : DataTypes.STRING

    }, {
        // FIXME não funciona quando não é configurado o tableName,
        // FIXME mas o sequelize trata o nome da tabela pelo nome da entidade
        tableName : 'tag'
    });

    return Tag;
};