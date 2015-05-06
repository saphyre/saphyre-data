module.exports = function (sequelize, DataTypes) {

    var Author = sequelize.define('Author', {

        author_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        name : DataTypes.STRING

    }, {
        // FIXME não funciona quando não é configurado o tableName,
        // FIXME mas o sequelize trata o nome da tabela pelo nome da entidade
        tableName : 'author',

        classMethods: {
            associate: function (models) {
                Author.hasMany(models.Article, {
                    as : 'Articles',
                    foreignKey : 'author_id'
                });
            }
        }
    });

    return Author;
};