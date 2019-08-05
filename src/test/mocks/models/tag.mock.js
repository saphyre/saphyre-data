module.exports = function (sequelize, DataTypes) {
  return sequelize.define('Tag', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'tag_id'
    },

    name: DataTypes.STRING

  }, { tableName: 'test_tag' });
};