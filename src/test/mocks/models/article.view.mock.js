module.exports = function (sequelize, DataTypes) {

    var ArticleViewModel = sequelize.define('ArticleViewModel', {

        id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true,
            field : 'article_view_id'
        },

        access_dt : DataTypes.DATE,
        ip : DataTypes.STRING

    }, {
        tableName : 'test_article_view_model',

        timestamps : false,
        classMethods: {
            associate: function (models) {
                ArticleViewModel.belongsTo(models.User, {
                    as : 'Viewer',
                    foreignKey : 'user_id'
                });
                ArticleViewModel.belongsTo(models.Article, {
                    as : 'Article',
                    foreignKey : 'article_id'
                });
            }
        }
    });

    return ArticleViewModel;
};