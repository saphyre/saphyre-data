module.exports = {
    convert : (path, model, options) => {
        var charset = options && options.charset ? options.charset : 'utf8';
        return 'CONVERT(' + path + ' USING ' + charset + ')';
    },
    group_concat : path => `GROUP_CONCAT(${path})`,
    sum : path => `SUM(${path})`,
    count : path => `COUNT(${path})`,
    random : () => `RAND()`
};