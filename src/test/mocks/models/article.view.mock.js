module.exports = function (sequelize, DataTypes) {

    var ArticleViewModel = sequelize.define('ArticleViewModel', {

        article_view_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        access_dt : DataTypes.DATE,
        ip : DataTypes.STRING

    }, {
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