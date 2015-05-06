module.exports = {

    convert : function (path, model, options) {
        var charset = options && options.charset ? options.charset : 'utf8';
        return 'CONVERT(' + path + ' USING ' + charset + ')';
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