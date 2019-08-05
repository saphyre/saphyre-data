module.exports = function (sequelize, DataTypes) {

  const ArticleInfo = sequelize.define('ArticleInfo', {
    article_info_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    status: DataTypes.INTEGER
  }, {
    tableName: 'test_article_info',
  });

  ArticleInfo.associate = models => {
    ArticleInfo.belongsTo(models.Author, {
      as: 'Owner',
      foreignKey: 'author_id'
    });
  };

  return ArticleInfo;
};