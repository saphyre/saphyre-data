module.exports = function (sequelize, DataTypes) {
  
      var ArticleTag = sequelize.define('ArticleTag', {}, {
          tableName : 'test_article_tag',
          paranoid : true
      });
  
      return ArticleTag;
  };