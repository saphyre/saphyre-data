module.exports = {

    convert : function (path) {
        return path; // TODO check if it's necessary to convert blob to text
    },

    group_concat : function (path) {
        return `array_to_string(array_agg(${path}), ',')`;
    },

    sum : function (path) {
        return `SUM(${path})`;
    },

    count : function (path) {
        return `COUNT(${path})`;
    }

};