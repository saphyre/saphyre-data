module.exports = function (sequelize, DataTypes) {
  return sequelize.define('User', {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    name: DataTypes.STRING

  }, { tableName: 'test__user' });
};