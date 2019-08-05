module.exports = function (sequelize, DataTypes) {

  const Author = sequelize.define('Author', {
    author_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    name: DataTypes.STRING

  }, {
    tableName: 'test_author',
  });

  Author.associate = models => {
    Author.hasMany(models.Article, {
      as: 'Articles',
      foreignKey: 'author_id'
    });
  };

  return Author;
};