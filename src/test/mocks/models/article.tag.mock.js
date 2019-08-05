module.exports = function (sequelize, DataTypes) {
  return sequelize.define('ArticleTag', {}, {
    tableName: 'test_article_tag',
    paranoid: true
  });
};