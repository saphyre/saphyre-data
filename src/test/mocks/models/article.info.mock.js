module.exports = function (sequelize, DataTypes) {

    var ArticleInfo = sequelize.define('ArticleInfo', {

        article_info_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        status : DataTypes.INTEGER

    }, {

        classMethods: {
            associate: function (models) {
                ArticleInfo.belongsTo(models.Author, {
                    as : 'Owner',
                    foreignKey : 'author_id'
                });
            }
        }
    });

    return ArticleInfo;
};