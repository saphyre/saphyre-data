module.exports = {

    convert : function (path) {
        return path; // TODO check if it's necessary to convert blob to text
    },

    group_concat : function (path) {
        return "STRING_AGG(" + path + ", ',')";
    },

    sum : function (path) {
        return 'SUM(' + path + ')';
    },

    count : function (path) {
        return 'COUNT(' + path + ')';
    }

};