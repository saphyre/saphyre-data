module.exports = function (sequelize, DataTypes) {

    var Article = sequelize.define('Article', {

        id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true,
            field : 'article_id'
        },

        title : DataTypes.STRING,
        content : DataTypes.BLOB,
        date : DataTypes.DATE,
        active : DataTypes.BOOLEAN

    }, {
        tableName : 'test_article',

        paranoid : true,

        classMethods: {
            associate: function (models) {
                Article.belongsTo(models.Author, {
                    as : 'Author',
                    foreignKey : 'author_id'
                });

                Article.belongsToMany(models.Tag, {
                    as : 'Tags',
                    through : 'test_article_tag',
                    foreignKey : 'article_id',
                    otherKey : 'tag_id'
                });

                Article.hasOne(models.ArticleInfo, {
                    as : 'Info',
                    foreignKey : 'article_id'
                });

                Article.hasMany(models.ArticleViewModel, {
                    as : 'Views',
                    foreignKey : 'article_id'
                });
            }
        }
    });

    return Article;
};