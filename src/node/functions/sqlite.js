module.exports = {

    convert : function (path) {
        return path;
    },

    group_concat : function (path) {
        return 'GROUP_CONCAT(' + path + ')';
    },

    sum : function (path) {
        return 'SUM(' + path + ')';
    },

    count : function (path) {
        return 'COUNT(' + path + ')';
    }

};