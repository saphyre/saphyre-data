module.exports = function (sequelize, DataTypes) {

    var Tag = sequelize.define('Tag', {

        id : {
            type : DataTypes.BIGINT,
            primaryKey : true,
            autoIncrement : true,
            field: 'tag_id'
        },

        name : DataTypes.STRING

    }, { tableName : 'test_tag' });

    return Tag;
};