/*
 * TODO
 * As funções abaixo só funcionam no MySQL, deve ser feito um tratamento para
 * identificar o dialeto utilizado no Sequelize e utilizar a função de acordo com o SGBD.
 */
module.exports = {

    convert : function (path, model, options) { // TODO apenas MySQL
        var charset = options && options.charset ? options.charset : 'utf8';
        return 'CONVERT(' + path + ' USING ' + charset + ')';
    },

    group_concat : function (path) { // TODO apenas MySQL
        return 'GROUP_CONCAT(' + path + ')';
    },

    sum : function (path) {
        return 'SUM(' + path + ')';
    },

    count : function (path) {
        return 'COUNT(' + path + ')';
    }

};

