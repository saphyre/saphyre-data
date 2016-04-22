module.exports = function (sequelize, DataTypes) {

    var Tag = sequelize.define('Tag', {

        tag_id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true
        },

        name : DataTypes.STRING

    }, { tableName : 'test_tag' });

    return Tag;
};