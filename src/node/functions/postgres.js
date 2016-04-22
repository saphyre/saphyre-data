module.exports = {
    convert : path => path,
    group_concat : path => `array_to_string(array_agg(${path}), ',')`,
    sum : path => `SUM(${path})`,
    count : path => `COUNT(${path})`
};