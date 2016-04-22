module.exports = function (sequelize, DataTypes) {

    var User = sequelize.define('User', {

        user_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        name : DataTypes.STRING

    }, { tableName : 'test__user' });

    return User;
};