module.exports = function (sequelize, DataTypes) {

    var Article = sequelize.define('Article', {

        article_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        title : DataTypes.STRING,
        content : DataTypes.BLOB,
        date : DataTypes.DATE

    }, {
        // FIXME não funciona quando não é configurado o tableName,
        // FIXME mas o sequelize trata o nome da tabela pelo nome da entidade
        tableName : 'article',

        classMethods: {
            associate: function (models) {
                Article.belongsTo(models.Author, {
                    as : 'Author',
                    foreignKey : 'author_id'
                });

                Article.hasMany(models.Tag, {
                    as : 'Tags',
                    through : 'ArticleTag',
                    foreignKey : 'article_id'
                });
                models.Tag.hasMany(Article, {
                    as : 'Articles',
                    through : 'ArticleTag',
                    foreignKey : 'tag_id'
                });
            }
        }
    });

    return Article;
};