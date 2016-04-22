module.exports = {
    convert : path => path,
    group_concat : path => `GROUP_CONCAT(${path})`,
    sum : path => `SUM(${path})`,
    count : path => `COUNT(${path})`
};